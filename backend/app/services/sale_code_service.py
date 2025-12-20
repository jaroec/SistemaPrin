from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import models
from datetime import datetime

def generate_sale_code(db: Session) -> str:
    today = datetime.utcnow().strftime("%Y%m%d")

    last_sale = db.query(models.sale.Sale).filter(
        func.date(models.sale.Sale.created_at) == datetime.utcnow().date()
    ).order_by(models.sale.Sale.id.desc()).with_for_update().first()

    last_seq = int(last_sale.code.split("-")[-1]) if last_sale else 0
    return f"VTA-{today}-{last_seq + 1:04d}"
