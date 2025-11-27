# backend/app/db/models/pos.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class POS(Base):
    __tablename__ = "pos"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    subtotal_usd = Column(Float, default=0.0)
    total_usd = Column(Float, default=0.0)
    paid_usd = Column(Float, default=0.0)
    pending_usd = Column(Float, default=0.0)
    discount_usd = Column(Float, default=0.0)
    status = Column(String(20), default="PENDIENTE")
    note = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    client = relationship("Client", back_populates="pos")
    details = relationship("SaleDetail", back_populates="pos", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="pos", cascade="all, delete-orphan")
