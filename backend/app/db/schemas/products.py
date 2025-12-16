# backend/app/db/schemas/products.py
from pydantic import BaseModel, Field, PositiveInt, PositiveFloat, validator
from datetime import datetime
from typing import Optional


class ProductBase(BaseModel):
    code: str = Field(..., example="P-001", min_length=2)
    name: str = Field(..., example="Aceite de motor 5W-30")
    description: Optional[str] = Field(None, example="Lubricante sintético para autos")
    category: Optional[str] = Field(None, example="Lubricantes")
    supplier: Optional[str] = Field(None, example="Proveedor A")
    cost_price: PositiveFloat = Field(..., example=10.5, description="Precio de costo del producto (USD)")
    profit_margin: float = Field(
        ...,
        example=30.0,
        ge=0,
        le=100,
        description="Porcentaje de ganancia sobre el costo (0 a 100)"
    )
    sale_price: Optional[PositiveFloat] = Field(
        None,
        example=15.0,
        description="Precio de venta (se calcula automáticamente si no se envía)"
    )
    stock: PositiveInt = Field(..., example=25)
    min_stock: PositiveInt = Field(5, example=5)
    is_active: bool = Field(True, example=True)

    # 🧮 Cálculo automático del precio de venta
    @validator("sale_price", always=True, pre=True)
    def calculate_sale_price(cls, v, values):
        cost = values.get("cost_price")
        margin = values.get("profit_margin")

        # Si el usuario no envía el precio de venta, se calcula automáticamente
        if v is None and cost is not None and margin is not None:
            try:
                sale_price = cost / (1 - (margin / 100))
                return round(sale_price, 2)
            except ZeroDivisionError:
                return cost
        return v


class ProductCreate(ProductBase):
    """Datos necesarios para crear un producto"""
    pass


class ProductUpdate(BaseModel):
    """Datos opcionales para actualizar un producto"""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    supplier: Optional[str] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    profit_margin: Optional[float] = None
    stock: Optional[int] = None
    min_stock: Optional[int] = None
    is_active: Optional[bool] = None


class ProductOut(ProductBase):
    """Datos devueltos al consultar o listar productos"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    estimated_profit: float = Field(
        0.0,
        example=200.0,
        description="Ganancia total estimada (stock × (precio venta - costo))"
    )

    # 🧮 Calcula automáticamente la ganancia estimada al devolver el producto
    @validator("estimated_profit", always=True)
    def calculate_estimated_profit(cls, v, values):
        cost = values.get("cost_price", 0)
        sale = values.get("sale_price", 0)
        stock = values.get("stock", 0)
        return round((sale - cost) * stock, 2)

    class Config:
        from_attributes = True
