# backend/app/db/models/__init__.py
from app.db.models.user import User
from app.db.models.client import Client
from app.db.models.product import Product
from app.db.models.sale import Sale
from app.db.models.sale_detail import SaleDetail
from app.db.models.payment import Payment

__all__ = ["User", "Client", "Product", "Sale", "SaleDetail", "Payment"]
