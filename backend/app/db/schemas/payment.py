from pydantic import BaseModel, Field
from typing import Optional, List
from app.db.models.payment_enums import PaymentMethod, Currency


class PaymentCreate(BaseModel):
    method: PaymentMethod
    currency: Currency

    amount: float = Field(..., gt=0)
    amount_usd: float = Field(..., gt=0)

    reference_number: Optional[str] = None
    bank_code: Optional[str] = None
    bank_name: Optional[str] = None

    digital_platform: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    method: PaymentMethod
    currency: Currency
    amount: float
    amount_usd: float

    reference_number: Optional[str]
    bank_code: Optional[str]
    bank_name: Optional[str]
    digital_platform: Optional[str]

    class Config:
        from_attributes = True
