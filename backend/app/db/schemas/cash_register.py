from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from typing import Optional


class CashRegisterOpen(BaseModel):
    opening_amount: Decimal = Field(..., ge=0)
    expected_amount_usd: Optional[Decimal] = None
    notes: Optional[str] = None


class CashRegisterClose(BaseModel):
    counted_amount: Decimal = Field(..., ge=0)
    notes: Optional[str] = None


class CashRegisterOut(BaseModel):
    id: int

    opening_amount: Decimal
    closing_amount: Optional[Decimal]
    system_amount: Optional[Decimal]
    difference: Optional[Decimal]

    expected_amount_usd: Optional[Decimal]
    notes: Optional[str]

    status: str

    opened_by_user_id: int
    closed_by_user_id: Optional[int]

    opened_at: datetime
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True


class CashRegisterResponse(BaseModel):
    id: int
    opening_amount: Decimal
    closing_amount: Optional[Decimal]
    system_amount: Optional[Decimal]
    difference: Optional[Decimal]
    status: str
    opened_by_user_id: int
    closed_by_user_id: Optional[int]

    class Config:
        from_attributes = True
