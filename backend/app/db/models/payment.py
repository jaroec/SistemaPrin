# backend/app/db/models/payment.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    method = Column(String(50), nullable=False)
    amount_usd = Column(Float, nullable=False)
    
    # ✅ NUEVOS CAMPOS
    reference = Column(String(100), nullable=True)  # Referencia de pago
    bank = Column(String(100), nullable=True)  # Banco receptor
    exchange_rate = Column(Float, nullable=True)  # Tasa de cambio
    amount_secondary = Column(Float, nullable=True)  # Monto en moneda secundaria (Bs)
    change_usd = Column(Float, default=0.0)  # Cambio en USD
    change_secondary = Column(Float, default=0.0)  # Cambio en moneda secundaria
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación
    sale = relationship("Sale", back_populates="payments")
