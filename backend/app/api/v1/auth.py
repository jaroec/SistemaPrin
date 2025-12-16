from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from jose import jwt, JWTError
from typing import List
import logging

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
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter()


# =============================
# REGISTRO DE USUARIO
# =============================
@router.post("/register", response_model=UserOut)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    """Registra un nuevo usuario"""
    
    # Validar que el email no esté registrado
    existing = db.query(models.user.User).filter(
        models.user.User.email == payload.email
    ).first()
    
    if existing:
        logger.warning(f"❌ Intento de registro con email duplicado: {payload.email}")
        raise HTTPException(
            status_code=400,
            detail="El correo ya está registrado"
        )
    
    # Validar contraseña
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="La contraseña debe tener mínimo 6 caracteres"
        )
    
    # Crear usuario
    user = models.user.User(
        email=payload.email,
        name=payload.name,
        password_hash=get_password_hash(payload.password),
        role=payload.role
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info(f"✅ Usuario registrado: {user.email} (Rol: {user.role})")
    
    return user


# =============================
# LOGIN / TOKEN
# =============================
@router.post("/token", response_model=Token, summary="Iniciar sesión")
def login_user(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Genera JWT para autenticación"""
    
    email = form_data.username
    password = form_data.password
    ip_address = request.client.host
    
    # Buscar usuario
    user = db.query(models.user.User).filter(
        models.user.User.email == email
    ).first()
    
    if not user:
        logger.warning(f"⚠️ Login fallido - Usuario no existe: {email} (IP: {ip_address})")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario o contraseña incorrectos"
        )
    
    # Verificar contraseña
    if not verify_password(password, user.password_hash):
        logger.warning(f"⚠️ Login fallido - Contraseña incorrecta: {email} (IP: {ip_address})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
    
    # Verificar que la cuenta esté activa
    if not user.is_active:
        logger.warning(f"⚠️ Login fallido - Cuenta desactivada: {email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta está desactivada. Contacte al administrador."
        )
    
    # Generar token
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )
    
    logger.info(f"✅ Login exitoso: {email} (Rol: {user.role}, IP: {ip_address})")
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# =============================
# PERFIL
# =============================
@router.get("/me", response_model=UserOut, summary="Obtener perfil actual")
def read_users_me(current_user: models.user.User = Depends(get_current_user)):
    """Retorna datos del usuario autenticado"""
    logger.debug(f"📋 Perfil accedido por: {current_user.email}")
    return current_user


# =============================
# LOGOUT
# =============================
@router.post("/logout", status_code=status.HTTP_200_OK, summary="Cerrar sesión")
def logout(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Revoca el token actual"""
    
    if not authorization:
        raise HTTPException(
            status_code=400,
            detail="Se requiere cabecera Authorization"
        )
    
    token = authorization.split(" ")[1] if " " in authorization else authorization
    
    # Extraer tiempo de expiración
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp_ts = payload.get("exp")
        expires_at = datetime.utcfromtimestamp(exp_ts) if exp_ts else None
    except Exception:
        expires_at = None
    
    # Registrar token revocado
    try:
        from app.db.models.revoked_token import RevokedToken
        revoked = RevokedToken(token=token, expires_at=expires_at)
        db.add(revoked)
        db.commit()
        
        logger.info(f"✅ Token revocado para: {current_user.email}")
        
    except Exception as e:
        logger.error(f"❌ Error al revocar token: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al revocar token: {str(e)}"
        )
    
    return {"detail": "Logout exitoso"}


# =============================
# VERIFICAR TOKEN
# =============================
@router.post("/verify-token")
def verify_token(token: str, db: Session = Depends(get_db)):
    """Verifica si un token es válido"""
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        
        if not email:
            return {"valid": False, "error": "Token sin email"}
        
        user = db.query(models.user.User).filter(
            models.user.User.email == email
        ).first()
        
        if not user:
            return {"valid": False, "error": "Usuario no encontrado"}
        
        # Verificar si está revocado
        from app.db.models.revoked_token import RevokedToken
        revoked = db.query(RevokedToken).filter(
            RevokedToken.token == token
        ).first()
        
        if revoked:
            return {"valid": False, "error": "Token revocado"}
        
        return {
            "valid": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "name": user.name
            }
        }
        
    except JWTError as e:
        logger.warning(f"⚠️ Token inválido: {str(e)}")
        return {"valid": False, "error": str(e)}


# =============================
# ADMIN: LISTAR USUARIOS
# =============================
@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    """ADMIN ONLY - Lista todos los usuarios"""
    
    if current_user.role != "ADMIN":
        logger.warning(f"⛔ Acceso denegado a {current_user.email} - No es ADMIN")
        raise HTTPException(
            status_code=403,
            detail="Solo administradores pueden ver usuarios"
        )
    
    users = db.query(models.user.User).all()
    logger.info(f"📋 Listado de usuarios solicitado por {current_user.email}")
    
    return users


# =============================
# ADMIN: ELIMINAR USUARIO
# =============================
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    """ADMIN ONLY - Elimina un usuario"""
    
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    if user_id == current_user.id:
        logger.warning(f"⛔ {current_user.email} intentó auto-eliminarse")
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminar tu propia cuenta"
        )
    
    user = db.query(models.user.User).filter(
        models.user.User.id == user_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(user)
    db.commit()
    
    logger.warning(f"🗑️ Usuario eliminado: {user.email} por {current_user.email}")
    
    return {"detail": "Usuario eliminado"}


# =============================
# ADMIN: CAMBIAR CONTRASEÑA
# =============================
@router.put("/users/{user_id}/password")
def update_user_password(
    user_id: int,
    password_data: dict,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    """ADMIN ONLY - Cambia contraseña de usuario"""
    
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    user = db.query(models.user.User).filter(
        models.user.User.id == user_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    new_password = password_data.get("password")
    
    if not new_password or len(new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Contraseña debe tener mínimo 6 caracteres"
        )
    
    user.password_hash = get_password_hash(new_password)
    db.commit()
    
    logger.info(f"🔑 Contraseña actualizada para {user.email} por {current_user.email}")
    
    return {"detail": "Contraseña actualizada"}
