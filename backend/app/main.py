# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from seed import seed_admin
from app.api.v1 import products, clients, auth, pos, reports, search, dashboard, exchange_rate
from app.db.base import Base, engine

# Crear tablas (solo para desarrollo; en producción usar alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Supersistema de Venta",
    version="2.0.0",
    description="Sistema integral de ventas POS con gestión de inventario, clientes y reportes"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization"],
)

# Rutas principales
app.include_router(auth.router, prefix="/api/v1/auth", tags=["🔐 Autenticación"])
app.include_router(search.router, prefix="/api/v1", tags=["🔍 Búsqueda"])
app.include_router(products.router, prefix="/api/v1/products", tags=["📦 Productos"])
app.include_router(clients.router, prefix="/api/v1/clients", tags=["👥 Clientes"])
app.include_router(pos.router, prefix="/api/v1/pos", tags=["🛒 Punto de Venta"])
app.include_router(reports.router, prefix="/api/v1", tags=["📊 Reportes"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["📈 Dashboard"])
app.include_router(exchange_rate.router, prefix="/api/v1", tags=["💱 Tasa de Cambio"])

# Seed del usuario admin
@app.on_event("startup")
def startup_event():
    print("🟢 Iniciando servidor y verificando usuario admin...")
    seed_admin()


# ✅ CONFIGURACIÓN OPENAPI CORREGIDA
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # ✅ Configuración correcta de seguridad OAuth2
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

    # ✅ Aplicar seguridad globalmente (todos los endpoints protegidos por defecto)
    openapi_schema["security"] = [{"OAuth2PasswordBearer": []}]

    # ✅ Excepciones: endpoints públicos (no requieren auth)
    public_paths = [
        "/api/v1/auth/token",
        "/api/v1/auth/register",
        "/api/v1/exchange-rate/today",  # ✅ Público para el POS
        "/",
        "/health",
        "/docs",
        "/openapi.json"
    ]

    for path, methods in openapi_schema["paths"].items():
        if path in public_paths:
            for method in methods.values():
                if isinstance(method, dict):
                    method["security"] = []  # Sin autenticación

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi


@app.get("/")
def root():
    return {
        "message": "Supersistema de Venta API v2.0",
        "status": "active",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "pos-backend"}
