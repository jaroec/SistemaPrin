from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.db import models
from app.db.schemas.products import ProductCreate, ProductOut, ProductUpdate
from app.core.security import get_db, role_required

router = APIRouter()


# 🟢 Crear producto
@router.post(
    "/",
    response_model=ProductOut,
    summary="Crear nuevo producto",
    status_code=status.HTTP_201_CREATED,
    description="Crea un producto nuevo y calcula automáticamente el precio de venta con base en el costo y margen de ganancia."
)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "INVENTARIO"))
):
    """
    Crea un nuevo producto validando que el código no exista
    y calculando el `sale_price` automáticamente con la fórmula contable:
    sale_price = cost_price / (1 - (profit_margin / 100))
    """

    existing = db.query(models.product.Product).filter(
        models.product.Product.code == payload.code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="El código de producto ya existe")

    if payload.profit_margin >= 100:
        raise HTTPException(
            status_code=400,
            detail="El porcentaje de ganancia no puede ser igual o superior al 100%",
        )

    try:
        sale_price = payload.cost_price / (1 - (payload.profit_margin / 100))
    except ZeroDivisionError:
        raise HTTPException(
            status_code=400, detail="El margen de ganancia no puede ser 100% o mayor."
        )

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

    # Calcular margen real de ganancia (en %)
    margin_real = round((1 - (product.cost_price / product.sale_price)) * 100, 2)
    product.profit_margin = margin_real

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
@router.put(
    "/{product_id}",
    response_model=ProductOut,
    summary="Actualizar producto existente",
    description="Permite modificar información del producto. Si se cambia el costo o margen, recalcula automáticamente el precio de venta."
)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "INVENTARIO")),
):
    product = (
        db.query(models.product.Product)
        .filter(models.product.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    update_data = payload.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(product, key, value)

    if "cost_price" in update_data or "profit_margin" in update_data:
        cost = update_data.get("cost_price", product.cost_price)
        margin = update_data.get("profit_margin", product.profit_margin)

        if margin >= 100:
            raise HTTPException(
                status_code=400,
                detail="El porcentaje de ganancia no puede ser igual o superior al 100%",
            )

        try:
            product.sale_price = round(cost / (1 - (margin / 100)), 2)
        except ZeroDivisionError:
            raise HTTPException(
                status_code=400, detail="El margen de ganancia no puede ser 100% o mayor."
            )

    db.commit()
    db.refresh(product)

    # Recalcular margen real actualizado
    if product.sale_price and product.cost_price:
        product.profit_margin = round((1 - (product.cost_price / product.sale_price)) * 100, 2)

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
@router.put(
    "/{product_id}/restock",
    response_model=ProductOut,
    summary="Reabastecer producto (aumentar stock)",
    description="Permite incrementar el stock disponible de un producto específico."
)
def restock_product(
    product_id: int,
    amount: int = Query(..., gt=0, description="Cantidad a agregar al stock"),
    db: Session = Depends(get_db),
    current_user=Depends(role_required("ADMIN", "INVENTARIO")),
):
    product = (
        db.query(models.product.Product)
        .filter(models.product.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    product.stock += amount
    db.commit()
    db.refresh(product)
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
