from sqlalchemy.orm import Session
from typing import Optional
from app.db.models.movement import Movement, MovementType
from app.db.schemas.movement import MovementCreate
from datetime import datetime


def create_movement(db: Session, data: MovementCreate) -> Movement:
    movement = Movement(**data.model_dump())
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


def get_movements(
    db: Session,
    skip: int,
    limit: int,
    movement_type: MovementType | None,
    user_id: int | None,
    branch_id: int,
    date_from: datetime | None,
    date_to: datetime | None,
):

    query = db.query(Movement)

    if type:
        query = query.filter(Movement.type == type)
    if user_id:
        query = query.filter(Movement.user_id == user_id)
    if branch_id:
        query = query.filter(Movement.branch_id == branch_id)

    return query.order_by(Movement.created_at.desc()).offset(skip).limit(limit).all()
