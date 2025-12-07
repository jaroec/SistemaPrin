# backend/app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from jose import jwt, JWTError
from jose import jwt as jose_jwt

from typing import List

from app.db import models
from app.db.schemas.user import UserCreate, UserOut, Token
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_db,
    SECRET_KEY,
    ALGORITHM
)

router = APIRouter()

# =============================
#  REGISTRO DE USUARIO
# =============================
@router.post("/register", response_model=UserOut)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.user.User).filter(models.user.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    user = models.user.User(
        email=payload.email,
        name=payload.name,
        password_hash=get_password_hash(payload.password),
        role=payload.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# =============================
#  LOGIN / TOKEN
# =============================
@router.post("/token", response_model=Token, summary="Iniciar sesión y obtener un token JWT")
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.user.User).filter(models.user.User.email == form_data.username).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario no existe."
        )

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta está desactivada. Contacte al administrador."
        )

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )

    print(f"🔐 Usuario '{user.email}' inició sesión con rol {user.role}")
    print(f"🎫 Token generado (primeros 50 chars): {access_token[:50]}...")

    return {"access_token": access_token, "token_type": "bearer"}


# =============================
#  PERFIL /ME
# =============================
@router.get("/me", response_model=UserOut, summary="Obtener perfil del usuario autenticado")
def read_users_me(current_user: models.user.User = Depends(get_current_user)):
    print(f"✅ Endpoint /me accedido por: {current_user.email}")
    return current_user


# =============================
#  LOGOUT
# =============================
@router.post("/logout", status_code=status.HTTP_200_OK, summary="Cerrar sesión (revocar token)")
def logout(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if not authorization:
        raise HTTPException(status_code=400, detail="Se requiere cabecera Authorization")

    token = authorization.split(" ")[1] if " " in authorization else authorization

    try:
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp_ts = payload.get("exp")
        expires_at = datetime.utcfromtimestamp(exp_ts) if exp_ts else None
    except Exception:
        expires_at = None

    try:
        from app.db.models.revoked_token import RevokedToken
        revoked = RevokedToken(token=token, expires_at=expires_at)
        db.add(revoked)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al revocar token: {str(e)}")

    return {"detail": "Logout exitoso - token revocado"}


# =============================
#  VERIFICAR TOKEN
# =============================
@router.post("/verify-token")
def verify_token(
    token: str,
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")

        if not email:
            return {"valid": False, "error": "No email in token"}

        user = db.query(models.user.User).filter(models.user.User.email == email).first()
        if not user:
            return {"valid": False, "error": "User not found"}

        return {
            "valid": True,
            "user": {
                "email": user.email,
                "role": user.role,
                "name": user.name
            }
        }

    except JWTError as e:
        return {"valid": False, "error": str(e)}


# =============================================================
#      🔥 🔥 NUEVOS ENDPOINTS SOLO ADMIN 🔥 🔥
# =============================================================

# LISTAR TODOS LOS USUARIOS
@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Solo administradores pueden ver usuarios")

    users = db.query(models.user.User).all()
    return users


# ELIMINAR USUARIO
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar usuarios")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")

    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    db.delete(user)
    db.commit()

    return {"detail": "Usuario eliminado exitosamente"}


# CAMBIAR CONTRASEÑA DE USUARIO
@router.put("/users/{user_id}/password")
def update_user_password(
    user_id: int,
    password_data: dict,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Solo administradores pueden cambiar contraseñas")

    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    new_password = password_data.get("password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    user.password_hash = get_password_hash(new_password)
    db.commit()

    return {"detail": "Contraseña actualizada exitosamente"}
