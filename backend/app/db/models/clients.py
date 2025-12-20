# backend/app/db/models/client.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from app.db.base import Base

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    document = Column(String(64), nullable=True, unique=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(64), nullable=True)
    address = Column(String(255), nullable=True)
    credit_limit = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
