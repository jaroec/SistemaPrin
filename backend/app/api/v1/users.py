from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db import models
from app.db.schemas.user import  UserOut
from app.core.security import (
    get_password_hash,
    get_current_user,
    get_db
)
from app.core.logging_config import get_logger
from app.core.security import role_required


logger = get_logger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/")
def list_users(
    db: Session = Depends(get_db),
    user = Depends(role_required("ADMIN"))
):
    return db.query(models.user.User).all()

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
