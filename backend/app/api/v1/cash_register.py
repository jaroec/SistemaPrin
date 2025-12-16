# app/api/v1/cash_register.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.base import get_db
from app.db.schemas.cash_register import (
    CashRegisterOpen,
    CashRegisterResponse
)
from app.services.cash_register_service import (
    open_cash_register,
    close_cash_register,
    get_open_cash_register
)
from app.core.security import get_current_user
from app.core.security import role_required
from app.db.models import CashRegister, CashMovement, MovementType
from app.db.base import get_db

router = APIRouter(prefix="/cash-register", tags=["💼 Caja"])


router = APIRouter()

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.base import get_db
from app.core.security import role_required
from app.db import models
from app.db.schemas.cash_register import (
    CashRegisterOpen,
    CashRegisterClose,
    CashRegisterOut
)
from app.services.cash_register_service import calculate_system_amount

router = APIRouter()

@router.post("/cash-register/open", response_model=CashRegisterOut)
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
        opened_by_user_id=user.id
    )
    db.add(cash)
    db.commit()
    db.refresh(cash)
    return cash


@router.post("/cash-register/close", response_model=CashRegisterOut)
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
    difference = float(payload.counted_amount) - system_amount

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

@router.get("/status", response_model=CashRegisterResponse | None)
def cash_register_status(
    db: Session = Depends(get_db)
):
    return get_open_cash_register(db)
