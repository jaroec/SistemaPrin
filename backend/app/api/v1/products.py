# backend/app/api/v1/products.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.db import models
from app.db.schemas.products import ProductCreate, ProductOut, ProductUpdate
from app.core.security import get_db, role_required
from app.services.movement_service import create_movement
from app.db.models.movement import MovementType

router = APIRouter()


# 🟢 Crear producto
@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "INVENTARIO")),
):
    existing = db.query(models.product.Product).filter(
        models.product.Product.code == payload.code
    ).first()
    if existing:
        raise HTTPException(400, "El código de producto ya existe")

    if payload.profit_margin >= 100:
        raise HTTPException(400, "El margen no puede ser >= 100%")

    sale_price = payload.cost_price / (1 - (payload.profit_margin / 100))

    product = models.product.Product(
        code=payload.code,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        supplier=payload.supplier,
        cost_price=round(payload.cost_price, 2),
        sale_price=round(sale_price, 2),
        profit_margin=round(payload.profit_margin, 2),
        stock=payload.stock or 0,
        min_stock=payload.min_stock or 5,
        is_active=True,
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    if product.stock > 0:
        create_movement(
            db=db,
            movement_type=MovementType.STOCK_IN,
            reference=f"PROD-{product.id}",
            description=f"Ingreso inicial de stock ({product.stock}) - {product.name}",
            user=current_user,
            branch_id=current_user.branch_id,
        )

    return product


# 📋 Listar productos activos
@router.get(
    "/",
    response_model=List[ProductOut],
    summary="Listar productos activos",
    description="Devuelve todos los productos activos del inventario. Se puede incluir inactivos con `active_only=false`."
)
def list_products(
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "CAJERO", "INVENTARIO")),
    active_only: bool = Query(True, description="Filtrar solo productos activos"),
):
    query = db.query(models.product.Product)
    if active_only:
        query = query.filter(models.product.Product.is_active == True)

    products = query.order_by(models.product.Product.id.desc()).all()

    # Recalcular margen real para cada producto antes de devolverlo
    for p in products:
        if p.sale_price and p.cost_price:
            p.profit_margin = round((1 - (p.cost_price / p.sale_price)) * 100, 2)
    return products


# 🔎 Obtener producto por ID
@router.get(
    "/{product_id}",
    response_model=ProductOut,
    summary="Obtener un producto por ID",
    description="Busca y devuelve un producto existente mediante su ID único."
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "CAJERO", "INVENTARIO")),
):
    product = (
        db.query(models.product.Product)
        .filter(models.product.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Calcular margen real
    if product.sale_price and product.cost_price:
        product.profit_margin = round((1 - (product.cost_price / product.sale_price)) * 100, 2)
    return product


# ✏️ Actualizar producto
@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "INVENTARIO")),
):
    product = db.query(models.product.Product).filter(
        models.product.Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(404, "Producto no encontrado")

    old_price = product.sale_price
    old_margin = product.profit_margin

    update_data = payload.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(product, key, value)

    if "cost_price" in update_data or "profit_margin" in update_data:
        cost = product.cost_price
        margin = product.profit_margin

        if margin >= 100:
            raise HTTPException(400, "Margen inválido")

        product.sale_price = round(cost / (1 - (margin / 100)), 2)

    db.commit()
    db.refresh(product)

    if product.sale_price != old_price:
        create_movement(
            db=db,
            movement_type=MovementType.PRICE_CHANGE,
            reference=f"PROD-{product.id}",
            description=f"Precio cambiado de {old_price} a {product.sale_price}",
            user=current_user,
            branch_id=current_user.branch_id,
        )

    if product.profit_margin != old_margin:
        create_movement(
            db=db,
            movement_type=MovementType.MARGIN_CHANGE,
            reference=f"PROD-{product.id}",
            description=f"Margen cambiado de {old_margin}% a {product.profit_margin}%",
            user=current_user,
            branch_id=current_user.branch_id,
        )

    return product

# ⚠️ Productos con bajo stock
@router.get(
    "/alerts/low-stock",
    response_model=List[ProductOut],
    summary="Listar productos con bajo stock",
    description="Devuelve los productos cuyo stock actual es menor o igual al mínimo establecido."
)
def low_stock_alert(
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "INVENTARIO")),
):
    products = (
        db.query(models.product.Product)
        .filter(
            models.product.Product.stock <= models.product.Product.min_stock,
            models.product.Product.is_active == True,
        )
        .order_by(models.product.Product.stock.asc())
        .all()
    )

    # Calcular margen real también aquí
    for p in products:
        if p.sale_price and p.cost_price:
            p.profit_margin = round((1 - (p.cost_price / p.sale_price)) * 100, 2)
    return products


# 🔄 Reabastecer producto
@router.put("/{product_id}/restock", response_model=ProductOut)
def restock_product(
    product_id: int,
    amount: int = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "INVENTARIO")),
):
    product = db.query(models.product.Product).filter(
        models.product.Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(404, "Producto no encontrado")

    product.stock += amount
    db.commit()
    db.refresh(product)

    create_movement(
        db=db,
        movement_type=MovementType.STOCK_IN,
        reference=f"PROD-{product.id}",
        description=f"Ingreso de stock ({amount}) - {product.name}",
        user=current_user,
        branch_id=current_user.branch_id,
    )

    return product

# ❌ Eliminar producto (soft delete)
@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar producto (soft delete)",
    description="Desactiva un producto del inventario sin eliminarlo físicamente."
)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN")),
):
    product = (
        db.query(models.product.Product)
        .filter(models.product.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    product.is_active = False
    db.commit()
    return None

# 📊 Resumen general del inventario
@router.get(
    "/summary",
    summary="Resumen general del inventario",
    description=(
        "Devuelve métricas globales del inventario, incluyendo: "
        "valor total a precio de costo, valor total a precio de venta, "
        "ganancia potencial, cantidad total de productos y alertas por bajo stock."
    ),
)
def get_inventory_summary(
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "INVENTARIO"))
):
    products = db.query(models.product.Product).filter(models.product.Product.is_active == True).all()

    if not products:
        raise HTTPException(status_code=404, detail="No hay productos registrados en el inventario")

    total_cost_value = sum(p.cost_price * p.stock for p in products)
    total_sale_value = sum(p.sale_price * p.stock for p in products)
    total_profit_potential = total_sale_value - total_cost_value
    total_products = len(products)
    low_stock_products = sum(1 for p in products if p.stock <= p.min_stock)

    return {
        "total_products": total_products,
        "low_stock_alerts": low_stock_products,
        "total_cost_value_usd": round(total_cost_value, 2),
        "total_sale_value_usd": round(total_sale_value, 2),
        "total_profit_potential_usd": round(total_profit_potential, 2),
    }
