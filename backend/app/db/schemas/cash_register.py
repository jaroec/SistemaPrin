# app/schemas/cash_register.py
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from typing import Optional

class CashRegisterBase(BaseModel):
    opening_amount_usd: float

class CashRegisterOpen(BaseModel):
    opening_balance: Decimal = Field(..., ge=0)

class CashRegisterCreate(CashRegisterBase):
    pass

class CashRegisterClose(BaseModel):
    counted_amount: Decimal
    notes: Optional[str] = None


class CashRegisterResponse(BaseModel):
    id: int
    opening_amount: Decimal
    closing_amount: Optional[Decimal]
    system_amount: Optional[Decimal]
    difference: Optional[Decimal]
    opening_balance: Decimal
    closing_balance: Optional[Decimal]
    status: str
    opened_by: int
    closed_by: Optional[int]

    class Config:
        from_attributes = True

class CashRegisterOut(BaseModel):
    id: int
    opening_amount_usd: float
    closing_amount_usd: Optional[float]
    status: str

    opened_by_user_id: int
    closed_by_user_id: Optional[int]

    opened_at: datetime
    closed_at: Optional[datetime]

    expected_amount_usd: Optional[float]
    difference_usd: Optional[float]

    class Config:
        from_attributes = True
