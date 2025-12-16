from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date

from app.db.base import get_db
from app.core.security import role_required
from app.db.schemas.dashboard import (
    FinancialDashboard,
    CashStatus,
    PaymentMethodSummary,
    DailyEvolution
)
from app.services.dashboard_service import (
    get_cash_status,
    get_by_payment_method,
    get_daily_evolution
)

router = APIRouter(prefix="/dashboard/financial")


@router.get("", response_model=FinancialDashboard)
def financial_dashboard(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "CAJERO"))
):
    ingresos, egresos = get_cash_status(db)
    saldo = ingresos - egresos

    today = date.today()
    start = today.replace(day=1)

    by_method = get_by_payment_method(db, start, today)
    evolution = get_daily_evolution(db, days)

    alert = None
    if saldo < 0:
        alert = "⚠️ Caja en negativo. Revisar egresos."

    return {
        "cash_status": {
            "total_ingresos": round(ingresos, 2),
            "total_egresos": round(egresos, 2),
            "saldo_actual": round(saldo, 2)
        },
        "by_payment_method": [
            {"method": m, "total": round(t or 0, 2)} for m, t in by_method
        ],
        "daily_evolution": evolution,
        "alert": alert
    }
