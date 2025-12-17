from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Numeric, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class MovementType(str, enum.Enum):
    INGRESO = "INGRESO"
    EGRESO = "EGRESO"

class CashMovement(Base):
    __tablename__ = "cash_movements"

    id = Column(Integer, primary_key=True)

    type = Column(SQLEnum(MovementType), nullable=False)

    amount_usd = Column(Float, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False)
    payment_method = Column(String(50), nullable=False)
    reference = Column(String(100), nullable=True)

    payment_id = Column(Integer, ForeignKey("payments.id"))
    description = Column(String(500), nullable=False)

    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cash_register_id = Column(
        Integer,
        ForeignKey("cash_registers.id", ondelete="CASCADE"),
        nullable=False
    )
    __table_args__ = (
        Index("idx_cash_created_at", "created_at"),
        Index("idx_cash_type", "type"),
        Index("idx_cash_method", "payment_method"),
    )

    # Relaciones
    created_by = relationship("User")
    payment = relationship("Payment", back_populates="cash_movement")
    cash_register = relationship("CashRegister", back_populates="movements")
