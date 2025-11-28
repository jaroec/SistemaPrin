# backend/app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db import models
from app.db.schemas.user import UserCreate, UserOut, Token
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_db,
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

    return {"access_token": access_token, "token_type": "bearer"}


# Perfil - CORREGIDO: Usa la dependencia directamente
@router.get("/me", response_model=UserOut, summary="Obtener perfil del usuario autenticado")
def read_users_me(current_user: models.user.User = Depends(get_current_user)):
    """
    Obtiene el perfil del usuario autenticado.
    El token se valida automáticamente a través de la dependencia get_current_user.
    """
    return current_user
    
