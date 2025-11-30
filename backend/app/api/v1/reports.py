# backend/app/api/v1/reports.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, date, timedelta
from app.core.security import get_db, role_required
from app.db import models

router = APIRouter()


@router.get("/reports/products/top-selling")
def top_selling_products(
    limit: int = Query(10, le=100),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "CAJERO"))
):
    """Productos más vendidos"""
    query = db.query(
        models.sale_detail.SaleDetail.product_id,
        models.product.Product.name,
        func.sum(models.sale_detail.SaleDetail.quantity).label('total_quantity'),
        func.sum(models.sale_detail.SaleDetail.subtotal_usd).label('total_revenue'),
        func.count(models.sale_detail.SaleDetail.sale_id).label('sales_count')
    ).join(
        models.product.Product,
        models.sale_detail.SaleDetail.product_id == models.product.Product.id
    ).join(
        models.sale.Sale,
        models.sale_detail.SaleDetail.sale_id == models.sale.Sale.id
    ).filter(
        models.sale.Sale.status != "ANULADO"
    )
    
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        query = query.filter(func.date(models.sale.Sale.created_at) >= start)
    
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        query = query.filter(func.date(models.sale.Sale.created_at) <= end)
    
    results = query.group_by(
        models.sale_detail.SaleDetail.product_id,
        models.product.Product.name
    ).order_by(
        desc('total_quantity')
    ).limit(limit).all()
    
    return [
        {
            "product_id": r.product_id,
            "product_name": r.name,
            "total_quantity": r.total_quantity,
            "total_revenue_usd": round(r.total_revenue, 2),
            "sales_count": r.sales_count
        }
        for r in results
    ]


@router.get("/reports/sellers/performance")
def seller_performance(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN"))
):
    """Rendimiento de vendedores"""
    query = db.query(
        models.sale.Sale.seller_id,
        models.user.User.username,
        func.count(models.sale.Sale.id).label('total_sales'),
        func.sum(models.sale.Sale.total_usd).label('total_revenue'),
        func.avg(models.sale.Sale.total_usd).label('avg_sale')
    ).join(
        models.user.User,
        models.sale.Sale.seller_id == models.user.User.id
    ).filter(
        models.sale.Sale.status != "ANULADO"
    )
    
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        query = query.filter(func.date(models.sale.Sale.created_at) >= start)
    
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        query = query.filter(func.date(models.sale.Sale.created_at) <= end)
    
    results = query.group_by(
        models.sale.Sale.seller_id,
        models.user.User.username
    ).order_by(
        desc('total_revenue')
    ).all()
    
    return [
        {
            "seller_id": r.seller_id,
            "seller_name": r.username,
            "total_sales": r.total_sales,
            "total_revenue_usd": round(r.total_revenue, 2),
            "avg_sale_usd": round(r.avg_sale, 2)
        }
        for r in results
    ]


@router.get("/reports/daily-cash-flow")
def daily_cash_flow(
    days: int = Query(7, le=90),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN"))
):
    """Flujo de caja diario por método de pago"""
    start_date = date.today() - timedelta(days=days)
    
    # Subconsulta para pagos por método
    payments_by_method = db.query(
        func.date(models.sale.Sale.created_at).label('sale_date'),
        models.payment.Payment.method,
        func.sum(models.payment.Payment.amount_usd).label('amount')
    ).join(
        models.payment.Payment,
        models.sale.Sale.id == models.payment.Payment.sale_id
    ).filter(
        func.date(models.sale.Sale.created_at) >= start_date,
        models.sale.Sale.status != "ANULADO"
    ).group_by(
        'sale_date',
        models.payment.Payment.method
    ).all()
    
    # Agrupar por fecha
    daily_data = {}
    for row in payments_by_method:
        date_str = row.sale_date.strftime("%Y-%m-%d")
        if date_str not in daily_data:
            daily_data[date_str] = {
                "date": date_str,
                "cash_usd": 0.0,
                "transfer_usd": 0.0,
                "pago_movil_usd": 0.0,
                "divisas_usd": 0.0,
                "total_usd": 0.0
            }
        
        method = row.method.upper()
        amount = round(row.amount, 2)
        
        if method == "EFECTIVO":
            daily_data[date_str]["cash_usd"] += amount
        elif method == "TRANSFERENCIA":
            daily_data[date_str]["transfer_usd"] += amount
        elif method == "PAGO_MOVIL":
            daily_data[date_str]["pago_movil_usd"] += amount
        elif method == "DIVISAS":
            daily_data[date_str]["divisas_usd"] += amount
        
        daily_data[date_str]["total_usd"] += amount
    
    # Ordenar por fecha
    return sorted(daily_data.values(), key=lambda x: x["date"], reverse=True)


