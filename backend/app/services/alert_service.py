from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.alerta import Alerta
from app.models.alerta_sucursal import AlertaSucursal
from app.models.sucursal import Sucursal
from app.models.stock import Stock
from app.models.usuario import Usuario

class AlertService:
    @staticmethod
    def evaluate_stock_alerts(db: Session, branch_id: int, stock_item: Stock) -> Optional[Alerta]:
        """
        Evaluates stock condition for a single product and updates/creates/resolves
        automatic stock alerts without generating duplicates.
        """
        # Find active stock alerts for this branch and this product
        active_stock_alerts: List[Alerta] = (
            db.query(Alerta)
            .join(AlertaSucursal, Alerta.id == AlertaSucursal.id_alerta)
            .filter(
                AlertaSucursal.id_sucursal == branch_id,
                Alerta.tipo == "stock",
                Alerta.estado == "activa",
                Alerta.mensaje.ilike(f"%{stock_item.nombre_producto}%")
            )
            .all()
        )

        existing_alert = active_stock_alerts[0] if active_stock_alerts else None

        # Case 1: Normal stock (cantidad >= stock_seguridad)
        if stock_item.cantidad >= stock_item.stock_seguridad:
            if existing_alert:
                existing_alert.estado = "resuelta"
                db.add(existing_alert)
                # Also resolve any duplicate active ones if they existed
                for extra in active_stock_alerts[1:]:
                    extra.estado = "resuelta"
                    db.add(extra)
                db.commit()
            return None

        # Case 2: Out of stock (cantidad == 0) -> Roja
        elif stock_item.cantidad == 0:
            gravedad = "roja"
            mensaje = f"Stock agotado de {stock_item.nombre_producto}"
            detalle = (
                f"El producto {stock_item.nombre_producto} está agotado (0 unidades disponibles). "
                f"El stock de seguridad es de {stock_item.stock_seguridad} unidades."
            )
            if existing_alert:
                existing_alert.gravedad = gravedad
                existing_alert.mensaje = mensaje
                existing_alert.detalle = detalle
                db.add(existing_alert)
                db.commit()
                db.refresh(existing_alert)
                return existing_alert
            else:
                new_alert = Alerta(
                    gravedad=gravedad,
                    mensaje=mensaje,
                    tipo="stock",
                    detalle=detalle,
                    id_usuario=None,
                    fecha_creacion=datetime.utcnow(),
                    estado="activa"
                )
                db.add(new_alert)
                db.flush()
                # Associate with branch
                rel = AlertaSucursal(id_alerta=new_alert.id, id_sucursal=branch_id)
                db.add(rel)
                db.commit()
                db.refresh(new_alert)
                return new_alert

        # Case 3: Low stock (0 < cantidad < stock_seguridad) -> Amarilla
        else:
            gravedad = "amarilla"
            mensaje = f"Stock bajo de {stock_item.nombre_producto}"
            detalle = (
                f"El producto {stock_item.nombre_producto} tiene {stock_item.cantidad} unidades disponibles "
                f"y el stock de seguridad es de {stock_item.stock_seguridad} unidades."
            )
            if existing_alert:
                existing_alert.gravedad = gravedad
                existing_alert.mensaje = mensaje
                existing_alert.detalle = detalle
                db.add(existing_alert)
                db.commit()
                db.refresh(existing_alert)
                return existing_alert
            else:
                new_alert = Alerta(
                    gravedad=gravedad,
                    mensaje=mensaje,
                    tipo="stock",
                    detalle=detalle,
                    id_usuario=None,
                    fecha_creacion=datetime.utcnow(),
                    estado="activa"
                )
                db.add(new_alert)
                db.flush()
                # Associate with branch
                rel = AlertaSucursal(id_alerta=new_alert.id, id_sucursal=branch_id)
                db.add(rel)
                db.commit()
                db.refresh(new_alert)
                return new_alert

    @staticmethod
    def evaluate_financial_alerts(db: Session, branch: Sucursal) -> Optional[Alerta]:
        """
        Evaluates monthly financial condition for a branch and updates/creates/resolves
        automatic financial alerts without generating duplicates.
        """
        # Find active financial alert for this branch
        active_fin_alerts: List[Alerta] = (
            db.query(Alerta)
            .join(AlertaSucursal, Alerta.id == AlertaSucursal.id_alerta)
            .filter(
                AlertaSucursal.id_sucursal == branch.id,
                Alerta.tipo == "financiera",
                Alerta.estado == "activa"
            )
            .all()
        )

        existing_alert = active_fin_alerts[0] if active_fin_alerts else None

        ventas = branch.ventas_mes
        ganancias = branch.ganancias_netas_mes

        is_roja = False
        is_naranja = False
        mensaje = ""
        detalle = ""

        if ventas <= 0:
            if ganancias <= 0:
                is_roja = True
                mensaje = "Ganancia neta mensual nula o negativa"
                detalle = (
                    f"La sucursal registró ventas de $0.00 y ganancias netas de ${ganancias:,.2f}."
                )
        else:
            if ganancias <= 0:
                is_roja = True
                mensaje = "Ganancia neta mensual nula o negativa"
                detalle = (
                    f"La sucursal registró ganancias netas de ${ganancias:,.2f} con ventas mensuales de ${ventas:,.2f}."
                )
            else:
                margin = ganancias / ventas
                if margin < 0.10:
                    is_naranja = True
                    mensaje = "Rentabilidad mensual baja"
                    detalle = (
                        f"El margen neto mensual es de {margin * 100:.1f}%, inferior al 10% requerido "
                        f"(Ventas: ${ventas:,.2f}, Ganancias: ${ganancias:,.2f})."
                    )

        # If conditions are normal:
        if not is_roja and not is_naranja:
            if existing_alert:
                existing_alert.estado = "resuelta"
                db.add(existing_alert)
                for extra in active_fin_alerts[1:]:
                    extra.estado = "resuelta"
                    db.add(extra)
                db.commit()
            return None

        # Red alert
        if is_roja:
            gravedad = "roja"
        else:
            gravedad = "naranja"

        if existing_alert:
            existing_alert.gravedad = gravedad
            existing_alert.mensaje = mensaje
            existing_alert.detalle = detalle
            db.add(existing_alert)
            db.commit()
            db.refresh(existing_alert)
            return existing_alert
        else:
            new_alert = Alerta(
                gravedad=gravedad,
                mensaje=mensaje,
                tipo="financiera",
                detalle=detalle,
                id_usuario=None,
                fecha_creacion=datetime.utcnow(),
                estado="activa"
            )
            db.add(new_alert)
            db.flush()
            rel = AlertaSucursal(id_alerta=new_alert.id, id_sucursal=branch.id)
            db.add(rel)
            db.commit()
            db.refresh(new_alert)
            return new_alert

    @staticmethod
    def create_manual_alert(
        db: Session,
        branch_id: int,
        user_id: int,
        gravedad: str,
        mensaje: str,
        detalle: str
    ) -> Alerta:
        """
        Creates a manual alert created by a manager, bound to their branch.
        """
        new_alert = Alerta(
            gravedad=gravedad,
            mensaje=mensaje,
            tipo="manual",
            detalle=detalle,
            id_usuario=user_id,
            fecha_creacion=datetime.utcnow(),
            estado="activa"
        )
        db.add(new_alert)
        db.flush()

        rel = AlertaSucursal(id_alerta=new_alert.id, id_sucursal=branch_id)
        db.add(rel)
        db.commit()
        db.refresh(new_alert)
        return new_alert

    @staticmethod
    def resolve_alert(db: Session, alert_id: int, user: Usuario) -> Alerta:
        """
        Resolves an alert.
        Supervisor can resolve any alert.
        Gerente can only resolve if the alert belongs to their branch.
        """
        alert = db.query(Alerta).filter(Alerta.id == alert_id).first()
        if not alert:
            raise ValueError("Alerta no encontrada")

        if user.rol != "supervisor":
            # Check if alert belongs to user's branch
            user_branch_ids = [s.id for s in alert.sucursales]
            user_branch = db.query(Sucursal).filter(Sucursal.id_gerente == user.id).first()
            if not user_branch or user_branch.id not in user_branch_ids:
                raise PermissionError("No tienes permisos para resolver alertas de otra sucursal")

        alert.estado = "resuelta"
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert
