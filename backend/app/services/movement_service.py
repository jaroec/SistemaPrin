from sqlalchemy.orm import Session
from typing import Optional, Any
from uuid import UUID
from decimal import Decimal
from app.db.schemas.movement import MovementCreate
from app.crud.movement import create_movement
from app.db.models.movement import  Movement, MovementType
from app.db.models.user import User

def log_movement(
    db: Session,
    *,
    type: str,
    action: str,
    entity: str,
    description: str,
    user_id: UUID,
    branch_id: UUID,
    entity_id: Optional[UUID] = None,
    quantity: Optional[float] = None,
    amount: Optional[float] = None,
    before: Optional[Any] = None,
    after: Optional[Any] = None,
):
    data = MovementCreate(
        type=type,
        action=action,
        entity=entity,
        entity_id=entity_id,
        description=description,
        quantity=quantity,
        amount=amount,
        before=before,
        after=after,
        user_id=user_id,
        branch_id=branch_id,
    )

    return create_movement(db=db, data=data)


def create_movement(
    db: Session,
    *,
    movement_type: MovementType,
    reference: str,
    description: str,
    branch_id: int,
    user: User | None = None,
    amount_usd: Decimal | None = None,
):
    movement = Movement(
        type=movement_type,
        reference=reference,
        description=description,
        amount_usd=amount_usd,
        user_id=user.id if user else None,
        branch_id=branch_id,
    )

    db.add(movement)
    db.commit()
    db.refresh(movement)

    return movement
