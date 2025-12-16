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
        with db.begin():  # 🔐 TRANSACCIÓN ATÓMICA REAL

            # 0. Validar caja abierta
            cash_register = db.query(models.cash_register.CashRegister).filter(
                models.cash_register.CashRegister.status == "OPEN",
                models.cash_register.CashRegister.opened_by_user_id == current_user.id
            ).first()

            if not cash_register:
                raise HTTPException(400, "No hay una caja abierta para este usuario")

            # 1. Cliente
            client = None
            if payload.client_id:
                client = db.query(models.client.Client).get(payload.client_id)
                if not client:
                    raise HTTPException(404, "Cliente no encontrado")

            # 2. Validar productos
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
                    raise HTTPException(
                        400,
                        f"Stock insuficiente para {product.name}"
                    )

                item_subtotal = round(product.sale_price * item.quantity, 2)
                subtotal += item_subtotal

                details_data.append((product, item, item_subtotal))

            discount = payload.discount_usd or 0.0
            total = round(subtotal - discount, 2)

            # 3. Crear venta
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

            # 4. Detalles + stock
            for product, item, item_subtotal in details_data:
                db.add(models.sale_detail.SaleDetail(
                    sale_id=sale.id,
                    product_id=product.id,
                    quantity=item.quantity,
                    price_usd=product.sale_price,
                    subtotal_usd=item_subtotal
                ))
                product.stock -= item.quantity

            # 5. Pagos + movimientos de caja
            total_paid = 0.0
            credit_used = 0.0

            for p in payload.payments:
                amount = round(p.amount_usd, 2)
                method = p.method.value

                db.add(models.payment.Payment(
                    sale_id=sale.id,
                    method=method,
                    amount_usd=amount,
                    reference=p.reference
                ))

                if method == "CREDITO":
                    credit_used += amount
                else:
                    total_paid += amount

                    db.add(models.cash_movement.CashMovement(
                        type=models.cash_movement.MovementType.INGRESO,
                        amount_usd=amount,
                        payment_method=method,
                        cash_register_id=cash_register.id,
                        reference_id=str(sale.id),
                        description=f"Venta {sale.code}",
                        created_by_user_id=current_user.id
                    ))

            sale.paid_usd = total_paid
            sale.balance_usd = round(total - total_paid, 2)

            # 6. Estados finales
            if sale.balance_usd == 0:
                sale.status = models.sale.SaleStatus.PAID
            elif credit_used > 0:
                sale.status = models.sale.SaleStatus.CREDIT
                client.balance += credit_used

        return sale

    except HTTPException:
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
    """
    ✅ ACTUALIZADO: Registrar abonos y crear movimientos de caja
    """
    sale = db.query(models.sale.Sale).filter(models.sale.Sale.id == sale_id).first()

    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if sale.status == "ANULADO":
        raise HTTPException(status_code=400, detail="No se puede pagar una venta anulada")

    if sale.status == "PAGADO":
        raise HTTPException(status_code=400, detail="Esta venta ya está completamente pagada")

    # Validar que no se envíe CREDITO
    for p in payments:
        if p.method == PaymentMethodEnum.CREDITO:
            raise HTTPException(status_code=400, detail="No se acepta CREDITO en abonos")

    total_new_payments = sum(round(p.amount_usd, 2) for p in payments)
    if total_new_payments > sale.balance_usd:
        raise HTTPException(
            status_code=400,
            detail=f"El monto ({total_new_payments}) excede el balance restante ({sale.balance_usd})"
        )

    # Registrar pagos
    total_paid = sale.paid_usd
    new_payment_records = []
    
    for payment_data in payments:
        amount = round(payment_data.amount_usd, 2)
        method = payment_data.method.value.upper()
        payment = models.payment.Payment(
            sale_id=sale.id,
            method=method,
            amount_usd=amount,
            reference=payment_data.reference
        )
        db.add(payment)
        new_payment_records.append(payment)
        total_paid += amount

    sale.paid_usd = round(total_paid, 2)
    sale.balance_usd = round(max(sale.total_usd - sale.paid_usd, 0.0), 2)

    if sale.balance_usd == 0:
        sale.status = "PAGADO"
    else:
        has_credit_record = any(p.method.upper() == "CREDITO" for p in sale.payments)
        sale.status = "CREDITO" if has_credit_record else "PENDIENTE"

    # Reducir balance del cliente
    if sale.client_id:
        client = db.query(models.client.Client).filter(
            models.client.Client.id == sale.client_id
        ).first()
        if client:
            client.balance = round(max(0, (client.balance or 0.0) - total_new_payments), 2)

    # ✅ NUEVO: Crear movimientos de caja para los nuevos pagos
    db.flush()
    
    for payment_record in new_payment_records:
        movement = models.cash_movement.CashMovement(
            type=models.cash_movement.MovementType.INGRESO,
            origin=models.cash_movement.MovementOrigin.VENTA,
            amount_usd=payment_record.amount_usd,
            payment_method=payment_record.method,
            description=f"Abono venta {sale.code} - Cliente: {sale.client.name if sale.client else 'Público General'}",
            category="VENTAS",
            notes=payment_record.reference,
            reference_id=str(sale.id),
            reference_code=sale.code,
            created_by_user_id=current_user.id,
            created_by_name=current_user.name or current_user.email,
            status=models.cash_movement.MovementStatus.CONFIRMADO,
        )
        db.add(movement)

    db.commit()

    return {
        "detail": "Pago registrado correctamente",
        "sale_id": sale_id,
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