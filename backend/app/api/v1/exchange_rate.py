# backend/app/api/v1/exchange_rates.py - MEJORADO CON HISTORIAL
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from datetime import date
from app.db.base import get_db
from app.db.schemas.exchange_rate import ExchangeRateCreate, ExchangeRateOut
from app.db.models.exchange_rate import ExchangeRate
from app.core.security import get_current_user, role_required
from app.db.models.user import User

router = APIRouter(prefix="/exchange-rate", tags=["Exchange Rate"])

@router.post("/", response_model=ExchangeRateOut)
def create_rate(
    rate: ExchangeRateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required("ADMIN"))
):
    """Crear o actualizar la tasa de cambio del día"""
    # Verificar si ya existe una tasa para hoy
    existing = db.query(ExchangeRate).filter(
        ExchangeRate.date == rate.date
    ).first()
    
    if existing:
        # Actualizar la existente
        existing.rate = rate.rate
        existing.set_by_user_id = current_user.id
        existing.set_by_name = current_user.name or current_user.email
        db.commit()
        db.refresh(existing)
        return existing
    
    # Crear nueva
    new_rate = ExchangeRate(
        rate=rate.rate,
        currency="VES",
        date=rate.date,
        set_by_user_id=current_user.id,
        set_by_name=current_user.name or current_user.email
    )
    db.add(new_rate)
    db.commit()
    db.refresh(new_rate)
    return new_rate


@router.get("/latest", response_model=ExchangeRateOut)
def latest_rate(db: Session = Depends(get_db)):
    """Obtener la tasa más reciente"""
    rate = db.query(ExchangeRate).order_by(desc(ExchangeRate.date)).first()
    
    if not rate:
        raise HTTPException(
            status_code=404,
            detail="No hay tasa de cambio registrada. Por favor configure una."
        )
    
    return rate


@router.get("/today", response_model=ExchangeRateOut)
def today_rate(db: Session = Depends(get_db)):
    """Obtener la tasa de hoy (si existe)"""
    today = date.today()
    rate = db.query(ExchangeRate).filter(
        ExchangeRate.date == today
    ).first()
    
    if not rate:
        # Si no hay tasa de hoy, devolver la más reciente
        rate = db.query(ExchangeRate).order_by(desc(ExchangeRate.date)).first()
        
        if not rate:
            raise HTTPException(
                status_code=404,
                detail="No hay tasa de cambio registrada."
            )
    
    return rate


@router.get("/history", response_model=List[ExchangeRateOut])
def rate_history(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required("ADMIN", "CAJERO"))
):
    """Obtener historial de tasas de cambio"""
    rates = db.query(ExchangeRate).order_by(
        desc(ExchangeRate.date)
    ).limit(limit).all()
    
    return rates


@router.delete("/{rate_id}")
def delete_rate(
    rate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required("ADMIN"))
):
    """Eliminar una tasa de cambio"""
    rate = db.query(ExchangeRate).filter(ExchangeRate.id == rate_id).first()
    
    if not rate:
        raise HTTPException(status_code=404, detail="Tasa no encontrada")
    
    db.delete(rate)
    db.commit()
    
    return {"detail": "Tasa eliminada exitosamente"}
