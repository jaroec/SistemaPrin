# backend/app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from jose import jwt, JWTError
from jose import jwt as jose_jwt
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

# Registro de usuario
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


# Login
@router.post("/token", response_model=Token, summary="Iniciar sesión y obtener un token JWT")
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Endpoint de autenticación OAuth2.
    - username: debe ser el email del usuario
    - password: contraseña del usuario
    """
    # Buscar usuario por email
    user = db.query(models.user.User).filter(models.user.User.email == form_data.username).first()

    # Validaciones de existencia y contraseña
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

    # Crear token de acceso
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )

    # Registrar log de acceso
    print(f"🔐 Usuario '{user.email}' inició sesión con rol {user.role}")
    print(f"🎫 Token generado (primeros 50 chars): {access_token[:50]}...")

    return {"access_token": access_token, "token_type": "bearer"}


# ✅ ENDPOINT /me CORREGIDO - SIMPLICADO
@router.get("/me", response_model=UserOut, summary="Obtener perfil del usuario autenticado")
def read_users_me(current_user: models.user.User = Depends(get_current_user)):
    """
    Obtiene el perfil del usuario autenticado.
    Requiere token JWT en el header Authorization: Bearer <token>
    """
    print(f"✅ Endpoint /me accedido por: {current_user.email}")
    return current_user

@router.post("/logout", status_code=status.HTTP_200_OK, summary="Cerrar sesión (revocar token)")
def logout(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),  # obliga que el token sea válido para revocar
):
    """
    Revoca el token JWT actual (se debe enviar Authorization: Bearer <token>).
    Guarda el token en la tabla revoked_tokens con la fecha de expiración.
    """
    if not authorization:
        raise HTTPException(status_code=400, detail="Se requiere cabecera Authorization")

    token = authorization.split(" ")[1] if " " in authorization else authorization

    # Intentar decodificar para obtener exp
    try:
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp_ts = payload.get("exp")
        expires_at = datetime.utcfromtimestamp(exp_ts) if exp_ts else None
    except Exception:
        expires_at = None

    # Guardar en tabla revoked_tokens
    try:
        from app.db.models.revoked_token import RevokedToken
        revoked = RevokedToken(token=token, expires_at=expires_at)
        db.add(revoked)
        db.commit()
    except Exception as e:
        # Si la tabla no existe, fallamos con un mensaje claro
        raise HTTPException(status_code=500, detail=f"Error al revocar token: {str(e)}")

    return {"detail": "Logout exitoso - token revocado"}


@router.post("/verify-token")
def verify_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Endpoint para verificar si un token es válido"""
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
