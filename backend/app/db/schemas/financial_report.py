from pydantic import BaseModel
from typing import List, Optional


class MethodSummary(BaseModel):
    method: str
    total_usd: float


class CashFlowReport(BaseModel):
    period: str

    total_income_usd: float
    total_expense_usd: float
    net_balance_usd: float

    income_by_method: List[MethodSummary]
    expense_by_category: List[MethodSummary]
