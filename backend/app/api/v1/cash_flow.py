# backend/app/api/v1/cash_flow.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from typing import Optional, List

from app.db.base import get_db
from app.core.security import role_required
from app.db import models
from app.db.schemas.cash_flow import (
    ExpenseCreate,
    ExpenseOut,
    CashMovementOut,
    CashFlowSummary,
    ExpensesByCategoryReport,
    DailyCashFlow,
)

router = APIRouter(prefix="/cash-flow", tags=["💰 Flujo de Caja"])

def generate_expense_code(db: Session) -> str:
    today = date.today().strftime("%Y%m%d")
    count = db.query(func.count(models.expense.Expense.id)).filter(
        func.date(models.expense.Expense.created_at) == date.today()
    ).scalar() or 0
    return f"EGRESO-{today}-{count+1:03d}"

def create_cash_movement_from_expense(db, expense, user):
    movement = models.cash_movement.CashMovement(
        type=models.cash_movement.MovementType.EGRESO,
        origin=models.cash_movement.MovementOrigin.OTRO,
        amount_usd=expense.amount_usd,
        payment_method=expense.payment_method,
        description=expense.description,
        category=expense.category,
        reference_id=str(expense.id),
        reference_code=expense.code,
        created_by_user_id=user.id,
        created_by_name=user.name or user.email,
        status=models.cash_movement.MovementStatus.CONFIRMADO,
    )
    db.add(movement)

@router.get("/summary", response_model=CashFlowSummary)
def cash_flow_summary(
    start_date: str = Query(...),
    end_date: str = Query(...),
    db: Session = Depends(get_db),
    _=Depends(role_required("ADMIN", "CAJERO")),
):
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()

    movements = db.query(models.cash_movement.CashMovement).filter(
        and_(
            models.cash_movement.CashMovement.status ==
            models.cash_movement.MovementStatus.CONFIRMADO,
            func.date(models.cash_movement.CashMovement.accounting_date) >= start,
            func.date(models.cash_movement.CashMovement.accounting_date) <= end,
        )
    ).all()

    ingresos = sum(m.amount_usd for m in movements if m.type == "INGRESO")
    egresos = sum(m.amount_usd for m in movements if m.type == "EGRESO")

    return {
        "period_start": start,
        "period_end": end,
        "total_ingresos": ingresos,
        "total_egresos": egresos,
        "saldo_neto": ingresos - egresos,
        "count_ingresos": len([m for m in movements if m.type == "INGRESO"]),
        "count_egresos": len([m for m in movements if m.type == "EGRESO"]),
    }
