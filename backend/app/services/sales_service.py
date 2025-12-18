
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from app.db.schemas.pos import SaleCreate
from app.db.models import Sale, Product
from app.db.models.sale_detail import SaleDetail
from app.db.models.cash_movement import CashMovement
from datetime import datetime
from app.services.sale_code_service import generate_sale_code
from sqlalchemy.orm import Session
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from app.db import models
from datetime import datetime


def create_sale_service(
    db: Session,
    payload,
    current_user
):
    try:
        with db.begin():

            # 1. Caja abierta
            cash_register = db.query(models.cash_register.CashRegister).filter(
                models.cash_register.CashRegister.status == "OPEN",
                models.cash_register.CashRegister.opened_by_user_id == current_user.id
            ).first()

            if not cash_register:
                raise HTTPException(400, "No hay una caja abierta para este usuario")

            # 2. Cliente
            client = None
            if payload.client_id:
                client = db.get(models.client.Client, payload.client_id)
                if not client:
                    raise HTTPException(404, "Cliente no encontrado")

            # 3. Productos
            subtotal = 0.0
            details_data = []

            for item in payload.items:
                product = db.query(models.product.Product).filter(
                    models.product.Product.id == item.product_id,
                    models.product.Product.is_active == True
                ).with_for_update().first()

                if not product:
                    raise HTTPException(404, f"Producto {item.product_id} no encontrado")

                if product.stock < item.quantity:
                    raise HTTPException(400, f"Stock insuficiente para {product.name}")

                item_subtotal = round(product.sale_price * item.quantity, 2)
                subtotal += item_subtotal
                details_data.append((product, item, item_subtotal))

            discount = payload.discount_usd or 0.0
            total = round(subtotal - discount, 2)

            # 4. Venta
            sale = models.sale.Sale(
                code=generate_sale_code(db),
                client_id=client.id if client else None,
                seller_id=current_user.id,
                subtotal_usd=subtotal,
                discount_usd=discount,
                total_usd=total,
                paid_usd=0.0,
                balance_usd=total,
                status=models.sale.SaleStatus.PENDING,
                created_at=datetime.utcnow()
            )
            db.add(sale)
            db.flush()

            # 5. Detalles + stock
            for product, item, item_subtotal in details_data:
                db.add(models.sale_detail.SaleDetail(
                    sale_id=sale.id,
                    product_id=product.id,
                    quantity=item.quantity,
                    price_usd=product.sale_price,
                    subtotal_usd=item_subtotal
                ))
                product.stock -= item.quantity

            # 6. Pagos + caja
            total_paid = 0.0
            credit_used = 0.0

            for p in payload.payments:
                amount = round(p.amount_usd, 2)
                method = p.method.value.lower()

                payment = models.payment.Payment(
                    sale_id=sale.id,
                    method=method,
                    amount_usd=amount,
                    reference=p.reference
                )
                db.add(payment)
                db.flush()

                if method == "credito":
                    credit_used += amount
                else:
                    total_paid += amount

                    db.add(models.cash_movement.CashMovement(
                        type=models.cash_movement.MovementType.INGRESO,
                        amount_usd=amount,
                        currency="USD",
                        payment_method=method,
                        reference=p.reference,
                        reference_id=sale.id,
                        description=f"Venta {sale.code}",
                        category="VENTA",
                        created_by_user_id=current_user.id,
                        cash_register_id=cash_register.id
                    ))

            sale.paid_usd = total_paid
            sale.balance_usd = round(total - total_paid, 2)

            if sale.balance_usd == 0:
                sale.status = models.sale.SaleStatus.PAID
            elif credit_used > 0:
                sale.status = models.sale.SaleStatus.CREDIT
                if client:
                    client.balance = round((client.balance or 0) + credit_used, 2)

            return sale

    except SQLAlchemyError:
        raise HTTPException(500, "Error procesando la venta")
