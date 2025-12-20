# backend/app/db/models/sale_detail.py
from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class SaleDetail(Base):
    __tablename__ = "sale_details"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_usd = Column(Float, nullable=False)
    subtotal_usd = Column(Float, nullable=False)

    # Relaciones
    sale = relationship("Sale", back_populates="details")
    product = relationship("Product")