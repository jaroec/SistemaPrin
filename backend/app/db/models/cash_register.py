from sqlalchemy import Column, Integer, DateTime, String, Numeric, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base import Base


class CashRegisterStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class CashRegister(Base):
    __tablename__ = "cash_registers"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(Enum(CashRegisterStatus), default=CashRegisterStatus.OPEN)

    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    opening_amount = Column(Numeric(12, 2), nullable=False)
    closing_amount = Column(Numeric(12, 2))

    expected_amount_usd = Column(Numeric(12, 2))
    system_amount = Column(Numeric(12, 2))
    difference = Column(Numeric(12, 2))

    opened_by_user_id = Column(Integer, ForeignKey("users.id"))
    closed_by_user_id = Column(Integer, ForeignKey("users.id"))

    notes = Column(String)

    movements = relationship("CashMovement", back_populates="cash_register")
