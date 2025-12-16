from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.models.payment_enums import PaymentMethod, Currency


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    # Relación con venta
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=True)

    # Tipo de pago
    method = Column(SQLEnum(PaymentMethod), nullable=False)

    # Moneda
    currency = Column(SQLEnum(Currency), nullable=False)

    # Montos
    amount = Column(Float, nullable=False)
    amount_usd = Column(Float, nullable=False)

    # Datos bancarios / referencia
    reference_number = Column(String(100), nullable=True)
    bank_code = Column(String(10), nullable=True)
    bank_name = Column(String(100), nullable=True)

    # Plataformas digitales (Zelle, Binance, etc.)
    digital_platform = Column(String(100), nullable=True)

    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    sale = relationship("Sale", back_populates="payments")
    cash_movement = relationship("CashMovement", uselist=False, back_populates="payment")
