# backend/app/api/v1/pos.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.security import get_db, role_required
from app.db import models
from app.db.schemas.pos import (
    SaleCreate,
    SaleOut,
    SaleDetailOut,
    PaymentCreate,
    PaymentOut,
    PaymentMethodEnum,
)
from sqlalchemy import func

router = APIRouter()


def generate_sale_code(db: Session):
    today = date.today().strftime("%Y%m%d")
    count = db.query(func.count(models.sale.Sale.id)).filter(
        func.date(models.sale.Sale.created_at) == date.today()
    ).scalar() or 0
    return f"VENTA-{today}-{count+1:03d}"


def summarize_payment_method(payments: List[PaymentCreate]) -> str:
    """
    Devuelve un string que resume el método de pago de la venta:
    - "CREDITO" si existe al menos un pago tipo CREDITO
    - nombre del método si solo hay un método no crédito
    - "MIXTO" si hay múltiples métodos no-credito
    """
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
    """
    Crear venta con manejo correcto de CRÉDITO y pagos mixtos.

    Reglas principales:
    - Los pagos con method == CREDITO generan deuda (se registran como payment record
      pero NO cuentan como dinero pagado para paid_usd).
    - paid_usd suma solo los pagos reales (EFECTIVO / TRANSFERENCIA / PAGO_MOVIL / etc).
    - balance_usd = total_usd - paid_usd
    - Si existe crédito (credit_amount > 0):
        - Si paid_usd == 0  => estado = PENDIENTE (100% crédito)
        - Si paid_usd > 0   => estado = CREDITO (mixto)
      Además payment_method resumen se marca como "CREDITO".
    - Si no existe crédito:
        - Si balance_usd == 0 => PAGADO
        - else => PENDIENTE
    """
    try:
        # 1. Cliente (si aplica)
        client = None
        if payload.client_id:
            client = db.query(models.client.Client).filter(
                models.client.Client.id == payload.client_id
            ).first()
            if not client:
                raise HTTPException(status_code=404, detail="Cliente no encontrado")

        # 2. Validar productos y calcular subtotal
        subtotal = 0.0
        details_data = []
        for item in payload.items:
            product = db.query(models.product.Product).filter(
                models.product.Product.id == item.product_id,
                models.product.Product.is_active == True
            ).first()

            if not product:
                raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")

            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para {product.name} (disponible: {product.stock})"
                )

            price_usd = product.sale_price
            item_subtotal = round(price_usd * item.quantity, 2)
            subtotal += item_subtotal

            details_data.append({
                'product': product,
                'quantity': item.quantity,
                'price_usd': price_usd,
                'subtotal_usd': item_subtotal
            })

        # 3. Totales
        discount = getattr(payload, "discount_usd", 0.0) or 0.0
        total = round(subtotal - discount, 2)

        # 4. Detectar crédito y validar límite (credit_amount = suma de payments method CREDITO)
        has_credit = False
        credit_amount = 0.0
        non_credit_sum = 0.0

        if payload.payments:
            for p in payload.payments:
                if p.method == PaymentMethodEnum.CREDITO:
                    has_credit = True
                    credit_amount += round(p.amount_usd, 2)
                else:
                    non_credit_sum += round(p.amount_usd, 2)

        # Validación: la suma de pagos reales no puede exceder el total
        if non_credit_sum > total:
            raise HTTPException(
                status_code=400,
                detail=f"Los pagos no-crédito ({non_credit_sum}) exceden el total ({total})"
            )

        # Si hay crédito, requerir cliente y validar límite disponible
        if has_credit:
            if not client:
                raise HTTPException(status_code=400, detail="Cliente requerido para ventas con CRÉDITO")
            available_credit = (client.credit_limit or 0.0) - (client.balance or 0.0)
            if credit_amount > available_credit:
                raise HTTPException(
                    status_code=400,
                    detail=f"Crédito insuficiente. Disponible: ${available_credit:.2f}, Solicitado: ${credit_amount:.2f}"
                )

        # 5. Crear venta (inicialmente con paid_usd=0, balance=total)
        sale = models.sale.Sale(
            code=generate_sale_code(db),
            client_id=client.id if client else None,
            seller_id=payload.seller_id,
            subtotal_usd=subtotal,
            discount_usd=discount,
            total_usd=total,
            paid_usd=0.0,
            balance_usd=total,
            # provisional; se reasignará correctamente después
            payment_method=summarize_payment_method(payload.payments) if payload.payments else "N/A",
            status="PENDIENTE"
        )
        db.add(sale)
        db.flush()

        # 6. Detalles y stock
        for d in details_data:
            detail = models.sale_detail.SaleDetail(
                sale_id=sale.id,
                product_id=d['product'].id,
                quantity=d['quantity'],
                price_usd=d['price_usd'],
                subtotal_usd=d['subtotal_usd']
            )
            db.add(detail)
            # actualizar stock en memoria
            d['product'].stock -= d['quantity']

        # 7. Registrar payments: crear registro para todos, pero solo sumar a paid_usd los no-credito
        total_paid = 0.0
        recorded_credit = 0.0  # crédito registrado (no contado en paid_usd)
        if payload.payments:
            for payment_data in payload.payments:
                amount = round(payment_data.amount_usd, 2)
                method = payment_data.method.value.upper()

                payment = models.payment.Payment(
                    sale_id=sale.id,
                    method=method,
                    amount_usd=amount,
                    reference=payment_data.reference
                )
                db.add(payment)

                if method == "CREDITO":
                    recorded_credit += amount
                else:
                    # chequeo de excedente adicional por seguridad
                    if total_paid + amount > total:
                        raise HTTPException(
                            status_code=400,
                            detail=f"El monto de pagos ({total_paid + amount}) excede el total ({total})"
                        )
                    total_paid += amount

        # 8. Actualizar montos y estado
        sale.paid_usd = round(total_paid, 2)
        sale.balance_usd = round(max(total - sale.paid_usd, 0.0), 2)

        # Determinar estado y payment_method summary
        if recorded_credit > 0:
            # existe crédito implicado
            if sale.paid_usd == 0:
                sale.status = "CREDITO"   # 100% crédito
            else:
                sale.status = "CREDITO"     # mixto
            sale.payment_method = "CREDITO"
        else:
            # no hay crédito
            if sale.balance_usd == 0:
                sale.status = "PAGADO"
            else:
                sale.status = "PENDIENTE"
            # Si hay pagos no-credito, resumir método
            if payload.payments:
                # obtiene resumen entre métodos reales (no crédito)
                non_credit_methods = [p.method.value.upper() for p in payload.payments if p.method != PaymentMethodEnum.CREDITO]
                if len(non_credit_methods) == 0:
                    sale.payment_method = "N/A"
                else:
                    unique = set(non_credit_methods)
                    if len(unique) == 1:
                        sale.payment_method = unique.pop()
                    else:
                        sale.payment_method = "MIXTO"
            else:
                sale.payment_method = payload.payment_method or "N/A"

        # 9. Actualizar balance del cliente (sumar deuda por la parte crédito)
        if client and recorded_credit > 0:
            client.balance = round((client.balance or 0.0) + recorded_credit, 2)

        # Aplicar cambios en stock y commit
        db.commit()
        # refrescar para tener relacion payments/details actualizadas
        db.refresh(sale)

        # Preparar salida
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
            client_name=getattr(sale.client, "name", None),
            seller_id=sale.seller_id,
            subtotal_usd=sale.subtotal_usd,
            discount_usd=sale.discount_usd,
            total_usd=sale.total_usd,
            paid_usd=sale.paid_usd,
            balance_usd=sale.balance_usd,
            payment_method=sale.payment_method,
            status=sale.status,
            details=details_out,
            payments=payments_out,
            created_at=sale.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear venta: {str(e)}")


