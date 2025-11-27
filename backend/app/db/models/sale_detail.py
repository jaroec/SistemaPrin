from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from pydantic import BaseModel, Field, PositiveInt, PositiveFloat
from datetime import datetime
from typing import List, Optional
from app.db.base import Base
from sqlalchemy.orm import relationship

# 🧾 Detalle de producto dentro de una venta
class SaleItemCreate(BaseModel):
    product_id: int = Field(..., description="ID del producto vendido")
    quantity: PositiveInt = Field(..., description="Cantidad vendida del producto")
    price_usd: PositiveFloat = Field(..., description="Precio unitario en USD")
    subtotal_usd: PositiveFloat = Field(..., description="Subtotal de la línea de producto")


class SaleItemOut(SaleItemCreate):
    id: int
    product_name: Optional[str] = Field(None, description="Nombre del producto")
    class Config:
        from_attributes = True

from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class SaleDetail(Base):
    __tablename__ = "sale_details"

    id = Column(Integer, primary_key=True, index=True)
    pos_id = Column(Integer, ForeignKey("pos.id", ondelete="CASCADE"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, nullable=False)
    price_usd = Column(Float, nullable=False)
    subtotal_usd = Column(Float, nullable=False)

    pos = relationship("POS", back_populates="details")
    product = relationship("Product")


# 🧮 Detalle completo de una venta (para respuesta)
class SaleDetailOut(BaseModel):
    id: int
    pos_id: int
    product_id: int
    quantity: int
    price_usd: float
    subtotal_usd: float
    product_name: Optional[str] = None

    class Config:
        from_attributes = True


# 💳 Registro de pago
class PaymentCreate(BaseModel):
    method: str = Field(
        ...,
        example="efectivo",
        description="Método de pago: efectivo, pago_movil, transferencia, divisas, mixto o crédito"
    )
    amount_usd: PositiveFloat = Field(..., example=10.0)
    reference: Optional[str] = Field(None, example="Ref123456")
    paid_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


# 🧾 Crear venta tipo POS
class SaleCreate(BaseModel):
    client_id: Optional[int] = Field(None, description="ID del cliente asociado (si aplica)")
    client_name: Optional[str] = Field(None, example="Juan Pérez")
    client_phone: Optional[str] = Field(None, example="+58 424-1234567")
    items: List[SaleItemCreate] = Field(..., description="Lista de productos vendidos")
    payments: List[PaymentCreate] = Field(..., description="Lista de métodos de pago utilizados")
    discount_usd: Optional[float] = Field(0.0, description="Descuento aplicado a la venta")
    note: Optional[str] = Field(None, example="Venta realizada en caja principal")


# 📦 Respuesta al registrar o consultar una venta
class SaleOut(BaseModel):
    id: int
    code: str
    client_id: Optional[int]
    client_name: Optional[str]
    subtotal_usd: float
    total_usd: float
    paid_usd: float
    pending_usd: float
    status: str
    date: datetime
    items: List[SaleDetailOut]

    class Config:
        from_attributes = True
