from sqlalchemy import Integer, Column, Text, String, Enum, DateTime, Numeric, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
import enum
from sqlalchemy.orm import relationship

from app.db.base import Base

class MovementType(str, enum.Enum):
    SALE = "SALE"
    EXPENSE = "EXPENSE"
    STOCK_IN = "STOCK_IN"
    STOCK_OUT = "STOCK_OUT"
    PRICE_CHANGE = "PRICE_CHANGE"
    MARGIN_CHANGE = "MARGIN_CHANGE"

class Movement(Base):
    __tablename__ = "movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    type = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    entity = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    reference = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    amount_usd = Column(Numeric(12, 2), nullable=True)
    quantity = Column(Numeric(12, 2), nullable=True)
    amount = Column(Numeric(12, 2), nullable=True)

    before = Column(JSONB, nullable=True)
    after = Column(JSONB, nullable=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    branch_id = Column(UUID(as_uuid=True), nullable=True)  # ✅ SIN FK

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="movements")