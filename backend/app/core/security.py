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

# ==============================
# ⚙️ CONFIGURACIÓN GLOBAL
# ==============================
SECRET_KEY = os.getenv("SECRET_KEY", "superclaveultrasecreta123")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Endpoint de login EXACTO
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
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
):
    """Decodifica JWT y busca al usuario en BD"""
    
    print("🧩 TOKEN RECIBIDO:", token)

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado o token inválido",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Intenta decodificar el token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        
        print("📄 PAYLOAD DECODIFICADO:", payload)
        print("📧 EMAIL EXTRAÍDO:", email)

        if email is None:
            print("❌ Token sin campo 'sub'")
            raise credentials_exception

    except JWTError as e:
        print("❌ Error al decodificar JWT:", str(e))
        raise credentials_exception

    # Buscar usuario en BD
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        print("❌ Usuario no encontrado en la base de datos:", email)
        raise credentials_exception

    print(f"✅ Usuario autenticado: {user.email} | Rol: {user.role}")
    return user

# ==============================
# 🔒 DECORADOR PARA ROLES
# ==============================
def role_required(*roles):
    """Protege rutas según roles permitidos"""
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción"
            )
        return current_user
    return dependency

