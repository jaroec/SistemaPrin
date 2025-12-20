from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, timedelta

from app.db import models


def get_cash_status(db: Session):
    ingresos = db.query(func.sum(models.cash_movement.CashMovement.amount_usd)).filter(
        models.cash_movement.CashMovement.type == models.cash_movement.MovementType.INGRESO,
        models.cash_movement.CashMovement.status == models.cash_movement.MovementStatus.CONFIRMADO
    ).scalar() or 0

    egresos = db.query(func.sum(models.cash_movement.CashMovement.amount_usd)).filter(
        models.cash_movement.CashMovement.type == models.cash_movement.MovementType.EGRESO,
        models.cash_movement.CashMovement.status == models.cash_movement.MovementStatus.CONFIRMADO
    ).scalar() or 0

    return ingresos, egresos


def get_by_payment_method(db: Session, start: date, end: date):
    rows = db.query(
        models.cash_movement.CashMovement.payment_method,
        func.sum(models.cash_movement.CashMovement.amount_usd)
    ).filter(
        models.cash_movement.CashMovement.status == models.cash_movement.MovementStatus.CONFIRMADO,
        func.date(models.cash_movement.CashMovement.accounting_date).between(start, end)
    ).group_by(
        models.cash_movement.CashMovement.payment_method
    ).all()

    return rows


def get_daily_evolution(db: Session, days: int = 7):
    end = date.today()
    start = end - timedelta(days=days - 1)

    movements = db.query(models.cash_movement.CashMovement).filter(
        models.cash_movement.CashMovement.status == models.cash_movement.MovementStatus.CONFIRMADO,
        func.date(models.cash_movement.CashMovement.accounting_date).between(start, end)
    ).all()

    daily = {}
    for i in range(days):
        d = start + timedelta(days=i)
        daily[d] = {"ingresos": 0, "egresos": 0}

    for m in movements:
        d = m.accounting_date.date()
        if m.type == models.cash_movement.MovementType.INGRESO:
            daily[d]["ingresos"] += m.amount_usd
        else:
            daily[d]["egresos"] += m.amount_usd

    result = []
    for d, values in daily.items():
        result.append({
            "date": d,
            "ingresos": round(values["ingresos"], 2),
            "egresos": round(values["egresos"], 2),
            "saldo": round(values["ingresos"] - values["egresos"], 2)
        })

    return result
