# backend/app/services/cash_flow_service.py
"""
Servicio para gestión de flujo de caja
Maneja la lógica de negocio y eventos automáticos
"""
from sqlalchemy.orm import Session
from app.db import models
from typing import List


class CashFlowService:
    """
    Servicio centralizado para flujo de caja
    """
    
    @staticmethod
    def create_movements_from_sale(
        db: Session,
        sale: models.sale.Sale,
        user_id: int,
        user_name: str
    ) -> List[models.cash_movement.CashMovement]:
        """
        Crea movimientos de caja automáticamente desde una venta
        
        Reglas:
        - Un movimiento por cada pago registrado
        - Pagos de tipo CREDITO NO generan movimiento (no es dinero real)
        - Cada movimiento tiene referencia a la venta
        """
        movements = []
        
        for payment in sale.payments:
            # ✅ SKIP CREDITO - No es movimiento real de caja
            if payment.method.upper() == "CREDITO":
                continue
            
            # Crear movimiento de ingreso
            movement = models.cash_movement.CashMovement(
                type=models.cash_movement.MovementType.INGRESO,
                origin=models.cash_movement.MovementOrigin.VENTA,
                amount_usd=round(payment.amount_usd, 2),
                payment_method=payment.method.upper(),
                description=f"Venta {sale.code} - Cliente: {sale.client.name if sale.client else 'Público General'}",
                category="VENTAS",
                notes=payment.reference,
                reference_id=str(sale.id),
                reference_code=sale.code,
                created_by_user_id=user_id,
                created_by_name=user_name,
                status=models.cash_movement.MovementStatus.CONFIRMADO,
            )
            db.add(movement)
            movements.append(movement)
        
        return movements
    
    
    @staticmethod
    def annul_movements_from_sale(
        db: Session,
        sale: models.sale.Sale,
        user_id: int,
        user_name: str
    ) -> List[models.cash_movement.CashMovement]:
        """
        Anula movimientos de caja al anular una venta
        
        Estrategia:
        - NO borramos los movimientos originales (auditoría)
        - Creamos movimientos de REVERSO con monto negativo
        - Estado ANULADO en los movimientos originales
        """
        # Buscar movimientos de esta venta
        original_movements = db.query(models.cash_movement.CashMovement).filter(
            models.cash_movement.CashMovement.reference_id == str(sale.id),
            models.cash_movement.CashMovement.origin == models.cash_movement.MovementOrigin.VENTA,
            models.cash_movement.CashMovement.status == models.cash_movement.MovementStatus.CONFIRMADO
        ).all()
        
        reversed_movements = []
        
        for movement in original_movements:
            # Marcar original como anulado
            movement.status = models.cash_movement.MovementStatus.ANULADO
            
            # Crear movimiento de reverso (egreso para cancelar ingreso)
            reverso = models.cash_movement.CashMovement(
                type=models.cash_movement.MovementType.EGRESO,  # Reverso
                origin=models.cash_movement.MovementOrigin.AJUSTE,
                amount_usd=movement.amount_usd,
                payment_method=movement.payment_method,
                description=f"REVERSO: Anulación de venta {sale.code}",
                category="AJUSTES",
                notes=f"Anula movimiento #{movement.id}",
                reference_id=str(sale.id),
                reference_code=f"REV-{sale.code}",
                created_by_user_id=user_id,
                created_by_name=user_name,
                status=models.cash_movement.MovementStatus.CONFIRMADO,
            )
            db.add(reverso)
            reversed_movements.append(reverso)
        
        return reversed_movements
    
    
    @staticmethod
    def create_movement_from_expense(
        db: Session,
        expense: models.expense.Expense,
        user_id: int,
        user_name: str
    ) -> models.cash_movement.CashMovement:
        """
        Crea movimiento de caja desde un egreso
        """
        # Mapear categoría de expense a origin de movement
        origin_map = {
            "NOMINA": models.cash_movement.MovementOrigin.NOMINA,
            "SERVICIOS": models.cash_movement.MovementOrigin.SERVICIO,
            "PROVEEDORES": models.cash_movement.MovementOrigin.PROVEEDOR,
            "MATERIA_PRIMA": models.cash_movement.MovementOrigin.COMPRA_MATERIA_PRIMA,
        }
        
        origin = origin_map.get(
            expense.category, 
            models.cash_movement.MovementOrigin.OTRO
        )
        
        movement = models.cash_movement.CashMovement(
            type=models.cash_movement.MovementType.EGRESO,
            origin=origin,
            amount_usd=round(expense.amount_usd, 2),
            payment_method=expense.payment_method,
            description=f"{expense.category}: {expense.description}",
            category=expense.category,
            notes=expense.notes,
            reference_id=str(expense.id),
            reference_code=expense.code,
            created_by_user_id=user_id,
            created_by_name=user_name,
            status=models.cash_movement.MovementStatus.CONFIRMADO,
        )
        db.add(movement)
        return movement
    
    
    @staticmethod
    def get_balance_by_method(
        db: Session,
        payment_method: str,
        start_date = None,
        end_date = None
    ) -> float:
        """
        Calcula saldo neto por método de pago
        """
        from sqlalchemy import func, and_
        from datetime import datetime
        
        filters = [
            models.cash_movement.CashMovement.payment_method == payment_method.upper(),
            models.cash_movement.CashMovement.status == models.cash_movement.MovementStatus.CONFIRMADO
        ]
        
        if start_date:
            filters.append(
                func.date(models.cash_movement.CashMovement.accounting_date) >= 
                datetime.strptime(start_date, "%Y-%m-%d").date()
            )
        
        if end_date:
            filters.append(
                func.date(models.cash_movement.CashMovement.accounting_date) <= 
                datetime.strptime(end_date, "%Y-%m-%d").date()
            )
        
        movements = db.query(models.cash_movement.CashMovement).filter(and_(*filters)).all()
        
        ingresos = sum(m.amount_usd for m in movements if m.type == models.cash_movement.MovementType.INGRESO)
        egresos = sum(m.amount_usd for m in movements if m.type == models.cash_movement.MovementType.EGRESO)
        
        return round(ingresos - egresos, 2)