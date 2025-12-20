from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.models.expense_enums import ExpenseCategory
from app.db.models.payment_enums import PaymentMethod, Currency


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)

    category = Column(SQLEnum(ExpenseCategory), nullable=False)

    description = Column(String(500), nullable=False)

    # Relación opcional con proveedor
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=True)

    # Método de pago
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    currency = Column(SQLEnum(Currency), nullable=False)

    amount = Column(Float, nullable=False)
    amount_usd = Column(Float, nullable=False)

    reference_number = Column(String(100), nullable=True)
    bank_code = Column(String(10), nullable=True)
    bank_name = Column(String(100), nullable=True)
    digital_platform = Column(String(100), nullable=True)

    # Auditoría
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    provider = relationship("Provider")
