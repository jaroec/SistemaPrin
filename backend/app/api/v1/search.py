# backend/app/api/v1/search.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Any, Dict

from app.core.security import get_db, role_required
from app.db import models
from app.db.schemas.products import ProductOut
import logging

router = APIRouter()
logger = logging.getLogger("app.search")

def orm_to_dict(obj: Any) -> Dict[str, Any]:
    """
    Convierte un objeto ORM a dict usando las columnas de la tabla.
    Evita depender de from_orm, es más seguro para respuestas dinámicas.
    """
    data: Dict[str, Any] = {}

    if hasattr(obj, "__table__"):
        for col in obj.__table__.columns:
            data[col.name] = getattr(obj, col.name)
    else:
        data = {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}

    return data


# ============================================================
# 🔍 RUTA DE BÚSQUEDA — DEBE IR *ANTES* DE /products/{id}
# ============================================================
@router.get("/products/search", response_model=List[ProductOut])
def search_products(
    q: Optional[str] = Query(None, min_length=1, description="Término: código, nombre o categoría"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN", "INVENTARIO"))
):
    """
    Búsqueda rápida para el POS.
    Compatible con ProductOut.
    """
    try:
        # Normalizar q
        if q is not None:
            q = str(q).strip()
            if q == "":
                q = None

        # Sin query → productos recientes
        if not q:
            products = (
                db.query(models.product.Product)
                .filter(models.product.Product.is_active == True)
                .order_by(models.product.Product.id.desc())
                .limit(limit)
                .all()
            )
        else:
            search_term = f"%{q}%"
            products = (
                db.query(models.product.Product)
                .filter(
                    models.product.Product.is_active == True,
                    or_(
                        models.product.Product.code.ilike(search_term),
                        models.product.Product.name.ilike(search_term),
                        models.product.Product.category.ilike(search_term),
                    )
                )
                .limit(limit)
                .all()
            )

        # Formar respuesta compatible con ProductOut
        results = []
        for p in products:
            row = orm_to_dict(p)

            # Calcular profit margin
            try:
                cost_price = row.get("cost_price")
                sale_price = row.get("sale_price")

                if sale_price and cost_price and sale_price > 0:
                    row["profit_margin"] = round((1 - (cost_price / sale_price)) * 100, 2)
                else:
                    row["profit_margin"] = None

            except Exception as e:
                logger.debug(f"No se pudo calcular profit_margin para ID={row.get('id')}: {e}")
                row["profit_margin"] = None

            results.append(row)

        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en search_products: %s", e)
        raise HTTPException(status_code=500, detail="Error interno en el buscador")


# ============================================================
# 🔍 BÚSQUEDA POR CÓDIGO DE BARRAS
# ============================================================
@router.get("/products/barcode/{barcode}", response_model=ProductOut)
def get_product_by_barcode(
    barcode: str,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN", "INVENTARIO"))
):
    if not barcode.strip():
        raise HTTPException(status_code=400, detail="El código de barras no puede estar vacío")

    product = (
        db.query(models.product.Product)
        .filter(
            models.product.Product.code == barcode.strip(),
            models.product.Product.is_active == True
        )
        .first()
    )

    if not product:
        raise HTTPException(status_code=404, detail=f"Producto '{barcode}' no encontrado")

    row = orm_to_dict(product)

    sale = row.get("sale_price")
    cost = row.get("cost_price")
    row["profit_margin"] = (
        round((1 - (cost / sale)) * 100, 2) if sale and cost and sale > 0 else None
    )

    return row


# ============================================================
# 🔍 BÚSQUEDA POR CATEGORÍA
# ============================================================
@router.get("/products/category/{category}", response_model=List[ProductOut])
def get_products_by_category(
    category: str,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("CAJERO", "ADMIN", "INVENTARIO"))
):
    products = (
        db.query(models.product.Product)
        .filter(
            models.product.Product.category == category,
            models.product.Product.is_active == True
        )
        .limit(limit)
        .all()
    )

    results = []
    for p in products:
        row = orm_to_dict(p)
        sale = row.get("sale_price")
        cost = row.get("cost_price")
        row["profit_margin"] = (
            round((1 - (cost / sale)) * 100, 2) if sale and cost and sale > 0 else None
        )
        results.append(row)

    return results
