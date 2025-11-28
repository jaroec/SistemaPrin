# backend/app/api/v1/search.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from app.core.security import get_db, role_required
from app.db import models
from app.db.schemas.products import ProductOut

router = APIRouter()


@router.get("/products/search", response_model=List[ProductOut])
def search_products(
    q: str = Query(..., min_length=1, description="Término de búsqueda (código, nombre o categoría)"),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN", "INVENTARIO"))
):
    """
    Búsqueda rápida de productos para el POS.
    Busca en código, nombre y categoría.
    """
    search_term = f"%{q}%"
    
    products = db.query(models.product.Product).filter(
        models.product.Product.is_active == True,
        or_(
            models.product.Product.code.ilike(search_term),
            models.product.Product.name.ilike(search_term),
            models.product.Product.category.ilike(search_term)
        )
    ).limit(limit).all()
    
    # Calcular margen real
    for p in products:
        if p.sale_price and p.cost_price:
            p.profit_margin = round((1 - (p.cost_price / p.sale_price)) * 100, 2)
    
    return products


@router.get("/products/barcode/{barcode}", response_model=ProductOut)
def get_product_by_barcode(
    barcode: str,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN", "INVENTARIO"))
):
    """
    Buscar producto por código de barras.
    """
    product = db.query(models.product.Product).filter(
        models.product.Product.code == barcode,
        models.product.Product.is_active == True
    ).first()
    
    if not product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if product.sale_price and product.cost_price:
        product.profit_margin = round((1 - (product.cost_price / product.sale_price)) * 100, 2)
    
    return product
