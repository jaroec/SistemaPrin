from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID
from datetime import datetime


class MovementBase(BaseModel):
    type: str
    action: str
    entity: str
    entity_id: Optional[UUID]
    description: str
    quantity: Optional[float]
    amount: Optional[float]
    before: Optional[Any]
    after: Optional[Any]


class MovementCreate(MovementBase):
    user_id: UUID
    branch_id: UUID


class MovementOut(MovementBase):
    id: UUID
    user_id: UUID
    branch_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
