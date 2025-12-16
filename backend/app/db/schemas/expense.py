from pydantic import BaseModel, Field
from typing import Optional
from app.db.models.expense_enums import ExpenseCategory
from app.db.models.payment_enums import PaymentMethod, Currency


class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    description: str

    provider_id: Optional[int] = None

    payment_method: PaymentMethod
    currency: Currency

    amount: float = Field(..., gt=0)
    amount_usd: float = Field(..., gt=0)

    reference_number: Optional[str] = None
    bank_code: Optional[str] = None
    bank_name: Optional[str] = None
    digital_platform: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: int
    category: ExpenseCategory
    description: str
    amount: float
    amount_usd: float

    class Config:
        from_attributes = True
