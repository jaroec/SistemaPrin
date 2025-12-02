# backend/app/db/models/revoked_token.py
from sqlalchemy import Column, Integer, String, DateTime
from app.db.base import Base
from sqlalchemy.sql import func

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(2000), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
