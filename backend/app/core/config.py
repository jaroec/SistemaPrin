from pydantic import BaseSettings

class Settings(BaseSettings):
    app_name: str = 'Supersistema de Venta'
    database_url: str = 'postgresql://admin:secret@db:5432/ventas_db'

settings = Settings()
