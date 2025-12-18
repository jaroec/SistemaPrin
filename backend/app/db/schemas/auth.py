from pydantic import BaseModel, EmailStr, Field
from app.db.schemas.user import UserOut

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., example="admin@pos.com")
    password: str = Field(..., min_length=6, example="123456")
