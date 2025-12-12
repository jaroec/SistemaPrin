# backend/app/api/v1/pos.py - VERSIÓN MEJORADA CON VALIDACIÓN DE CRÉDITO
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
    ✅ NUEVA LÓGICA DE CRÉDITO CON VALIDACIÓN:
    - Valida límite de crédito ANTES de crear venta
    - Si TODO es CRÉDITO → Estado CREDITO (no PAGADO)
    - Si hay pago mixto (CRÉDITO + otros) → Estado CREDITO
    - Si NO hay CRÉDITO y está pagado completo → Estado PAGADO
    - Asigna deuda al cliente SOLO para la parte en CRÉDITO
    """
    try:
        print(f"\n🚀 INICIANDO CREACIÓN DE VENTA")
        print(f"   Payload recibido: {payload}")
        
        # 1️⃣ Gestionar cliente (OBLIGATORIO si hay CRÉDITO)
        client = None
        if payload.client_id:
            client = db.query(models.client.Client).filter(
                models.client.Client.id == payload.client_id
            ).first()
            if not client:
                raise HTTPException(status_code=404, detail="Cliente no encontrado")
            print(f"   ✅ Cliente: {client.name} (Balance actual: ${client.balance})")

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

        # 4️⃣ ✅ DETECTAR CRÉDITO Y VALIDAR LÍMITE
        has_credit = False
        credit_amount = 0.0
        
        if payload.payments:
            for payment_data in payload.payments:
                if payment_data.method == PaymentMethodEnum.CREDITO:
                    has_credit = True
                    credit_amount += payment_data.amount_usd

        # ✅ VALIDAR CRÉDITO
        if has_credit:
            # Crédito requiere cliente
            if not client:
                raise HTTPException(
                    status_code=400,
                    detail="⚠️ Cliente requerido para ventas con CRÉDITO"
                )
            
            # Validar límite de crédito disponible
            available_credit = client.credit_limit - client.balance
            if credit_amount > available_credit:
                raise HTTPException(
                    status_code=400,
                    detail=f"⚠️ Crédito insuficiente. Disponible: ${available_credit:.2f}, Solicitado: ${credit_amount:.2f}"
                )
            print(f"   ✅ Validación crédito OK: ${credit_amount:.2f} ≤ ${available_credit:.2f}")

        # 5️⃣ Crear venta (pendiente inicialmente)
        sale = models.sale.Sale(
            code=generate_sale_code(db),
            client_id=client.id if client else None,
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

        # 6️⃣ Crear detalles y actualizar stock
        for detail_data in details_data:
            detail = models.sale_detail.SaleDetail(
                sale_id=sale.id,
                product_id=detail_data['product'].id,
                quantity=detail_data['quantity'],
                price_usd=detail_data['price_usd'],
                subtotal_usd=detail_data['subtotal_usd']
            )
            db.add(detail)
            detail_data['product'].stock -= detail_data['quantity']

        # 7️⃣ Registrar pagos y calcular totales
        total_paid = 0.0

        if payload.payments:
            for payment_data in payload.payments:
                amount = round(payment_data.amount_usd, 2)
                method = payment_data.method.value
                
                if total_paid + amount > total:
                    raise HTTPException(
                        status_code=400,
                        detail=f"El monto de pago ({total_paid + amount}) excede el total ({total})"
                    )
                
                payment = models.payment.Payment(
                    sale_id=sale.id,
                    method=method,
                    amount_usd=amount,
                    reference=payment_data.reference
                )
                db.add(payment)
                total_paid += amount

        # 8️⃣ ✅ NUEVA LÓGICA DE ESTADO - CORREGIDA
        sale.paid_usd = round(total_paid, 2)
        sale.balance_usd = round(max(total - sale.paid_usd, 0.0), 2)

        if has_credit:
            # ✅ IMPORTANTE: Si hay crédito, SIEMPRE es CREDITO o PENDIENTE
            if credit_amount == total and total_paid == 0:
                # 100% crédito, sin otros pagos → PENDIENTE
                sale.status = "PENDIENTE"
                print(f"      Estado: PENDIENTE (100% crédito, nada pagado)")
            else:
                # Hay crédito + otros pagos (mixto) → CREDITO
                sale.status = "CREDITO"
                print(f"      Estado: CREDITO (pago mixto)")
        else:
            # No hay crédito
            if sale.balance_usd == 0:
                sale.status = "PAGADO"
                print(f"      Estado: PAGADO (sin crédito, pagado completo)")
            else:
                sale.status = "PENDIENTE"
                print(f"      Estado: PENDIENTE (sin crédito, pago parcial)")

        # 9️⃣ ✅ Actualizar balance del cliente Y REDUCIR LÍMITE DISPONIBLE
        if client and credit_amount > 0:
            # Agregar la deuda
            client.balance = round((client.balance or 0.0) + credit_amount, 2)
            # ✅ NUEVO: También reducir el límite disponible
            # (El límite disponible = credit_limit - balance)
            # Esto se calcula automáticamente cuando se consulta
            print(f"   👤 Balance del cliente actualizado: ${client.balance:.2f}")
            print(f"   👤 Límite disponible ahora: ${client.credit_limit - client.balance:.2f}")

        db.commit()
        db.refresh(sale)

        print(f"\n✅ VENTA COMPLETADA:")
        print(f"   Código: {sale.code}")
        print(f"   Total: ${total:.2f}")
        print(f"   Pagado: ${sale.paid_usd:.2f}")
        print(f"   Crédito: ${credit_amount:.2f}")
        print(f"   Balance Pendiente: ${sale.balance_usd:.2f}")
        print(f"   Estado: {sale.status}\n")

        # Construir salida
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
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
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
    ✅ ANULAR venta: Restaura stock y ajusta balance del cliente
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

    # ✅ Ajustar balance del cliente (restar lo que se había agregado)
    if sale.client_id and sale.paid_usd > 0:
        client = db.query(models.client.Client).filter(
            models.client.Client.id == sale.client_id
        ).first()
        if client:
            # Calcular cuánto era crédito
            credit_payments = [p for p in sale.payments if p.method == "CREDITO"]
            credit_total = sum(p.amount_usd for p in credit_payments)
            
            # Restar solo el crédito del balance
            if credit_total > 0:
                client.balance = round(max(0, client.balance - credit_total), 2)

    # Poner venta en estado ANULADO
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
    ✅ Abonar a venta pendiente
    """
    sale = db.query(models.sale.Sale).filter(
        models.sale.Sale.id == sale_id
    ).first()
    
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    if sale.status == "ANULADO":
        raise HTTPException(status_code=400, detail="No se puede pagar una venta anulada")

    if sale.status == "PAGADO":
        raise HTTPException(status_code=400, detail="Esta venta ya está completamente pagada")

    # Validar monto
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
    elif sale.paid_usd > 0:
        sale.status = "CREDITO"

    # ✅ Actualizar balance del cliente (restar abono)
    if sale.client_id:
        client = db.query(models.client.Client).filter(
            models.client.Client.id == sale.client_id
        ).first()
        if client:
            client.balance = round(max(0, client.balance - total_new_payments), 2)

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
    """Alias de annul_sale"""
    return annul_sale(sale_id, db, current_user)
