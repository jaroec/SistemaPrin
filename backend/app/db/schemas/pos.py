# backend/app/db/schemas/pos.py
from pydantic import BaseModel, Field, PositiveFloat, PositiveInt
from datetime import datetime
from typing import List, Optional
from enum import Enum
from app.db.models.payment_enums import PaymentMethod
from app.db.schemas.payment import PaymentCreate


# ============================
# ENUMS
# ============================

class SaleStatusEnum(str, Enum):
    PENDIENTE = "PENDIENTE"
    PAGADO = "PAGADO"
    CREDITO = "CREDITO"
    ANULADO = "ANULADO"


# ============================
# ITEMS DE VENTA
# ============================

class SaleItemCreate(BaseModel):
    """Item de producto para crear venta"""
    product_id: int
    quantity: PositiveInt
    price_usd: PositiveFloat


class SaleDetailOut(BaseModel):
    """Detalle de item en respuesta"""
    id: int
    product_id: int
    product_name: str
    quantity: int
    price_usd: float
    subtotal_usd: float

    class Config:
        from_attributes = True


# ============================
# PAGOS
# ============================

class PaymentOut(BaseModel):
    """Pago en respuesta"""
    id: int
    method: str
    amount_usd: float
    reference: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================
# VENTAS
# ============================

class SaleCreate(BaseModel):
    """Crear nueva venta"""
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    seller_id: int
    payment_method: PaymentMethod
    items: List[SaleItemCreate]
    payments: List[PaymentCreate] = Field(default_factory=list)

    cash_amount_bs: Optional[float] = 0.0
    transfer_amount_bs: Optional[float] = 0.0
    transfer_reference: Optional[str] = None
    transfer_bank_code: Optional[str] = None

    discount_usd: float = 0.0
    discount_bs: float = 0.0

class SaleOut(BaseModel):
    """Venta completa en respuesta"""
    id: int
    code: str
    client_id: Optional[int]
    client_name: Optional[str]
    client_phone: Optional[str] = None  # ✅ AHORA ES OPCIONAL
    seller_id: int
    subtotal_usd: float
    total_usd: float
    paid_usd: float
    balance_usd: float
    payment_method: PaymentMethod
    status: str
    created_at: datetime
    details: List[SaleDetailOut]
    payments: List[PaymentOut]

    class Config:
        from_attributes = True


# ============================
# BÚSQUEDA Y FILTROS
# ============================

class SaleFilter(BaseModel):
    """Filtros avanzados para búsqueda"""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[SaleStatusEnum] = None
    client_id: Optional[int] = None
    seller_id: Optional[int] = None
    payment_method: Optional[PaymentMethod] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None