from app.db.base import Base
from app.db.base import engine

print("🧹 Eliminando tablas anteriores...")
Base.metadata.drop_all(bind=engine)

print("🧱 Creando nuevas tablas...")
Base.metadata.create_all(bind=engine)

print("✅ Base de datos reconstruida correctamente.")
