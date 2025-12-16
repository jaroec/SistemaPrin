from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.models.expense import Expense
from app.db.models.cash_movement import CashMovement, MovementType
from app.db.schemas.expense import ExpenseCreate


def create_expense(
    *,
    db: Session,
    expense_data: ExpenseCreate,
    user_id: int,
    user_name: str,
):
    expense = Expense(
        category=expense_data.category,
        description=expense_data.description,
        provider_id=expense_data.provider_id,
        payment_method=expense_data.payment_method,
        currency=expense_data.currency,
        amount=expense_data.amount,
        amount_usd=expense_data.amount_usd,
        reference_number=expense_data.reference_number,
        bank_code=expense_data.bank_code,
        bank_name=expense_data.bank_name,
        digital_platform=expense_data.digital_platform,
        created_by_user_id=user_id,
        created_by_name=user_name,
    )

    db.add(expense)
    db.flush()

    cash_movement = CashMovement(
        type=MovementType.EGRESO,
        amount_usd=expense.amount_usd,
        expense_id=expense.id,
        description=f"Egreso: {expense.description}",
        category=expense.category.value,
        created_by_user_id=user_id,
        created_by_name=user_name,
    )

    db.add(cash_movement)
    db.commit()
    db.refresh(expense)

    return expense
