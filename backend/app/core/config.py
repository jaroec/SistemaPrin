import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Base de Datos
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_PRE_PING: bool = True
    DB_ECHO: bool = False
    
    # Seguridad
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    CORS_CREDENTIALS: bool = True
    
    # Caché
    CACHE_TTL: int = 3600
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Ambiente
    ENVIRONMENT: str = "development"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    @property
    def get_allowed_origins(self) -> List[str]:
        """Retorna lista de orígenes permitidos"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    @property
    def is_production(self) -> bool:
        """Verifica si está en producción"""
        return self.ENVIRONMENT == "production"
    
    def validate_settings(self):
        """Valida configuraciones críticas"""
        if len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY debe tener mínimo 32 caracteres")
        
        if self.is_production and not self.DATABASE_URL.startswith("postgresql://"):
            raise ValueError("En producción SOLO usar PostgreSQL")
        
        return True

settings = Settings()
settings.validate_settings()
