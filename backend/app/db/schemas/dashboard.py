from pydantic import BaseModel
from datetime import date
from typing import List


class CashStatus(BaseModel):
    total_ingresos: float
    total_egresos: float
    saldo_actual: float


class PaymentMethodSummary(BaseModel):
    method: str
    total: float


class DailyEvolution(BaseModel):
    date: date
    ingresos: float
    egresos: float
    saldo: float


class FinancialDashboard(BaseModel):
    cash_status: CashStatus
    by_payment_method: List[PaymentMethodSummary]
    daily_evolution: List[DailyEvolution]
    alert: str | None
