# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from seed import seed_admin
from app.api.v1 import products, clients, auth, pos, reports, search, dashboard
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
app.include_router(products.router, prefix="/api/v1/products", tags=["📦 Productos"])
app.include_router(clients.router, prefix="/api/v1/clients", tags=["👥 Clientes"])
app.include_router(pos.router, prefix="/api/v1/pos", tags=["🛒 Punto de Venta"])
app.include_router(reports.router, prefix="/api/v1", tags=["📊 Reportes"])
app.include_router(search.router, prefix="/api/v1", tags=["🔍 Búsqueda"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["📈 Dashboard"])

# Seed del usuario admin
@app.on_event("startup")
def startup_event():
    print("🟢 Iniciando servidor y verificando usuario admin...")
    seed_admin()


# Personalización del esquema OpenAPI
# Personalización del esquema OpenAPI - VERSIÓN MEJORADA
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Configuración de seguridad
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }

    # 🔧 APLICAR SEGURIDAD A RUTAS PROTEGIDAS
    protected_paths = [
        "/api/v1/auth/me",
        "/api/v1/products/",
        "/api/v1/clients/", 
        "/api/v1/pos/",
        # Agrega aquí otras rutas que requieran autenticación
    ]
    
    for path, methods in openapi_schema["paths"].items():
        for method, details in methods.items():
            # Si la ruta está en la lista de protegidas o contiene "auth/me"
            if any(protected_path in path for protected_path in protected_paths):
                if "security" not in details:
                    details["security"] = [{"BearerAuth": []}]

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

