# Backend/app/api/v1/reports.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from typing import Optional

from app.db.base import get_db
from app.core.security import get_current_user, role_required
from app.db import models
from app.db.schemas.financial_report import CashFlowReport
from app.services.financial_report_service import (
    get_cash_flow_report,
    cash_summary,
    cash_by_method,
    cash_movements
)

router = APIRouter(prefix="/reports", tags=["📊 Reportes"])

def parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()

@router.get("/summary")
def financial_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    start = parse_date(start_date)
    end = parse_date(end_date)

    sales = db.query(models.sale.Sale).filter(models.sale.Sale.status != "ANULADO")
    expenses = db.query(models.expense.Expense)

    if start:
        sales = sales.filter(func.date(models.sale.Sale.created_at) >= start)
        expenses = expenses.filter(func.date(models.expense.Expense.created_at) >= start)

    if end:
        sales = sales.filter(func.date(models.sale.Sale.created_at) <= end)
        expenses = expenses.filter(func.date(models.expense.Expense.created_at) <= end)

    income = sales.with_entities(func.sum(models.sale.Sale.total_usd)).scalar() or 0
    expense = expenses.with_entities(func.sum(models.expense.Expense.amount_usd)).scalar() or 0

    return {
        "total_income_usd": round(income, 2),
        "total_expense_usd": round(expense, 2),
        "balance_usd": round(income - expense, 2),
        "count_sales": sales.count(),
        "count_expenses": expenses.count(),
    }

@router.get("/cash-flow", response_model=CashFlowReport)
def cash_flow_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    data = get_cash_flow_report(db, start_date, end_date)
    return {"period": f"{start_date} → {end_date}", **data}

@router.get("/cash-summary")
def cash_summary_report(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: Session = Depends(get_db),
):
    income, expense = cash_summary(db, from_date, to_date)
    return {
        "income": income or 0,
        "expense": expense or 0,
        "net": (income or 0) - (expense or 0),
    }

@router.get("/cash-by-method")
def cash_by_payment_method(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: Session = Depends(get_db),
):
    return [
        {"method": method, "total": total}
        for method, total in cash_by_method(db, from_date, to_date)
    ]

@router.get("/cash-movements")
def cash_movements_report(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: Session = Depends(get_db),
):
    return cash_movements(db, from_date, to_date)

@router.post("/sales/{sale_id}/cancel")
def cancel_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    _=Depends(role_required("ADMIN")),
):
    sale = db.query(models.sale.Sale).get(sale_id)

    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if sale.status == "ANULADO":
        return {"message": "La venta ya estaba anulada"}

    sale.status = "ANULADO"
    db.commit()

    return {"message": "Venta anulada correctamente", "sale_id": sale_id}
