from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    document = Column(String(64), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(64), nullable=True)
    address = Column(String(255), nullable=True)
    credit_limit = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación con POS
    pos = relationship("POS", back_populates="client", cascade="all, delete-orphan")
