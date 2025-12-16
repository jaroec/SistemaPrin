from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import date

from app.db.models.cash_movement import CashMovement, MovementType
from app.db.models.payment import Payment


def get_cash_flow_report(
    *,
    db: Session,
    start_date: date,
    end_date: date,
):
    # INGRESOS
    income_total = db.query(
        func.coalesce(func.sum(CashMovement.amount_usd), 0)
    ).filter(
        CashMovement.type == MovementType.INGRESO,
        CashMovement.created_at.between(start_date, end_date)
    ).scalar()

    # EGRESOS
    expense_total = db.query(
        func.coalesce(func.sum(CashMovement.amount_usd), 0)
    ).filter(
        CashMovement.type == MovementType.EGRESO,
        CashMovement.created_at.between(start_date, end_date)
    ).scalar()

    # INGRESOS POR MÉTODO DE PAGO
    income_by_method = db.query(
        Payment.method,
        func.sum(Payment.amount_usd)
    ).join(
        CashMovement, CashMovement.payment_id == Payment.id
    ).filter(
        CashMovement.created_at.between(start_date, end_date)
    ).group_by(
        Payment.method
    ).all()

    # EGRESOS POR CATEGORÍA
    expense_by_category = db.query(
        CashMovement.category,
        func.sum(CashMovement.amount_usd)
    ).filter(
        CashMovement.type == MovementType.EGRESO,
        CashMovement.created_at.between(start_date, end_date)
    ).group_by(
        CashMovement.category
    ).all()

    return {
        "total_income_usd": float(income_total),
        "total_expense_usd": float(expense_total),
        "net_balance_usd": float(income_total - expense_total),
        "income_by_method": [
            {"method": method.value, "total_usd": float(total)}
            for method, total in income_by_method
        ],
        "expense_by_category": [
            {"method": category, "total_usd": float(total)}
            for category, total in expense_by_category
        ],
    }

def cash_summary(db: Session, start, end):
    return db.query(
        func.sum(
            case((CashMovement.type == "INCOME", CashMovement.amount), else_=0)
        ).label("income"),
        func.sum(
            case((CashMovement.type == "EXPENSE", CashMovement.amount), else_=0)
        ).label("expense")
    ).filter(
        CashMovement.created_at.between(start, end)
    ).one()

def cash_by_method(db: Session, start, end):
    return db.query(
        CashMovement.payment_method,
        func.sum(CashMovement.amount).label("total")
    ).filter(
        CashMovement.created_at.between(start, end)
    ).group_by(
        CashMovement.payment_method
    ).all()

def cash_movements(db: Session, start, end):
    return db.query(CashMovement).filter(
        CashMovement.created_at.between(start, end)
    ).order_by(
        CashMovement.created_at.desc()
    ).all()