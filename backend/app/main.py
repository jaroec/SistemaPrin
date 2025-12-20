from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from slowapi import Limiter
from slowapi.util import get_remote_address
from contextlib import asynccontextmanager
import logging

from seed import seed_admin

from app.db.base import Base, engine
from app.core.config import settings

# Routers API v1 (IMPORTS LIMPIOS Y REALES)
from app.api.v1 import (
    auth,
    products,
    clients,
    pos,
    expenses,
    exports,
    dashboard_financial,
    reports,
    dashboard,
    cash_register,
    movements,
    search,
    exchange_rate,
    cash_flow,
    users,
)


logger = logging.getLogger(__name__)

# Crear tablas
Base.metadata.create_all(bind=engine)

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# Startup event
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🟢 Iniciando servidor...")
    seed_admin()
    yield
    logger.info("🔴 Apagando servidor...")

# Crear app
app = FastAPI(
    title="Sistema POS - Gestor de Ventas",
    version="2.1.0",
    description="Sistema integral de ventas POS con gestión de inventario",
    lifespan=lifespan
)

# ==========================================
# MIDDLEWARE
# ==========================================

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter

# ==========================================
# RUTAS
# ==========================================
app.include_router(users.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1/auth", tags=["🔐 Autenticación"])
app.include_router(search.router, prefix="/api/v1", tags=["🔍 Búsqueda"])
app.include_router(products.router, prefix="/api/v1/products", tags=["📦 Productos"])
app.include_router(clients.router, prefix="/api/v1/clients", tags=["👥 Clientes"])
app.include_router(pos.router, prefix="/api/v1/pos", tags=["🛒 Punto de Venta"])
app.include_router(reports.router, prefix="/api/v1", tags=["📊 Reportes"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["📈 Dashboard"])
app.include_router(exchange_rate.router, prefix="/api/v1", tags=["💱 Tasa de Cambio"])
app.include_router(cash_flow.router, prefix="/api/v1/cash-flow", tags=["💰 Flujo de Caja"])
app.include_router(expenses.router, prefix="/api/v1", tags=["💰 Gastos"])
app.include_router( exports.router, prefix="/api/v1", tags=["📤 Exportaciones"])
app.include_router(dashboard_financial.router, prefix="/api/v1", tags=["📊 Dashboard Financiero"])
app.include_router(cash_register.router, prefix="/api/v1")
app.include_router(movements.router, prefix="/api/v1", tags=["Movements"])

# ==========================================
# OPENAPI SECURITY
# ==========================================

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    openapi_schema["components"]["securitySchemes"] = {
        "OAuth2PasswordBearer": {
            "type": "oauth2",
            "flows": {
                "password": {
                    "tokenUrl": "/api/v1/auth/token",
                    "scopes": {}
                }
            }
        }
    }

    openapi_schema["security"] = [{"OAuth2PasswordBearer": []}]

    public_paths = [
        "/api/v1/auth/token",
        "/api/v1/auth/register",
        "/api/v1/exchange-rate/today",
        "/",
        "/health",
        "/docs",
        "/openapi.json"
    ]

    for path, methods in openapi_schema["paths"].items():
        if path in public_paths:
            for method in methods.values():
                if isinstance(method, dict):
                    method["security"] = []

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# ==========================================
# ENDPOINTS PÚBLICOS
# ==========================================

@app.get("/", tags=["📋 Health"])
def root():
    return {
        "message": "Sistema POS v2.1.0",
        "status": "activo",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs"
    }

@app.get("/health", tags=["📋 Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "pos-backend",
        "environment": settings.ENVIRONMENT
    }