@router.get("/reports/inventory-movement")
def inventory_movement(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN"))
):
    """Movimiento de inventario por ventas"""
    query = db.query(
        models.product.Product.id,
        models.product.Product.name,
        models.product.Product.stock.label('current_stock'),
        func.sum(models.sale_detail.SaleDetail.quantity).label('sold_quantity')
    ).join(
        models.sale_detail.SaleDetail,
        models.product.Product.id == models.sale_detail.SaleDetail.product_id
    ).join(
        models.sale.Sale,
        models.sale_detail.SaleDetail.sale_id == models.sale.Sale.id
    ).filter(
        models.sale.Sale.status != "ANULADO"
    )
    
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        query = query.filter(func.date(models.sale.Sale.created_at) >= start)
    
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        query = query.filter(func.date(models.sale.Sale.created_at) <= end)
    
    results = query.group_by(
        models.product.Product.id,
        models.product.Product.name,
        models.product.Product.stock
    ).order_by(
        desc('sold_quantity')
    ).all()
    
    return [
        {
            "product_id": r.id,
            "product_name": r.name,
            "current_stock": r.current_stock,
            "sold_quantity": r.sold_quantity,
            "status": "LOW_STOCK" if r.current_stock < 10 else "OK"
        }
        for r in results
    ]


@router.get("/reports/client-purchases")
def client_purchases(
    client_id: Optional[int] = None,
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "CAJERO"))
):
    """Historial de compras por cliente"""
    query = db.query(
        models.client.Client.id,
        models.client.Client.name,
        func.count(models.sale.Sale.id).label('total_purchases'),
        func.sum(models.sale.Sale.total_usd).label('total_spent'),
        func.sum(models.sale.Sale.balance_usd).label('total_pending'),
        func.max(models.sale.Sale.created_at).label('last_purchase')
    ).join(
        models.sale.Sale,
        models.client.Client.id == models.sale.Sale.client_id
    ).filter(
        models.sale.Sale.status != "ANULADO"
    )
    
    if client_id:
        query = query.filter(models.client.Client.id == client_id)
    
    results = query.group_by(
        models.client.Client.id,
        models.client.Client.name
    ).order_by(
        desc('total_spent')
    ).limit(limit).all()
    
    return [
        {
            "client_id": r.id,
            "client_name": r.name,
            "total_purchases": r.total_purchases,
            "total_spent_usd": round(r.total_spent, 2),
            "total_pending_usd": round(r.total_pending, 2),
            "last_purchase": r.last_purchase.isoformat()
        }
        for r in results
    ]


@router.get("/reports/sales-by-hour")
def sales_by_hour(
    date_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN"))
):
    """Ventas por hora del día"""
    query = db.query(
        func.extract('hour', models.sale.Sale.created_at).label('hour'),
        func.count(models.sale.Sale.id).label('sales_count'),
        func.sum(models.sale.Sale.total_usd).label('total_revenue')
    ).filter(
        models.sale.Sale.status != "ANULADO"
    )
    
    if date_filter:
        target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
        query = query.filter(func.date(models.sale.Sale.created_at) == target_date)
    else:
        # Por defecto, hoy
        query = query.filter(func.date(models.sale.Sale.created_at) == date.today())
    
    results = query.group_by('hour').order_by('hour').all()
    
    return [
        {
            "hour": int(r.hour),
            "sales_count": r.sales_count,
            "total_revenue_usd": round(r.total_revenue, 2)
        }
        for r in results
    ]
