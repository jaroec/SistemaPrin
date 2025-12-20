# backend/app/db/schemas/client.py
from pydantic import BaseModel
from typing import Optional

class ClientBase(BaseModel):
    name: str
    document: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    credit_limit: float = 0.0

class ClientCreate(ClientBase):
    pass

class ClientOut(ClientBase):
    id: int
    balance: float

    class Config:
        from_attributes = True
