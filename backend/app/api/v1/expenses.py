# Backend/app/api/v1/expense.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.base import get_db
from app.core.security import role_required
from app.db import models
from app.db.schemas.cash_flow import ExpenseCreate, ExpenseOut
from app.api.v1.cash_flow import generate_expense_code, create_cash_movement_from_expense

router = APIRouter(prefix="/expenses", tags=["📉 Egresos"])

@router.post("/", response_model=ExpenseOut)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    user=Depends(role_required("ADMIN", "CAJERO")),
):
    expense = models.expense.Expense(
        code=generate_expense_code(db),
        category=payload.category,
        amount_usd=payload.amount_usd,
        description=payload.description,
        payment_method=payload.payment_method,
        created_by_user_id=user.id,
        created_by_name=user.name or user.email,
    )

    db.add(expense)
    db.flush()

    create_cash_movement_from_expense(db, expense, user)

    db.commit()
    db.refresh(expense)
    return expense
