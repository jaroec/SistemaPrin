# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from seed import seed_admin
from app.api.v1 import products, clients, auth, pos, reports
from app.db.base import Base, engine

# Crear tablas (solo para desarrollo; en producción usar alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Supersistema de Venta",
    version="1.0.0",
    description="Sistema integral de ventas e inventario con autenticación JWT"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ajusta esto en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# Rutas principales
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
app.include_router(clients.router, prefix="/api/v1/clients", tags=["Clients"])
app.include_router(pos.router, prefix="/api/v1/pos", tags=["POS"])
app.include_router(reports.router, prefix="/api/v1/pos", tags=["Reportes"])

# Seed del usuario admin
@app.on_event("startup")
def startup_event():
    print("🟢 Iniciando servidor y verificando usuario admin...")
    seed_admin()


# 🔐 Personalización del esquema OpenAPI (CORREGIDO)
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # CAMBIO CRÍTICO: Usa OAuth2 en lugar de HTTP Bearer
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

    # NO apliques seguridad global aquí - deja que FastAPI lo maneje automáticamente
    # openapi_schema["security"] = [{"OAuth2PasswordBearer": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


# Aplica la documentación personalizada
app.openapi = custom_openapi


@app.get("/")
def root():
    return {"message": "Supersistema de Venta activo 🚀"}