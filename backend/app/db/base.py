# app/db/base.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Formato CORRECTO para la URL de PostgreSQL
DATABASE_URL = "postgresql://postgres:JAroec16ec%40%2412@localhost:5432/Gestor"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=True  # Para ver las queries en consola (opcional)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
