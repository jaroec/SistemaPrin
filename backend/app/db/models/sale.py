# backend/app/db/models/sale.py
from sqlalchemy import Column, Integer,Enum, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum 

class SaleStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    PAID = "PAID"
    CREDIT = "CREDIT"
    CANCELLED = "CANCELLED"

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    subtotal_usd = Column(Float, default=0.0, nullable=False)
    discount_usd = Column(Float, default=0.0)
    total_usd = Column(Float, default=0.0, nullable=False)
    paid_usd = Column(Float, default=0.0, nullable=False)
    balance_usd = Column(Float, default=0.0, nullable=False)
    total_paid_usd = Column(Float, default=0)
    balance_due_usd = Column(Float, default=0)
    status = Column(String(50), default="PENDIENTE")
    payment_method = Column(String(50), nullable=False)
    status = Column(Enum(SaleStatus), default=SaleStatus.DRAFT)    
    note = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relaciones
    client = relationship("Client", backref="sales")
    seller = relationship("User", backref="sales")
    details = relationship("SaleDetail", back_populates="sale", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="sale", cascade="all, delete-orphan")
