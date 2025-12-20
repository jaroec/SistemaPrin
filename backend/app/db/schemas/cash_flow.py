# backend/app/db/schemas/cash_flow.py
"""
Schemas para el módulo de flujo de caja
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

# ============================
# ENUMS
# ============================

class MovementTypeEnum(str, Enum):
    INGRESO = "INGRESO"
    EGRESO = "EGRESO"

class MovementOriginEnum(str, Enum):
    VENTA = "VENTA"
    PROVEEDOR = "PROVEEDOR"
    NOMINA = "NOMINA"
    SERVICIO = "SERVICIO"
    COMPRA_MATERIA_PRIMA = "COMPRA_MATERIA_PRIMA"
    AJUSTE = "AJUSTE"
    OTRO = "OTRO"


class ExpenseCategoryEnum(str, Enum):
    NOMINA = "NOMINA"
    SERVICIOS = "SERVICIOS"  # Luz, agua, internet, etc
    PROVEEDORES = "PROVEEDORES"
    ALQUILER = "ALQUILER"
    MATERIA_PRIMA = "MATERIA_PRIMA"
    MANTENIMIENTO = "MANTENIMIENTO"
    TRANSPORTE = "TRANSPORTE"
    MARKETING = "MARKETING"
    IMPUESTOS = "IMPUESTOS"
    OTRO = "OTRO"


# ============================
# CASH MOVEMENT SCHEMAS
# ============================

class CashMovementBase(BaseModel):
    type: MovementTypeEnum
    origin: MovementOriginEnum
    amount_usd: float = Field(gt=0, description="Monto en USD")
    payment_method: str
    description: str
    category: Optional[str] = None
    notes: Optional[str] = None
    accounting_date: Optional[datetime] = None


class CashMovementCreate(CashMovementBase):
    """Para crear movimientos manuales (ajustes, etc)"""
    pass


class CashMovementOut(CashMovementBase):
    id: int
    status: str
    reference_id: Optional[str]
    reference_code: Optional[str]
    operation_date: datetime
    created_by_name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================
# EXPENSE SCHEMAS
# ============================

class ExpenseBase(BaseModel):
    category: ExpenseCategoryEnum
    subcategory: Optional[str] = None
    amount_usd: float = Field(gt=0)
    description: str
    notes: Optional[str] = None
    payment_method: str
    reference: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_rif: Optional[str] = None
    invoice_number: Optional[str] = None
    is_recurring: bool = False
    recurrence_day: Optional[int] = Field(None, ge=1, le=31)


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseOut(ExpenseBase):
    id: int
    code: str
    created_by_name: str
    created_at: datetime
    approved_by_user_id: Optional[int]
    approved_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============================
# REPORTES
# ============================

class CashFlowSummary(BaseModel):
    """Resumen de flujo de caja"""
    period_start: date
    period_end: date
    total_ingresos: float
    total_egresos: float
    saldo_neto: float
    
    # Por método de pago
    ingresos_efectivo: float
    ingresos_transferencia: float
    ingresos_pago_movil: float
    ingresos_divisas: float
    ingresos_credito: float
    
    egresos_efectivo: float
    egresos_transferencia: float
    egresos_otros: float
    
    # Conteo
    count_ingresos: int
    count_egresos: int

class ExpensesByCategoryReport(BaseModel):
    """Egresos agrupados por categoría"""
    category: str
    total_amount: float
    count: int
    percentage: float


class DailyCashFlow(BaseModel):
    """Flujo de caja diario"""
    date: date
    ingresos: float
    egresos: float
    saldo: float