from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.base import get_db
from app.core.security import role_required
from app.db import models
from app.db.schemas.cash_register import (
    CashRegisterOpen,
    CashRegisterClose,
    CashRegisterOut,
    CashRegisterResponse
)
from app.services.cash_register_service import calculate_system_amount

router = APIRouter(prefix="/cash-register", tags=["💼 Caja"])


@router.post("/open", response_model=CashRegisterOut)
def open_cash_register(
    payload: CashRegisterOpen,
    db: Session = Depends(get_db),
    user=Depends(role_required("CAJERO", "ADMIN"))
):
    existing = db.query(models.cash_register.CashRegister).filter(
        models.cash_register.CashRegister.status == "OPEN",
        models.cash_register.CashRegister.opened_by_user_id == user.id
    ).first()

    if existing:
        raise HTTPException(400, "Ya tienes una caja abierta")

    cash = models.cash_register.CashRegister(
        opening_amount=payload.opening_amount,
        expected_amount_usd=payload.expected_amount_usd,
        notes=payload.notes,
        status="OPEN",
        opened_by_user_id=user.id,
        opened_at=datetime.utcnow()
    )

    db.add(cash)
    db.commit()
    db.refresh(cash)
    return cash


@router.post("/close", response_model=CashRegisterOut)
def close_cash_register(
    payload: CashRegisterClose,
    db: Session = Depends(get_db),
    user=Depends(role_required("CAJERO", "ADMIN"))
):
    cash = db.query(models.cash_register.CashRegister).filter(
        models.cash_register.CashRegister.status == "OPEN",
        models.cash_register.CashRegister.opened_by_user_id == user.id
    ).first()

    if not cash:
        raise HTTPException(400, "No hay caja abierta")

    system_amount = calculate_system_amount(db, cash.id)
    difference = payload.counted_amount - system_amount

    cash.status = "CLOSED"
    cash.system_amount = system_amount
    cash.closing_amount = payload.counted_amount
    cash.difference = difference
    cash.closed_at = datetime.utcnow()
    cash.closed_by_user_id = user.id
    cash.notes = payload.notes

    db.commit()
    db.refresh(cash)
    return cash


@router.get("/status")
def cash_register_status(
    db: Session = Depends(get_db),
    user=Depends(role_required("CAJERO", "ADMIN"))
):
    cash = db.query(models.cash_register.CashRegister).filter(
        models.cash_register.CashRegister.status == "OPEN",
        models.cash_register.CashRegister.opened_by_user_id == user.id
    ).first()

    if not cash:
        return None

    return {
        "id": cash.id,
        "opening_amount_usd": float(cash.opening_amount),
        "closing_amount_usd": float(cash.closing_amount) if cash.closing_amount else None,
        "difference_usd": float(cash.difference) if cash.difference else None,
        "expected_amount_usd": float(cash.expected_amount_usd) if cash.expected_amount_usd else None,
        "status": cash.status,
        "opened_by_user_id": cash.opened_by_user_id,
        "closed_by_user_id": cash.closed_by_user_id,
        "opened_at": cash.opened_at,
        "closed_at": cash.closed_at,
    }