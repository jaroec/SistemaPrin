# backend/app/services/sale_service.py

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from datetime import datetime

from app.db import models
from app.services.movement_service import create_movement
from app.db.models.movement import MovementType
from app.services.sale_code_service import generate_sale_code
from app.db.models.payment_enums import PaymentMethod, Currency


def create_sale_service(
    db: Session,
    payload,
    current_user
):
    try:
        with db.begin():

            # =====================================================
            # 1. Caja abierta
            # =====================================================
            cash_register = db.query(models.cash_register.CashRegister).filter(
                models.cash_register.CashRegister.status == "OPEN",
                models.cash_register.CashRegister.opened_by_user_id == current_user.id
            ).first()

            if not cash_register:
                raise HTTPException(400, "No hay una caja abierta para este usuario")

            # =====================================================
            # 2. Cliente
            # =====================================================
            client = None
            if payload.client_id:
                client = db.get(models.client.Client, payload.client_id)
                if not client:
                    raise HTTPException(404, "Cliente no encontrado")

            # =====================================================
            # 3. Productos y subtotal
            # =====================================================
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

            discount = round(payload.discount_usd or 0.0, 2)
            total = round(subtotal - discount, 2)

            if total <= 0:
                raise HTTPException(400, "El total de la venta no es válido")

            # =====================================================
            # 4. Crear venta
            # =====================================================
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

            # =====================================================
            # 5. Detalles y stock
            # =====================================================
            for product, item, item_subtotal in details_data:
                db.add(models.sale_detail.SaleDetail(
                    sale_id=sale.id,
                    product_id=product.id,
                    quantity=item.quantity,
                    price_usd=product.sale_price,
                    subtotal_usd=item_subtotal
                ))
                product.stock -= item.quantity

            # =====================================================
            # 6. Pagos (OPCIÓN B)
            # =====================================================
            total_paid = 0.0
            credit_used = 0.0

            if not payload.payments:
                raise HTTPException(400, "Debe registrar al menos un pago")

            for p in payload.payments:
                amount = round(p.amount_usd, 2)

                if amount <= 0:
                    raise HTTPException(400, "Monto de pago inválido")

                method: PaymentMethod = p.method

                payment = models.payment.Payment(
                    sale_id=sale.id,
                    method=method,
                    currency=Currency.USD,
                    amount=amount,
                    amount_usd=amount,
                    reference_number=p.reference
                )
                db.add(payment)
                db.flush()

                # -------------------------
                # CRÉDITO
                # -------------------------
                if method == PaymentMethod.CREDITO:
                    if not client:
                        raise HTTPException(400, "Cliente requerido para ventas a crédito")
                    credit_used += amount

                # -------------------------
                # EFECTIVO (CAJA)
                # -------------------------
                elif method in (
                    PaymentMethod.EFECTIVO,
                    PaymentMethod.DIVISA_EFECTIVO,
                ):
                    total_paid += amount

                    db.add(models.cash_movement.CashMovement(
                        type=models.cash_movement.MovementType.INGRESO,
                        amount=amount,
                        amount_usd=amount,
                        currency="USD",
                        payment_method=method.value,
                        reference=p.reference,
                        reference_id=sale.id,
                        description=f"Venta {sale.code}",
                        category="VENTA",
                        created_by_user_id=current_user.id,
                        cash_register_id=cash_register.id,
                        created_at=datetime.utcnow()
                    ))

                # -------------------------
                # NO CAJA (BANCOS / DIGITAL)
                # -------------------------
                else:
                    total_paid += amount

            # =====================================================
            # 7. Estado de la venta
            # =====================================================
            sale.paid_usd = round(total_paid, 2)
            sale.balance_usd = round(total - total_paid, 2)

            if sale.balance_usd <= 0:
                sale.status = models.sale.SaleStatus.PAID
                sale.balance_usd = 0.0

            elif credit_used > 0:
                sale.status = models.sale.SaleStatus.CREDIT
                client.balance = round((client.balance or 0) + credit_used, 2)

            # =====================================================
            # 8. Movimiento general
            # =====================================================
            create_movement(
                db=db,
                movement_type=MovementType.SALE,
                reference=f"SALE-{sale.id}",
                description=f"Venta {sale.code} registrada por {current_user.name}",
                amount_usd=sale.total_usd,
                user=current_user,
                branch_id=current_user.branch_id,
            )

            return sale

    except SQLAlchemyError:
        raise HTTPException(500, "Error procesando la venta")
