# backend/app/core/security.py
from datetime import datetime, timedelta
from jose import jwt, JWTError
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.models.user import User
from app.db.base import SessionLocal
import os
import logging
from app.db import models

logger = logging.getLogger(__name__)

# ==============================
# ⚙️ CONFIGURACIÓN GLOBAL
# ==============================
SECRET_KEY = os.getenv("SECRET_KEY", "superclaveultrasecreta123")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# ✅ CORRECCIÓN: Ruta completa al endpoint de login
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",  # ← CAMBIO AQUÍ
    auto_error=True
)

# ==============================
# 🔑 FUNCIONES DE CONTRASEÑA (bcrypt)
# ==============================
def get_password_hash(password: str) -> str:
    """Hashea contraseña usando bcrypt compatible con Python 3.12"""
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña coincide"""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# ==============================
# 🔐 GENERACIÓN DE JWT
# ==============================
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Genera un token JWT con expiración"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ==============================
# 🧩 DEPENDENCIA DE BASE DE DATOS
# ==============================
def get_db():
    """Obtiene sesión de BD"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==============================
# 👤 USUARIO ACTUAL DESDE TOKEN
# ==============================
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado o token inválido",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if not email:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(
        User.email == email,
        User.is_active == True
    ).first()

    if not user:
        raise credentials_exception

    # -----------------------
    # REVOCACIÓN DE TOKEN
    # -----------------------
    try:
        from app.db.models.revoked_token import RevokedToken
        revoked = db.query(RevokedToken).filter(
            RevokedToken.token == token
        ).first()
        if revoked:
            raise credentials_exception
    except Exception:
        # Si la tabla no existe aún, no rompemos la app
        pass

    return user

# ==============================
# 🔒 DECORADOR PARA ROLES
# ==============================
def role_required(*allowed_roles: str):
    def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        user_role = (
            current_user.role.value
            if hasattr(current_user.role, "value")
            else current_user.role
        )

        if user_role.upper() not in [r.upper() for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No autorizado"
            )
        return current_user

    return role_checker


def authenticate_user(
    db: Session,
    email: str,
    password: str
):
    """
    Autentica un usuario por email y password.
    Retorna el usuario si es válido, o None.
    """

    user = db.query(models.user.User).filter(
        models.user.User.email == email
    ).first()

    if not user:
        logger.warning(f"⚠️ Usuario no encontrado: {email}")
        return None

    if not user.is_active:
        logger.warning(f"⚠️ Usuario inactivo: {email}")
        return None

    if not verify_password(password, user.password_hash):
        logger.warning(f"⚠️ Password inválido: {email}")
        return None

    return user
