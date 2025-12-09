from sqlalchemy.orm import Session
from app.db.models.exchange_rate import ExchangeRate
from app.db.schemas.exchange_rate import ExchangeRateCreate, ExchangeRateOut
from sqlalchemy import desc

def create_exchange_rate(db: Session, rate: ExchangeRateCreate):
    db_rate = ExchangeRate(
        date=rate.date,
        rate=rate.rate
    )
    db.add(db_rate)
    db.commit()
    db.refresh(db_rate)
    return db_rate

def get_latest_rate(db: Session):
    return db.query(ExchangeRate).order_by(desc(ExchangeRate.date)).first()
