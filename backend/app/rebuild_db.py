# backend/rebuild_db.py
"""
Script para reconstruir la base de datos desde cero.
⚠️ ADVERTENCIA: Este script eliminará TODOS los datos existentes.
"""
import sys
from pathlib import Path

# Agregar el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.base import Base, engine
from app.db import models  # Importar todos los modelos
from seed import seed_admin, seed_test_data

def rebuild_database(include_test_data: bool = False):
    """
    Reconstruye la base de datos desde cero.
    
    Args:
        include_test_data: Si True, crea datos de prueba además del usuario admin
    """
    print("\n" + "="*60)
    print("🗑️  RECONSTRUYENDO BASE DE DATOS")
    print("="*60 + "\n")
    
    # Confirmar acción
    response = input("⚠️  Esto eliminará TODOS los datos. ¿Continuar? (sí/no): ")
    if response.lower() not in ['sí', 'si', 'yes', 's', 'y']:
        print("❌ Operación cancelada.")
        return
    
    try:
        # Eliminar todas las tablas
        print("\n🧹 Eliminando tablas existentes...")
        Base.metadata.drop_all(bind=engine)
        print("✅ Tablas eliminadas")
        
        # Crear nuevas tablas
        print("\n🏗️  Creando nuevas tablas...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas creadas:")
        for table in Base.metadata.sorted_tables:
            print(f"   - {table.name}")
        
        # Crear usuario admin
        print("\n👤 Creando usuario administrador...")
        seed_admin()
        
        # Crear datos de prueba si se solicita
        if include_test_data:
            print("\n🧪 Creando datos de prueba...")
            seed_test_data()
        
        print("\n" + "="*60)
        print("✅ BASE DE DATOS RECONSTRUIDA EXITOSAMENTE")
        print("="*60)
        print("\n📝 Credenciales de acceso:")
        print("   Email: admin@pos.com")
        print("   Password: admin123")
        print("\n🚀 Puedes iniciar el servidor con: uvicorn app.main:app --reload\n")
        
    except Exception as e:
        print(f"\n❌ Error al reconstruir la base de datos: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Verificar si se solicitó incluir datos de prueba
    include_test = "--with-test-data" in sys.argv or "-t" in sys.argv
    
    rebuild_database(include_test_data=include_test)
