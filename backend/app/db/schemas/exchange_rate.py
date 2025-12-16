from pydantic import BaseModel
from datetime import date


class ExchangeRateBase(BaseModel):
    rate: float
    date: date


class ExchangeRateCreate(ExchangeRateBase):
    """Schema para crear un nuevo registro de tasa de cambio"""
    pass


class ExchangeRateOut(ExchangeRateBase):
    id: int

    class Config:
        orm_mode = True
