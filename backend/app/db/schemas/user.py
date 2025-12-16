# backend/app/db/schemas/user.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str]
    role: str = "CAJERO"

class UserOut(BaseModel):
    id: int
    email: str
    name: Optional[str]
    role: str
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str]
    role: str = "CAJERO"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    sub: Optional[str] = None
