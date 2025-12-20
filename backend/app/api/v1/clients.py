# backend/app/api/v1/clients.py - VERSIÓN MEJORADA CON VENTAS
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.base import SessionLocal
from app.db.schemas.client import ClientCreate, ClientOut
from app.db.schemas.pos import SaleOut, SaleDetailOut, PaymentOut, PaymentCreate
from app.db import models
from app.core.security import role_required

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[ClientOut])
def list_clients(db: Session = Depends(get_db)):
    return db.query(models.client.Client).all()


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(models.client.Client).filter(
        models.client.Client.id == client_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return client


@router.post("/", response_model=ClientOut)
def create_client(payload: ClientCreate, db: Session = Depends(get_db)):
    c = models.client.Client(**payload.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    payload: ClientCreate,
    db: Session = Depends(get_db)
):
    client = db.query(models.client.Client).filter(
        models.client.Client.id == client_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    for key, value in payload.dict().items():
        setattr(client, key, value)
    
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(models.client.Client).filter(
        models.client.Client.id == client_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Verificar que no tenga deudas
    if client.balance > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar. Cliente tiene saldo pendiente: ${client.balance}"
        )
    
    db.delete(client)
    db.commit()
    return {"detail": "Cliente eliminado exitosamente"}


# ========================================
# ✅ NUEVOS ENDPOINTS: VENTAS DEL CLIENTE
# ========================================

@router.get("/{client_id}/sales", response_model=List[SaleOut])
def get_client_sales(
    client_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    """Obtener todas las ventas de un cliente"""
    client = db.query(models.client.Client).filter(
        models.client.Client.id == client_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    sales = db.query(models.sale.Sale).filter(
        models.sale.Sale.client_id == client_id
    ).order_by(
        models.sale.Sale.created_at.desc()
    ).all()
    
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
            client_name=client.name,
            client_phone=client.phone,
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
        ))
    
    return results


@router.post("/{client_id}/sales/{sale_id}/pay")
def pay_client_sale(
    client_id: int,
    sale_id: int,
    payments: List[PaymentCreate] = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    """Abonar a una venta específica del cliente"""
    # Verificar que la venta pertenece al cliente
    sale = db.query(models.sale.Sale).filter(
        models.sale.Sale.id == sale_id,
        models.sale.Sale.client_id == client_id
    ).first()
    
    if not sale:
        raise HTTPException(
            status_code=404,
            detail="Venta no encontrada para este cliente"
        )
    
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
    
    # ✅ Actualizar balance del cliente
    client = db.query(models.client.Client).filter(
        models.client.Client.id == client_id
    ).first()
    if client:
        client.balance = round(max(0, client.balance - total_new_payments), 2)
    
    db.commit()
    
    return {
        "detail": "Pago registrado correctamente",
        "sale_id": sale_id,
        "paid_usd": sale.paid_usd,
        "balance_usd": sale.balance_usd,
        "status": sale.status,
        "client_balance": client.balance if client else 0
    }


@router.post("/{client_id}/sales/{sale_id}/annul")
def annul_client_sale(
    client_id: int,
    sale_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN"))
):
    """Anular una venta específica del cliente"""
    sale = db.query(models.sale.Sale).filter(
        models.sale.Sale.id == sale_id,
        models.sale.Sale.client_id == client_id
    ).first()
    
    if not sale:
        raise HTTPException(
            status_code=404,
            detail="Venta no encontrada para este cliente"
        )
    
    if sale.status == "ANULADO":
        raise HTTPException(status_code=400, detail="Venta ya anulada")
    
    # Restaurar stock
    for detail in sale.details:
        product = db.query(models.product.Product).filter(
            models.product.Product.id == detail.product_id
        ).first()
        if product:
            product.stock += detail.quantity
    
    # ✅ Ajustar balance del cliente
    client = db.query(models.client.Client).filter(
        models.client.Client.id == client_id
    ).first()
    
    if client:
        # Calcular crédito de esta venta
        credit_payments = [p for p in sale.payments if p.method == "CREDITO"]
        credit_total = sum(p.amount_usd for p in credit_payments)
        
        # Restar del balance
        if credit_total > 0:
            client.balance = round(max(0, client.balance - credit_total), 2)
    
    # Marcar como anulada
    sale.status = "ANULADO"
    sale.balance_usd = 0.0
    
    db.commit()
    
    return {
        "detail": "Venta anulada correctamente",
        "sale_id": sale_id,
        "status": "ANULADO",
        "client_balance": client.balance if client else 0
    }


@router.get("/{client_id}/stats")
def get_client_stats(
    client_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    """Estadísticas del cliente"""
    client = db.query(models.client.Client).filter(
        models.client.Client.id == client_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Estadísticas
    stats = db.query(
        func.count(models.sale.Sale.id).label('total_sales'),
        func.sum(models.sale.Sale.total_usd).label('total_spent'),
        func.sum(models.sale.Sale.balance_usd).label('total_pending')
    ).filter(
        models.sale.Sale.client_id == client_id,
        models.sale.Sale.status != "ANULADO"
    ).first()
    
    return {
        "client_id": client.id,
        "client_name": client.name,
        "balance": round(client.balance, 2),
        "credit_limit": round(client.credit_limit, 2),
        "total_sales": stats.total_sales or 0,
        "total_spent": round(stats.total_spent or 0, 2),
        "total_pending": round(stats.total_pending or 0, 2)
    }