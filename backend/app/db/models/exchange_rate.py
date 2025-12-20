# backend/app/db/models/exchange_rate.py
from sqlalchemy import Column, Integer, Float, String, DateTime, Date
from sqlalchemy.sql import func
from app.db.base import Base


class ExchangeRate(Base):
    """
    Modelo para almacenar la tasa de cambio diaria USD -> VES
    Solo se permite una tasa por día
    """
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    rate = Column(Float, nullable=False)  # Tasa USD -> VES
    currency = Column(String(10), default="VES", nullable=False)
    date = Column(Date, unique=True, nullable=False, index=True)  # Fecha de la tasa
    set_by_user_id = Column(Integer, nullable=False)  # Usuario que configuró la tasa
    set_by_name = Column(String(255), nullable=False)  # Nombre del usuario
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())