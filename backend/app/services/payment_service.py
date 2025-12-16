from sqlalchemy.orm import Session
from typing import List

from app.db.models.sale import Sale
from app.db.models.payment import Payment
from app.db.models.cash_movement import CashMovement, MovementType
from app.db.schemas.payment import PaymentCreate
from fastapi import HTTPException, status


def process_sale_payments(
    *,
    db: Session,
    sale: Sale,
    payments: List[PaymentCreate],
    user_id: int,
    user_name: str,
):
    if sale.status == "PAGADA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La venta ya está pagada"
        )

    total_payment_usd = sum(p.amount_usd for p in payments)

    if total_payment_usd <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto total debe ser mayor a cero"
        )

    # Validación de crédito
    for p in payments:
        if p.method.value == "CREDITO":
            if not sale.customer_id:
                raise HTTPException(
                    status_code=400,
                    detail="Venta sin cliente no puede ir a crédito"
                )

    created_payments = []

    for p in payments:
        payment = Payment(
            sale_id=sale.id,
            method=p.method,
            currency=p.currency,
            amount=p.amount,
            amount_usd=p.amount_usd,
            reference_number=p.reference_number,
            bank_code=p.bank_code,
            bank_name=p.bank_name,
            digital_platform=p.digital_platform,
        )

        db.add(payment)
        db.flush()  # obtenemos payment.id

        cash_movement = CashMovement(
            type=MovementType.INGRESO,
            amount_usd=p.amount_usd,
            payment_id=payment.id,
            description=f"Ingreso por venta #{sale.id} - {p.method.value}",
            category="VENTA",
            created_by_user_id=user_id,
            created_by_name=user_name,
        )

        db.add(cash_movement)
        created_payments.append(payment)

    # Recalcular totales de la venta
    sale.total_paid_usd += total_payment_usd
    sale.balance_due_usd = max(sale.total_usd - sale.total_paid_usd, 0)

    # Actualizar estado
    if sale.balance_due_usd == 0:
        sale.status = "PAGADA"
    elif sale.total_paid_usd > 0:
        sale.status = "PARCIAL"
    else:
        sale.status = "PENDIENTE"

    db.commit()
    db.refresh(sale)

    return created_payments
