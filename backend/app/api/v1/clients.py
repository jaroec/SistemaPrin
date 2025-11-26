# backend/app/api/v1/clients.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.db.base import SessionLocal
from sqlalchemy.orm import Session
from app.db.schemas.client import ClientCreate, ClientOut
from app.db import models

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[ClientOut])
def list_clients(db: Session = Depends(get_db)):
    return db.query(models.client.Client).all()

@router.post("/", response_model=ClientOut)
def create_client(payload: ClientCreate, db: Session = Depends(get_db)):
    c = models.client.Client(**payload.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c
