# backend/app/api/v1/pos.py - ACTUALIZADO CON FLUJO DE CAJA
"""
✅ CAMBIOS PRINCIPALES:
1. Al crear venta → genera movimientos de caja automáticamente
2. Al anular venta → crea reversos contables
3. Al pagar venta → registra nuevos movimientos de caja
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.security import get_db, role_required
from app.db import models
from app.db.schemas.pos import (
    SaleCreate, SaleOut, SaleDetailOut, PaymentCreate, PaymentOut, PaymentMethodEnum,
)
from app.core.security import (
    get_current_user,
    get_db,
)
from app.services.cash_flow_service import CashFlowService  # ✅ NUEVO
from sqlalchemy import func
from app.db.schemas.payment import PaymentCreate, PaymentResponse
from app.services.payment_service import process_sale_payments
from app.db.models.sale import Sale

router = APIRouter()


def generate_sale_code(db: Session):
    today = date.today().strftime("%Y%m%d")
    count = db.query(func.count(models.sale.Sale.id)).filter(
        func.date(models.sale.Sale.created_at) == date.today()
    ).scalar() or 0
    return f"VENTA-{today}-{count+1:03d}"


def summarize_payment_method(payments: List[PaymentCreate]) -> str:
    if not payments:
        return "N/A"
    methods = [p.method.value.upper() for p in payments]
    if any(m == "CREDITO" for m in methods):
        return "CREDITO"
    unique = set(methods)
    if len(unique) == 1:
        return unique.pop()
    return "MIXTO"


@router.post("/sales", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    try:
        # 1. Caja abierta
        cash_register = db.query(models.cash_register.CashRegister).filter(
            models.cash_register.CashRegister.status == "OPEN",
            models.cash_register.CashRegister.opened_by_user_id == current_user.id
        ).first()

        if not cash_register:
            raise HTTPException(400, "No hay una caja abierta para este usuario")

        # 2. Cliente
        client = None
        if payload.client_id:
            client = db.query(models.client.Client).get(payload.client_id)
            if not client:
                raise HTTPException(404, "Cliente no encontrado")

        # 3. Productos
        subtotal = 0.0
        details_data = []

        for item in payload.items:
            product = db.query(models.product.Product).filter(
                models.product.Product.id == item.product_id,
                models.product.Product.is_active == True
            ).with_for_update().first()

            if not product:
                raise HTTPException(404, f"Producto {item.product_id} no encontrado")

            if product.stock < item.quantity:
                raise HTTPException(400, f"Stock insuficiente para {product.name}")

            item_subtotal = round(product.sale_price * item.quantity, 2)
            subtotal += item_subtotal
            details_data.append((product, item, item_subtotal))

        discount = payload.discount_usd or 0.0
        total = round(subtotal - discount, 2)

        # 4. Crear venta
        sale = models.sale.Sale(
            code=generate_sale_code(db),
            client_id=client.id if client else None,
            seller_id=payload.seller_id,
            subtotal_usd=subtotal,
            discount_usd=discount,
            total_usd=total,
            paid_usd=0.0,
            balance_usd=total,
            status=models.sale.SaleStatus.PENDING
        )
        db.add(sale)
        db.flush()

        # 5. Detalles y stock
        for product, item, item_subtotal in details_data:
            db.add(models.sale_detail.SaleDetail(
                sale_id=sale.id,
                product_id=product.id,
                quantity=item.quantity,
                price_usd=product.sale_price,
                subtotal_usd=item_subtotal
            ))
            product.stock -= item.quantity

        # 6. Pagos + movimientos de caja
        total_paid = 0.0
        credit_used = 0.0

        for p in payload.payments:
            amount = round(p.amount_usd, 2)
            method = p.method.value.upper()

            payment = models.payment.Payment(
                sale_id=sale.id,
                method=method,
                amount_usd=amount,
                reference=p.reference
            )
            db.add(payment)
            db.flush()

            if method == "CREDITO":
                credit_used += amount
            else:
                total_paid += amount

                db.add(models.cash_movement.CashMovement(
                    type=models.cash_movement.MovementType.INGRESO,
                    amount_usd=amount,
                    amount=amount,
                    currency="USD",
                    payment_method=method,
                    reference=p.reference,
                    payment_id=payment.id,
                    reference_id=sale.id,
                    description=f"Venta {sale.code}",
                    category="VENTA",
                    notes=None,
                    created_by_user_id=current_user.id,
                    created_by_name=current_user.name or current_user.email,
                    cash_register_id=cash_register.id
                ))

        sale.paid_usd = total_paid
        sale.balance_usd = round(total - total_paid, 2)

        if sale.balance_usd == 0:
            sale.status = models.sale.SaleStatus.PAID
        elif credit_used > 0:
            sale.status = models.sale.SaleStatus.CREDIT
            if client:
                client.balance = round((client.balance or 0) + credit_used, 2)

        db.commit()
        return sale

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error al crear venta: {str(e)}")

@router.put("/sales/{sale_id}/annul", status_code=status.HTTP_200_OK)
def annul_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN"))
):
    """
    ✅ ACTUALIZADO: Anular venta y crear reversos contables
    """
    sale = db.query(models.sale.Sale).filter(models.sale.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if sale.status == "ANULADO":
        raise HTTPException(status_code=400, detail="Venta ya anulada")

    # Restaurar stock
    for detail in sale.details:
        product = db.query(models.product.Product).filter(
            models.product.Product.id == detail.product_id
        ).first()
        if product:
            product.stock += detail.quantity

    # Ajustar balance del cliente
    if sale.client_id:
        client = db.query(models.client.Client).filter(
            models.client.Client.id == sale.client_id
        ).first()
        if client:
            credit_payments = [p for p in sale.payments if p.method.upper() == "CREDITO"]
            credit_total = sum(p.amount_usd for p in credit_payments)
            if credit_total > 0:
                client.balance = round(max(0, (client.balance or 0.0) - credit_total), 2)

    # ✅ NUEVO: Crear reversos contables
    CashFlowService.annul_movements_from_sale(
        db=db,
        sale=sale,
        user_id=current_user.id,
        user_name=current_user.name or current_user.email
    )

    # Marcar anulada
    sale.status = "ANULADO"
    sale.balance_usd = 0.0

    db.commit()

    return {
        "detail": "Venta anulada correctamente",
        "sale_id": sale_id,
        "status": "ANULADO"
    }

@router.post(
    "/{sale_id}/payments",
    response_model=List[PaymentResponse],
    summary="Registrar pagos (simples o mixtos) de una venta"
)
def add_payments_to_sale(
    sale_id: int,
    payments: List[PaymentCreate],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()

    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venta no encontrada"
        )

    created_payments = process_sale_payments(
        db=db,
        sale=sale,
        payments=payments,
        user_id=current_user.id,
        user_name=current_user.full_name,
    )

    return created_payments

@router.post("/sales/{sale_id}/pay", status_code=status.HTTP_200_OK)
def pay_sale(
    sale_id: int,
    payments: List[PaymentCreate] = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    sale = db.query(models.sale.Sale).filter(models.sale.Sale.id == sale_id).first()

    if not sale:
        raise HTTPException(404, "Venta no encontrada")

    if sale.status in ["ANULADO", "PAGADO"]:
        raise HTTPException(400, "No se puede pagar esta venta")

    cash_register = db.query(models.cash_register.CashRegister).filter(
        models.cash_register.CashRegister.status == "OPEN",
        models.cash_register.CashRegister.opened_by_user_id == current_user.id
    ).first()

    if not cash_register:
        raise HTTPException(400, "No hay caja abierta")

    total_new = 0.0
    new_payments = []

    for p in payments:
        if p.method == PaymentMethodEnum.CREDITO:
            raise HTTPException(400, "No se acepta crédito en abonos")

        amount = round(p.amount_usd, 2)
        total_new += amount

        payment = models.payment.Payment(
            sale_id=sale.id,
            method=p.method.value.upper(),
            amount_usd=amount,
            reference=p.reference
        )
        db.add(payment)
        db.flush()
        new_payments.append(payment)

    if total_new > sale.balance_usd:
        raise HTTPException(400, "El monto excede el balance")

    for payment in new_payments:
        db.add(models.cash_movement.CashMovement(
            type=models.cash_movement.MovementType.INGRESO,
            amount_usd=payment.amount_usd,
            amount=payment.amount_usd,
            currency="USD",
            payment_method=payment.method,
            reference=payment.reference,
            payment_id=payment.id,
            reference_id=sale.id,
            description=f"Abono venta {sale.code}",
            category="VENTA",
            notes=None,
            created_by_user_id=current_user.id,
            created_by_name=current_user.name or current_user.email,
            cash_register_id=cash_register.id
        ))

    sale.paid_usd = round(sale.paid_usd + total_new, 2)
    sale.balance_usd = round(sale.total_usd - sale.paid_usd, 2)
    sale.status = "PAGADO" if sale.balance_usd == 0 else "PENDIENTE"

    db.commit()

    return {
        "detail": "Pago registrado correctamente",
        "sale_id": sale.id,
        "paid_usd": sale.paid_usd,
        "balance_usd": sale.balance_usd,
        "status": sale.status
    }

# ============================
# ENDPOINTS EXISTENTES SIN CAMBIOS
# ============================

@router.get("/sales/{sale_id}", response_model=SaleOut)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    """Obtener venta por ID"""
    sale = db.query(models.sale.Sale).filter(
        models.sale.Sale.id == sale_id
    ).first()

    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    details_out = [
        SaleDetailOut(
            id=d.id,
            product_id=d.product_id,
            product_name=d.product.name,
            quantity=d.quantity,
            price_usd=d.price_usd,
            subtotal_usd=d.subtotal_usd
        )
        for d in sale.details
    ]

    payments_out = [
        PaymentOut(
            id=p.id,
            method=p.method,
            amount_usd=p.amount_usd,
            reference=p.reference,
            created_at=p.created_at
        )
        for p in sale.payments
    ]

    return SaleOut(
        id=sale.id,
        code=sale.code,
        client_id=sale.client_id,
        client_name=sale.client.name if sale.client else None,
        client_phone=sale.client.phone if sale.client else None,
        seller_id=sale.seller_id,
        subtotal_usd=sale.subtotal_usd,
        total_usd=sale.total_usd,
        paid_usd=sale.paid_usd,
        balance_usd=sale.balance_usd,
        payment_method=sale.payment_method,
        status=sale.status,
        details=details_out,
        payments=payments_out,
        created_at=sale.created_at
    )


@router.get("/sales", response_model=List[SaleOut])
def list_sales(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    """Listar ventas"""
    query = db.query(models.sale.Sale)

    if status:
        query = query.filter(models.sale.Sale.status == status.upper())

    sales = query.order_by(
        models.sale.Sale.created_at.desc()
    ).offset(skip).limit(limit).all()

    results = []
    for sale in sales:
        details_out = [
            SaleDetailOut(
                id=d.id,
                product_id=d.product_id,
                product_name=d.product.name,
                quantity=d.quantity,
                price_usd=d.price_usd,
                subtotal_usd=d.subtotal_usd
            )
            for d in sale.details
        ]

        payments_out = [
            PaymentOut(
                id=p.id,
                method=p.method,
                amount_usd=p.amount_usd,
                reference=p.reference,
                created_at=p.created_at
            )
            for p in sale.payments
        ]

        results.append(SaleOut(
            id=sale.id,
            code=sale.code,
            client_id=sale.client_id,
            client_name=sale.client.name if sale.client else None,
            client_phone=sale.client.phone if sale.client else None,
            seller_id=sale.seller_id,
            subtotal_usd=sale.subtotal_usd,
            total_usd=sale.total_usd,
            paid_usd=sale.paid_usd,
            balance_usd=sale.balance_usd,
            payment_method=sale.payment_method,
            status=sale.status,
            details=details_out,
            payments=payments_out,
            created_at=sale.created_at
        ))

    return results
