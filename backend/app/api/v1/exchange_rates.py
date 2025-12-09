from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.db.schemas.exchange_rate import ExchangeRateCreate, ExchangeRateOut
from app.crud.exchange_rate import create_exchange_rate, get_latest_rate

router = APIRouter(prefix="/exchange-rate", tags=["Exchange Rate"])

@router.post("/", response_model=ExchangeRateOut)
def create_rate(rate: ExchangeRateCreate, db: Session = Depends(get_db)):
    return create_exchange_rate(db, rate)

@router.get("/latest", response_model=ExchangeRateOut)
def latest_rate(db: Session = Depends(get_db)):
    return get_latest_rate(db)
