from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.db.base import get_db
from app.db.schemas.movement import MovementOut
from app.crud.movement import get_movements
from app.core.security import get_current_user
from app.db.models.movement import MovementType
from app.db.models.user import User

router = APIRouter()


@router.get(
    "/",
    response_model=List[MovementOut],
    summary="Obtener movimientos del sistema",
)
def list_movements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),

    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),

    type: Optional[MovementType] = Query(None),
    user_id: Optional[int] = Query(None),
    branch_id: Optional[int] = Query(None),

    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    """
    Registro unificado de movimientos del sistema.
    - Respeta sucursal del usuario
    - Filtros opcionales por tipo, usuario y fechas
    """

    # 🔒 Seguridad por sucursal
    effective_branch_id = (
        branch_id if current_user.is_admin else current_user.branch_id
    )

    return get_movements(
        db=db,
        skip=skip,
        limit=limit,
        movement_type=type,
        user_id=user_id,
        branch_id=effective_branch_id,
        date_from=date_from,
        date_to=date_to,
    )
