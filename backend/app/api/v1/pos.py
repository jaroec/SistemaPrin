# backend/app/api/v1/pos.py - VERSIÓN CORREGIDA
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


@router.post("/sales", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    """
    ✅ CORREGIDO #3: Crear venta con validación de stock, pagos y actualización automática.
    Si el método de pago es CREDITO, client_id es requerido y se asigna correctamente.
    """
    try:
        # 1️⃣ Gestionar cliente - ✅ CORREGIDO: Se asigna el cliente seleccionado
        client = None
        if payload.client_id:
            client = db.query(models.client.Client).filter(
                models.client.Client.id == payload.client_id
            ).first()
            if not client:
                raise HTTPException(status_code=404, detail="Cliente no encontrado")

        # Si es CREDITO, obligar cliente
        if payload.payment_method == PaymentMethodEnum.CREDITO:
            if not payload.client_id:
                raise HTTPException(status_code=400, detail="client_id es requerido para ventas a CREDITO")
            if not client:
                raise HTTPException(status_code=400, detail="Cliente no encontrado para venta a CREDITO")

        # 2️⃣ Validar productos y calcular totales
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

        # 3️⃣ Calcular totales
        discount = getattr(payload, "discount_usd", 0.0) or 0.0
        total = round(subtotal - discount, 2)

        # 4️⃣ Crear venta (pendiente inicialmente)
        sale = models.sale.Sale(
            code=generate_sale_code(db),
            client_id=client.id if client else None,  # ✅ ASIGNAR CLIENTE SI EXISTE
            seller_id=payload.seller_id,
            subtotal_usd=subtotal,
            discount_usd=discount,
            total_usd=total,
            paid_usd=0.0,
            balance_usd=total,
            payment_method=payload.payment_method,
            status="PENDIENTE"
        )
        db.add(sale)
        db.flush()

        # 5️⃣ Crear detalles y actualizar stock
        for detail_data in details_data:
            detail = models.sale_detail.SaleDetail(
                sale_id=sale.id,
                product_id=detail_data['product'].id,
                quantity=detail_data['quantity'],
                price_usd=detail_data['price_usd'],
                subtotal_usd=detail_data['subtotal_usd']
            )
            db.add(detail)
            # ✅ Descontar stock
            detail_data['product'].stock -= detail_data['quantity']

        # 6️⃣ Registrar pagos enviados en la creación
        total_paid = 0.0
        if payload.payments:
            for payment_data in payload.payments:
                amount = round(payment_data.amount_usd, 2)
                # ✅ Prevención: no permitir que el pago inicial exceda el total
                if total_paid + amount > total:
                    raise HTTPException(status_code=400, detail="El monto de pago inicial excede el total de la venta")
                payment = models.payment.Payment(
                    sale_id=sale.id,
                    method=payment_data.method.value,
                    amount_usd=amount,
                    reference=payment_data.reference
                )
                db.add(payment)
                total_paid += amount

        # 7️⃣ Actualizar estado de la venta
        sale.paid_usd = round(total_paid, 2)
        sale.balance_usd = round(max(total - sale.paid_usd, 0.0), 2)

        if sale.balance_usd == 0:
            sale.status = "PAGADO"
        elif sale.paid_usd > 0 and sale.paid_usd < sale.total_usd:
            sale.status = "CREDITO"
        else:
            sale.status = "PENDIENTE"

        # 8️⃣ Actualizar balance del cliente si es CREDITO
        if sale.payment_method == PaymentMethodEnum.CREDITO and client:
            client.balance = round((client.balance or 0.0) + sale.balance_usd, 2)

        db.commit()
        db.refresh(sale)

        # Construir salida
        details_out = []
        for d in sale.details:
            details_out.append(SaleDetailOut(
                id=d.id,
                product_id=d.product_id,
                product_name=getattr(d.product, "name", ""),
                quantity=d.quantity,
                price_usd=d.price_usd,
                subtotal_usd=d.subtotal_usd
            ))

        payments_out = [
            PaymentOut(id=p.id, method=p.method, amount_usd=p.amount_usd, reference=p.reference, created_at=p.created_at)
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

    client = sale.client
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

    return SaleOut(
        id=sale.id,
        code=sale.code,
        client_id=sale.client_id,
        client_name=client.name if client else None,
        client_phone=client.phone if client else None,
        seller_id=sale.seller_id,
        subtotal_usd=sale.subtotal_usd,
        total_usd=sale.total_usd,
        paid_usd=sale.paid_usd,
        balance_usd=sale.balance_usd,
        payment_method=sale.payment_method,
        status=sale.status,
        details=details_out,
        payments=sale.payments,
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
    """Listar ventas con filtros opcionales"""
    query = db.query(models.sale.Sale)
    
    if status:
        query = query.filter(models.sale.Sale.status == status.upper())
    
    sales = query.order_by(
        models.sale.Sale.created_at.desc()
    ).offset(skip).limit(limit).all()

    results = []
    for sale in sales:
        client = sale.client
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
        
        results.append(SaleOut(
            id=sale.id,
            code=sale.code,
            client_id=sale.client_id,
            client_name=client.name if client else None,
            client_phone=client.phone if client else None,
            seller_id=sale.seller_id,
            subtotal_usd=sale.subtotal_usd,
            total_usd=sale.total_usd,
            paid_usd=sale.paid_usd,
            balance_usd=sale.balance_usd,
            payment_method=sale.payment_method,
            status=sale.status,
            details=details_out,
            payments=sale.payments,
            created_at=sale.created_at
        ))
    
    return results


@router.get("/sales/today", response_model=List[SaleOut])
def todays_sales(
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    today = date.today()
    sales = db.query(models.sale.Sale).filter(
        func.date(models.sale.Sale.created_at) == today
    ).order_by(models.sale.Sale.created_at.desc()).all()

    results = []
    for sale in sales:
        client = sale.client
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
        
        results.append(SaleOut(
            id=sale.id,
            code=sale.code,
            client_id=sale.client_id,
            client_name=client.name if client else None,
            client_phone=client.phone if client else None,
            seller_id=sale.seller_id,
            subtotal_usd=sale.subtotal_usd,
            total_usd=sale.total_usd,
            paid_usd=sale.paid_usd,
            balance_usd=sale.balance_usd,
            payment_method=sale.payment_method,
            status=sale.status,
            details=details_out,
            payments=sale.payments,
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
    ✅ CORREGIDO #2: ANULAR una venta correctamente
    - Restaura stock de productos
    - Devuelve dinero pagado al cliente.balance
    - Pone paid_usd y balance_usd en 0
    - No continúa la venta abierta
    """
    sale = db.query(models.sale.Sale).filter(models.sale.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if sale.status == "ANULADO":
        raise HTTPException(status_code=400, detail="Venta ya anulada")

    # ✅ Restaurar stock de cada producto
    for detail in sale.details:
        product = db.query(models.product.Product).filter(
            models.product.Product.id == detail.product_id
        ).first()
        if product:
            product.stock += detail.quantity

    # ✅ Ajuste financiero correcto:
    # Si hubo pagos, devolver el dinero al cliente
    if sale.paid_usd and sale.paid_usd > 0:
        if sale.client_id:
            client = db.query(models.client.Client).filter(
                models.client.Client.id == sale.client_id
            ).first()
            if client:
                # Restar el monto pagado del balance del cliente
                # (devolución de efectivo o crédito a favor)
                client.balance = round(max(0, (client.balance or 0.0) - sale.paid_usd), 2)

    # ✅ Poner todo en 0
    sale.paid_usd = 0.0
    sale.balance_usd = 0.0
    sale.status = "ANULADO"

    db.commit()

    return {
        "detail": "Venta anulada correctamente",
        "sale_id": sale_id,
        "status": "ANULADO",
        "refund_amount": sale.paid_usd
    }


@router.post("/sales/{sale_id}/pay", status_code=status.HTTP_200_OK)
def pay_sale(
    sale_id: int,
    payments: List[PaymentCreate] = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    """
    ✅ CORREGIDO #4: Abonar/pagar crédito validando monto restante
    - No permite pagar más del balance restante
    - Valida que el total de pagos no exceda el saldo pendiente
    """
    sale = db.query(models.sale.Sale).filter(
        models.sale.Sale.id == sale_id
    ).first()
    
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    if sale.status == "ANULADO":
        raise HTTPException(
            status_code=400,
            detail="No se puede pagar una venta anulada"
        )

    if sale.status == "PAGADO":
        raise HTTPException(
            status_code=400,
            detail="Esta venta ya está completamente pagada"
        )

    # ✅ Validar que el total de nuevos pagos no exceda el balance restante
    total_new_payments = 0.0
    for payment_data in payments:
        amount = round(payment_data.amount_usd, 2)
        total_new_payments += amount

    # ✅ El monto a pagar no puede exceder el balance restante
    if total_new_payments > sale.balance_usd:
        raise HTTPException(
            status_code=400,
            detail=f"El monto total ({total_new_payments}) excede el balance restante ({sale.balance_usd})"
        )

    # Registrar los pagos
    total_paid = sale.paid_usd
    for payment_data in payments:
        amount = round(payment_data.amount_usd, 2)
        payment = models.payment.Payment(
            sale_id=sale.id,
            method=payment_data.method.value,
            amount_usd=amount,
            reference=payment_data.reference
        )
        db.add(payment)
        total_paid += amount

    sale.paid_usd = round(total_paid, 2)
    sale.balance_usd = round(max(sale.total_usd - sale.paid_usd, 0.0), 2)

    # Actualizar estado
    if sale.balance_usd == 0:
        sale.status = "PAGADO"
    elif sale.paid_usd > 0 and sale.paid_usd < sale.total_usd:
        sale.status = "CREDITO"

    # ✅ Actualizar balance del cliente si existe
    if sale.client_id:
        client = db.query(models.client.Client).filter(
            models.client.Client.id == sale.client_id
        ).first()
        if client:
            # Restar del balance del cliente
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
    """
    ✅ Alias de annul_sale para compatibilidad
    """
    return annul_sale(sale_id, db, current_user)
