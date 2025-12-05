# backend/app/api/v1/dashboard.py - VERSIÓN CORREGIDA
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from app.core.security import get_db, role_required
from app.db import models

router = APIRouter()


@router.get("/dashboard/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    """
    ✅ CORREGIDO: Resumen ejecutivo del dashboard.
    Excluye correctamente ventas anuladas (ANULADO).
    No registra montos de ventas anuladas en los totales.
    """
    today = date.today()
    yesterday = today - timedelta(days=1)
    this_month_start = date(today.year, today.month, 1)
    
    # Ventas del día (EXCLUIR ANULADAS)
    today_sales = db.query(
        func.count(models.sale.Sale.id).label('count'),
        func.sum(models.sale.Sale.total_usd).label('total'),
        func.sum(models.sale.Sale.paid_usd).label('paid'),
        func.sum(models.sale.Sale.balance_usd).label('pending')
    ).filter(
        func.date(models.sale.Sale.created_at) == today,
        models.sale.Sale.status != "ANULADO"  # ✅ Excluir anuladas
    ).first()
    
    # Ventas de ayer (EXCLUIR ANULADAS)
    yesterday_sales = db.query(
        func.sum(models.sale.Sale.total_usd).label('total')
    ).filter(
        func.date(models.sale.Sale.created_at) == yesterday,
        models.sale.Sale.status != "ANULADO"  # ✅ Excluir anuladas
    ).first()
    
    # Ventas del mes (EXCLUIR ANULADAS)
    month_sales = db.query(
        func.count(models.sale.Sale.id).label('count'),
        func.sum(models.sale.Sale.total_usd).label('total')
    ).filter(
        func.date(models.sale.Sale.created_at) >= this_month_start,
        models.sale.Sale.status != "ANULADO"  # ✅ Excluir anuladas
    ).first()
    
    # Productos con bajo stock (activos)
    low_stock_count = db.query(func.count(models.product.Product.id)).filter(
        models.product.Product.stock <= models.product.Product.min_stock,
        models.product.Product.is_active == True
    ).scalar()
    
    # Clientes con deuda (balance > 0)
    clients_with_debt = db.query(func.count(models.client.Client.id)).filter(
        models.client.Client.balance > 0,
        models.client.Client.is_active == True
    ).scalar()
    
    # Ventas pendientes de pago (EXCLUIR ANULADAS)
    pending_sales = db.query(func.count(models.sale.Sale.id)).filter(
        models.sale.Sale.status.in_(["PENDIENTE", "CREDITO"]),
        models.sale.Sale.status != "ANULADO"  # ✅ Extra validación
    ).scalar()
    
    # Calcular variación diaria
    today_total = today_sales.total or 0.0
    yesterday_total = yesterday_sales.total or 0.0
    daily_change = 0.0
    if yesterday_total > 0:
        daily_change = round(((today_total - yesterday_total) / yesterday_total) * 100, 2)
    
    return {
        "today": {
            "sales_count": today_sales.count or 0,
            "total_usd": round(today_total, 2),
            "paid_usd": round(today_sales.paid or 0.0, 2),
            "pending_usd": round(today_sales.pending or 0.0, 2),
            "daily_change_percent": daily_change
        },
        "month": {
            "sales_count": month_sales.count or 0,
            "total_usd": round(month_sales.total or 0.0, 2)
        },
        "alerts": {
            "low_stock_products": low_stock_count or 0,
            "clients_with_debt": clients_with_debt or 0,
            "pending_sales": pending_sales or 0
        }
    }


@router.get("/dashboard/recent-sales")
def get_recent_sales(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    """
    ✅ CORREGIDO: Últimas ventas realizadas.
    Excluye ventas anuladas (ANULADO) del listado.
    """
    sales = db.query(models.sale.Sale).filter(
        models.sale.Sale.status != "ANULADO"  # ✅ Excluir anuladas
    ).order_by(
        models.sale.Sale.created_at.desc()
    ).limit(limit).all()
    
    result = []
    for sale in sales:
        result.append({
            "id": sale.id,
            "code": sale.code,
            "client_name": sale.client.name if sale.client else "Público General",
            "total_usd": round(sale.total_usd, 2),
            "status": sale.status,
            "created_at": sale.created_at.isoformat()
        })
    
    return result


@router.get("/dashboard/clients-with-debt")
def get_clients_with_debt(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN"))
):
    """
    ✅ NUEVO: Obtener clientes con deuda pendiente
    Útil para ver quiénes deben dinero.
    """
    clients = db.query(
        models.client.Client.id,
        models.client.Client.name,
        models.client.Client.phone,
        models.client.Client.balance,
        func.count(models.sale.Sale.id).label('sales_count'),
        func.sum(models.sale.Sale.total_usd).label('total_spent')
    ).join(
        models.sale.Sale,
        models.client.Client.id == models.sale.Sale.client_id,
        isouter=True
    ).filter(
        models.client.Client.balance > 0,
        models.client.Client.is_active == True
    ).group_by(
        models.client.Client.id,
        models.client.Client.name,
        models.client.Client.phone,
        models.client.Client.balance
    ).order_by(
        models.client.Client.balance.desc()
    ).limit(limit).all()
    
    return [
        {
            "client_id": c.id,
            "client_name": c.name,
            "phone": c.phone,
            "balance_owed": round(c.balance, 2),
            "sales_count": c.sales_count or 0,
            "total_spent_usd": round(c.total_spent or 0.0, 2)
        }
        for c in clients
    ]