@router.get("/sales/{sale_id}", response_model=SaleOut)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
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


@router.put("/sales/{sale_id}/annul", status_code=status.HTTP_200_OK)
def annul_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN"))
):
    """
    Anular venta: restaura stock y ajusta balance del cliente (solo la porción de crédito)
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

    # Ajustar balance del cliente: restar solo la porción de crédito registrada
    if sale.client_id:
        client = db.query(models.client.Client).filter(
            models.client.Client.id == sale.client_id
        ).first()
        if client:
            # Sumar todos los payments con method == "CREDITO"
            credit_payments = [p for p in sale.payments if p.method.upper() == "CREDITO"]
            credit_total = sum(p.amount_usd for p in credit_payments)
            if credit_total > 0:
                client.balance = round(max(0, (client.balance or 0.0) - credit_total), 2)

    # Marcar anulada
    sale.status = "ANULADO"
    sale.balance_usd = 0.0

    db.commit()

    return {
        "detail": "Venta anulada correctamente",
        "sale_id": sale_id,
        "status": "ANULADO"
    }


@router.post("/sales/{sale_id}/pay", status_code=status.HTTP_200_OK)
def pay_sale(
    sale_id: int,
    payments: List[PaymentCreate] = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    """
    Registrar abonos a una venta pendiente.
    - No se permiten payments con method == CREDITO en este endpoint (uso: pagos reales).
    - Los pagos reducen paid_usd y balance_usd. Si la venta tiene cliente, también reducen client.balance.
    """
    sale = db.query(models.sale.Sale).filter(models.sale.Sale.id == sale_id).first()

    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if sale.status == "ANULADO":
        raise HTTPException(status_code=400, detail="No se puede pagar una venta anulada")

    if sale.status == "PAGADO":
        raise HTTPException(status_code=400, detail="Esta venta ya está completamente pagada")

    # Validar que no se envíe CREDITO en este endpoint
    for p in payments:
        if p.method == PaymentMethodEnum.CREDITO:
            raise HTTPException(status_code=400, detail="No se acepta CREDITO en el endpoint de abonos")

    total_new_payments = sum(round(p.amount_usd, 2) for p in payments)
    if total_new_payments > sale.balance_usd:
        raise HTTPException(
            status_code=400,
            detail=f"El monto ({total_new_payments}) excede el balance restante ({sale.balance_usd})"
        )

    # Registrar pagos
    total_paid = sale.paid_usd
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
        total_paid += amount

    sale.paid_usd = round(total_paid, 2)
    sale.balance_usd = round(max(sale.total_usd - sale.paid_usd, 0.0), 2)

    # Actualizar estado: si queda balance -> CREDITO si originalmente había crédito, sino PENDIENTE
    if sale.balance_usd == 0:
        sale.status = "PAGADO"
    else:
        # Si la venta contiene al menos un payment de tipo CREDITO en registro -> CREDITO
        has_credit_record = any(p.method.upper() == "CREDITO" for p in sale.payments)
        sale.status = "CREDITO" if has_credit_record else "PENDIENTE"

    # Reducir balance del cliente (si existe)
    if sale.client_id:
        client = db.query(models.client.Client).filter(models.client.Client.id == sale.client_id).first()
        if client:
            client.balance = round(max(0, (client.balance or 0.0) - total_new_payments), 2)

    db.commit()

    return {
        "detail": "Pago registrado correctamente",
        "sale_id": sale_id,
        "paid_usd": sale.paid_usd,
        "balance_usd": sale.balance_usd,
        "status": sale.status
    }


@router.post("/sales/{sale_id}/cancel", status_code=status.HTTP_200_OK)
def cancel_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN"))
):
    """Alias a annul_sale"""
    return annul_sale(sale_id, db, current_user)
