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
    PaymentOut
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
    Crear venta con validación de stock, pagos y actualización automática
    """
    try:
        # 1️⃣ Gestionar cliente
        client = None
        if payload.client_id:
            client = db.query(models.client.Client).filter(
                models.client.Client.id == payload.client_id
            ).first()
        
        if not client and (payload.client_name or payload.client_phone):
            client = models.client.Client(
                name=payload.client_name or "Cliente General",
                phone=payload.client_phone
            )
            db.add(client)
            db.flush()  # ✅ Para obtener client.id sin commit

        # 2️⃣ Validar productos y calcular totales
        subtotal = 0.0
        details_data = []
        
        for item in payload.items:
            product = db.query(models.product.Product).filter(
                models.product.Product.id == item.product_id,
                models.product.Product.is_active == True
            ).first()
            
            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Producto {item.product_id} no encontrado"
                )
            
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

        subtotal = round(subtotal, 2)
        total = subtotal  # Aquí podrías agregar descuentos/impuestos

        # 3️⃣ Crear venta
        sale = models.sale.Sale(
            code=generate_sale_code(db),
            client_id=client.id if client else None,
            seller_id=payload.seller_id,
            subtotal_usd=subtotal,
            total_usd=total,
            paid_usd=0.0,
            balance_usd=total,
            payment_method=payload.payment_method,
            status="PENDIENTE"
        )
        db.add(sale)
        db.flush()

        # 4️⃣ Crear detalles y actualizar stock
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

        # 5️⃣ Registrar pagos
        total_paid = 0.0
        if payload.payments:
            for payment_data in payload.payments:
                amount = round(payment_data.amount_usd, 2)
                payment = models.payment.Payment(
                    sale_id=sale.id,
                    method=payment_data.method.value,
                    amount_usd=amount,
                    reference=payment_data.reference
                )
                db.add(payment)
                total_paid += amount

        # 6️⃣ Actualizar estado de la venta
        sale.paid_usd = round(total_paid, 2)
        sale.balance_usd = round(max(total - sale.paid_usd, 0.0), 2)

        if sale.balance_usd == 0:
            sale.status = "PAGADO"
        elif sale.paid_usd > 0 and sale.paid_usd < sale.total_usd:
            sale.status = "CREDITO"
        else:
            sale.status = "PENDIENTE"

        db.commit()
        db.refresh(sale)

        # 7️⃣ Construir respuesta
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

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


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


@router.post("/sales/{sale_id}/cancel", status_code=status.HTTP_200_OK)
def cancel_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN"))
):
    sale = db.query(models.sale.Sale).filter(
        models.sale.Sale.id == sale_id
    ).first()
    
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    if sale.status == "ANULADO":
        raise HTTPException(status_code=400, detail="Venta ya anulada")

    # ✅ Restaurar stock
    for detail in sale.details:
        product = db.query(models.product.Product).filter(
            models.product.Product.id == detail.product_id
        ).first()
        if product:
            product.stock += detail.quantity

    sale.status = "ANULADO"
    db.commit()
    
    return {"detail": "Venta anulada y stock restaurado"}


@router.post("/sales/{sale_id}/pay", status_code=status.HTTP_200_OK)
def pay_sale(
    sale_id: int,
    payments: List[PaymentCreate] = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
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

    if sale.balance_usd == 0:
        sale.status = "PAGADO"
    elif sale.paid_usd > 0 and sale.paid_usd < sale.total_usd:
        sale.status = "CREDITO"

    db.commit()
    
    return {
        "detail": "Pago registrado",
        "paid_usd": sale.paid_usd,
        "balance_usd": sale.balance_usd,
        "status": sale.status
    }