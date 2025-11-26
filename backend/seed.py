from app.db.base import SessionLocal
from app.db.models.user import User
from app.db.models.product import Product
from app.db.models.client import Client
from app.core.security import get_password_hash
from sqlalchemy.exc import IntegrityError


def seed_admin():
    """Crea usuario admin por defecto"""
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@pos.com").first()
        if existing:
            print("✅ Usuario admin ya existe:", existing.email)
            return

        admin = User(
            email="admin@pos.com",
            name="Administrador",
            password_hash=get_password_hash("admin123"),
            role="ADMIN",
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("🎉 Usuario admin creado: admin@pos.com / admin123")
    except IntegrityError:
        db.rollback()
        print("⚠️ Error al crear admin")
    finally:
        db.close()


def seed_test_data():
    """Crea datos de prueba para desarrollo"""
    db = SessionLocal()
    try:
        # Crear cajero de prueba
        if not db.query(User).filter(User.email == "cajero@pos.com").first():
            cajero = User(
                email="cajero@pos.com",
                name="Cajero Prueba",
                password_hash=get_password_hash("cajero123"),
                role="CAJERO",
                is_active=True
            )
            db.add(cajero)
            print("✅ Cajero de prueba creado: cajero@pos.com / cajero123")

        # Crear productos de prueba
        if db.query(Product).count() == 0:
            products = [
                Product(
                    code="P001",
                    name="Coca Cola 2L",
                    category="Bebidas",
                    cost_price=1.50,
                    sale_price=2.50,
                    profit_margin=40.0,
                    stock=100,
                    min_stock=10
                ),
                Product(
                    code="P002",
                    name="Pan Blanco",
                    category="Panadería",
                    cost_price=0.80,
                    sale_price=1.20,
                    profit_margin=33.33,
                    stock=50,
                    min_stock=20
                ),
                Product(
                    code="P003",
                    name="Leche 1L",
                    category="Lácteos",
                    cost_price=1.20,
                    sale_price=2.00,
                    profit_margin=40.0,
                    stock=75,
                    min_stock=15
                ),
            ]
            db.add_all(products)
            print("✅ Productos de prueba creados")

        # Crear cliente de prueba
        if not db.query(Client).filter(Client.name == "Cliente General").first():
            client = Client(
                name="Cliente General",
                phone="+58 424-1234567",
                credit_limit=100.0
            )
            db.add(client)
            print("✅ Cliente de prueba creado")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"⚠️ Error al crear datos de prueba: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
    seed_test_data()
