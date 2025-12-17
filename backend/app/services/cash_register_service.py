# app/services/cash_register_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from decimal import Decimal
from app.db import models
from app.db.models.cash_register import CashRegister, CashRegisterStatus
from app.db.models.cash_movement import CashMovement, MovementType
from fastapi import HTTPException, status


def get_open_cash_register(db: Session) -> CashRegister | None:
    return (
        db.query(CashRegister)
        .filter(CashRegister.status == CashRegisterStatus.OPEN)
        .first()
    )


def open_cash_register(db: Session, user_id: int, opening_balance: Decimal) -> CashRegister:
    existing = get_open_cash_register(db)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una caja abierta"
        )

    cash_register = CashRegister(
        opening_balance=opening_balance,
        opened_by=user_id
    )

    db.add(cash_register)
    db.commit()
    db.refresh(cash_register)

    if opening_balance > 0:
        movement = CashMovement(
            amount=opening_balance,
            movement_type=MovementType.INCOME,
            description="Saldo inicial de caja",
            cash_register_id=cash_register.id
        )
        db.add(movement)
        db.commit()

    return cash_register


def close_cash_register(db: Session, user_id: int) -> CashRegister:
    cash_register = get_open_cash_register(db)
    if not cash_register:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay caja abierta para cerrar"
        )

    total_income = (
        db.query(func.coalesce(func.sum(CashMovement.amount), 0))
        .filter(
            CashMovement.cash_register_id == cash_register.id,
            CashMovement.movement_type == MovementType.INCOME
        )
        .scalar()
    )

    total_expense = (
        db.query(func.coalesce(func.sum(CashMovement.amount), 0))
        .filter(
            CashMovement.cash_register_id == cash_register.id,
            CashMovement.movement_type == MovementType.EXPENSE
        )
        .scalar()
    )

    closing_balance = Decimal(total_income) - Decimal(total_expense)

    cash_register.closing_balance = closing_balance
    cash_register.closed_at = datetime.utcnow()
    cash_register.closed_by = user_id
    cash_register.status = CashRegisterStatus.CLOSED

    db.commit()
    db.refresh(cash_register)

    return cash_register

def calculate_system_amount(db: Session, cash_register_id: int) -> float:
    ingresos = db.query(func.coalesce(func.sum(CashMovement.amount), 0)).filter(
        CashMovement.cash_register_id == cash_register_id,
        CashMovement.type == MovementType.INGRESO
    ).scalar()

    egresos = db.query(func.coalesce(func.sum(CashMovement.amount), 0)).filter(
        CashMovement.cash_register_id == cash_register_id,
        CashMovement.type == MovementType.EGRESO
    ).scalar()

    return float(ingresos) - float(egresos)
