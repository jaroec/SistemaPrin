# backend/app/db/models/product.py
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # Código interno
    name = Column(String(120), nullable=False)
    description = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True)
    supplier = Column(String(120), nullable=True)
    cost_price = Column(Float, nullable=False)        # Precio de costo
    sale_price = Column(Float, nullable=False)        # Precio de venta
    profit_margin = Column(Float, nullable=False)     # Margen de ganancia (% o valor)
    stock = Column(Integer, default=0)                # Existencia actual
    min_stock = Column(Integer, default=5)            # Nivel mínimo de alerta
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
