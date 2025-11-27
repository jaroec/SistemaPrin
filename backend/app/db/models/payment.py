from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    pos_id = Column(Integer, ForeignKey("pos.id", ondelete="CASCADE"))
    method = Column(String(50), nullable=False)
    amount_usd = Column(Float, nullable=False)
    reference = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación
    pos = relationship("POS", back_populates="payments")