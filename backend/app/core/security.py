from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Esta URL debe coincidir exactamente con tu endpoint de login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


# ==============================
# 🔑 FUNCIONES DE SEGURIDAD
# ==============================
def get_password_hash(password: str) -> str:
    """Devuelve el hash seguro de una contraseña"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña coincide con su hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Genera un token JWT con expiración"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ==============================
# 🧩 DEPENDENCIAS DE BASE DE DATOS
# ==============================
def get_db():
    """Obtiene la sesión de base de datos"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==============================
# 👤 USUARIO AUTENTICADO ACTUAL
# ==============================
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Decodifica el token y obtiene el usuario actual"""
    print("🧩 TOKEN RECIBIDO:", token)
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado o token inválido",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # 📥 Verificar token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            print("❌ Token sin campo 'sub'")
            raise credentials_exception

    except JWTError as e:
        print("❌ Error al decodificar JWT:", e)
        raise credentials_exception

    # 📤 Buscar usuario en la base de datos
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        print("❌ Usuario no encontrado en la base de datos:", email)
        raise credentials_exception

    print(f"✅ Usuario autenticado: {user.email} | Rol: {user.role}")
    return user


# ==============================
# 🔒 DECORADOR POR ROL
# ==============================
def role_required(*roles):
    """Protege una ruta según los roles permitidos"""
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción"
            )
        return current_user
    return dependency