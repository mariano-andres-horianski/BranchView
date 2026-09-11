import os
import sys
import argparse
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.core.security import get_password_hash
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.stock import Stock
from app.models.empleado import Empleado
from app.models.alerta import Alerta
from app.models.alerta_sucursal import AlertaSucursal
from app.models.finanzas_mensuales import FinanzasMensuales
from app.services.alert_service import AlertService
from app.services.finance_service import FinanceService

# 24 months sequence: Oct 2024 to Sep 2026
MONTHS_24 = [
    (2024, 10), (2024, 11), (2024, 12),
    (2025, 1), (2025, 2), (2025, 3), (2025, 4), (2025, 5), (2025, 6),
    (2025, 7), (2025, 8), (2025, 9), (2025, 10), (2025, 11), (2025, 12),
    (2026, 1), (2026, 2), (2026, 3), (2026, 4), (2026, 5), (2026, 6),
    (2026, 7), (2026, 8), (2026, 9)
]

def seed_financial_history_for_branches(db, branches):
    """
    Seeds 24 months of realistic financial history for each branch
    with distinct business trends and scenarios.
    """
    sucursal_centro, sucursal_constitucion, sucursal_guemes, sucursal_belgrano, sucursal_inactiva = branches

    # 1. Centro: Constant strong growth (3.1M -> 4.5M), high margin (~15%)
    centro_sales = [
        3100000, 3150000, 3400000,
        3200000, 3250000, 3350000, 3500000, 3600000, 3700000,
        3800000, 3900000, 3950000, 4050000, 4200000, 4450000,
        4100000, 4150000, 4250000, 4300000, 4350000, 4400000,
        4420000, 4480000, 4500000
    ]

    for (anio, mes), v in zip(MONTHS_24, centro_sales):
        costo = round(v * 0.35, 2)
        gastos = round(v * 0.50, 2)
        FinanceService.upsert_monthly_record(db, sucursal_centro.id, anio, mes, v, costo, gastos)

    # 2. Constitución: High volume but margin compression in recent months (< 10%)
    constitucion_sales = [
        2600000, 2700000, 2900000,
        2750000, 2800000, 2850000, 2900000, 2950000, 3000000,
        3050000, 3100000, 3120000, 3150000, 3200000, 3350000,
        3100000, 3120000, 3150000, 3180000, 3200000, 3210000,
        3200000, 3220000, 3200000
    ]

    for idx, ((anio, mes), v) in enumerate(zip(MONTHS_24, constitucion_sales)):
        costo = round(v * 0.40, 2)
        # Operating expenses rose in the last 6 months (indices 18-23)
        if idx >= 18:
            gastos = round(v * 0.53, 2)  # Net margin = 7.0%
        else:
            gastos = round(v * 0.46, 2)  # Net margin = 14.0%
        FinanceService.upsert_monthly_record(db, sucursal_constitucion.id, anio, mes, v, costo, gastos)

    # 3. Güemes: Seasonal summer peaks (Jan/Feb) + sudden repair crisis in Sep 2026 (Loss)
    guemes_sales = [
        2900000, 3100000, 3500000,
        3800000, 3750000, 3200000, 2950000, 2800000, 2750000,
        2800000, 2850000, 2900000, 3050000, 3250000, 3600000,
        3900000, 3850000, 3300000, 3000000, 2850000, 2800000,
        2820000, 2840000, 2800000
    ]

    for idx, ((anio, mes), v) in enumerate(zip(MONTHS_24, guemes_sales)):
        costo = round(v * 0.38, 2)
        if idx == 23:  # Sep 2026: Emergency repair expenses
            gastos = round(v * 0.6628, 2)  # Results in -120,000 net profit
        elif idx in [3, 4, 15, 16]:  # Summer peaks
            gastos = round(v * 0.46, 2)
        else:
            gastos = round(v * 0.48, 2)
        FinanceService.upsert_monthly_record(db, sucursal_guemes.id, anio, mes, v, costo, gastos)

    # 4. Belgrano: Specialty boutique café, high ticket, strict cost discipline (margin 16% - 21%)
    belgrano_sales = [
        3900000, 4050000, 4350000,
        4100000, 4200000, 4300000, 4400000, 4500000, 4600000,
        4650000, 4700000, 4750000, 4800000, 4950000, 5200000,
        4850000, 4900000, 4950000, 5000000, 5050000, 5080000,
        5050000, 5080000, 5100000
    ]

    for (anio, mes), v in zip(MONTHS_24, belgrano_sales):
        costo = round(v * 0.33, 2)
        gastos = round(v * 0.5033, 2)  # Net margin ~16.67%
        FinanceService.upsert_monthly_record(db, sucursal_belgrano.id, anio, mes, v, costo, gastos)

    # 5. Inactiva Mendoza: Operated Oct 2024 - May 2025, then closed
    for idx, (anio, mes) in enumerate(MONTHS_24):
        if idx < 8:  # 8 active months
            v = 1500000.0
            costo = 750000.0
            gastos = 650000.0
        else:
            v = 0.0
            costo = 0.0
            gastos = 0.0
        FinanceService.upsert_monthly_record(db, sucursal_inactiva.id, anio, mes, v, costo, gastos)

    # Synchronize top-level fields for active branches from 2026 records
    for b in [sucursal_centro, sucursal_constitucion, sucursal_guemes, sucursal_belgrano]:
        current_rec = db.query(FinanzasMensuales).filter(
            FinanzasMensuales.id_sucursal == b.id,
            FinanzasMensuales.anio == 2026,
            FinanzasMensuales.mes == 9
        ).first()

        year_recs = db.query(FinanzasMensuales).filter(
            FinanzasMensuales.id_sucursal == b.id,
            FinanzasMensuales.anio == 2026
        ).all()

        if current_rec:
            b.ventas_mes = current_rec.ventas
            b.ganancias_netas_mes = current_rec.ganancias_netas

        if year_recs:
            b.ventas_anio = round(sum(r.ventas for r in year_recs), 2)
            b.ganancias_netas_anio = round(sum(r.ganancias_netas for r in year_recs), 2)

        db.add(b)

    db.commit()

def seed(force_finance=False):
    print("Iniciando creación/verificación de tablas...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        users_count = db.query(Usuario).count()
        if users_count > 0:
            if force_finance:
                print("Actualizando historial financiero de 24 meses...")
                branches = db.query(Sucursal).order_by(Sucursal.id.asc()).all()
                if len(branches) >= 5:
                    seed_financial_history_for_branches(db, branches[:5])
                    print("Historial financiero de 24 meses actualizado exitosamente!")
                return
            elif db.query(FinanzasMensuales).count() > 0:
                print("La base de datos ya contiene usuarios y finanzas mensuales. Omitiendo seed completo.")
                return
            else:
                print("Usuarios existentes pero finanzas_mensuales vacía. Poblando historial financiero...")
                branches = db.query(Sucursal).order_by(Sucursal.id.asc()).all()
                if len(branches) >= 5:
                    seed_financial_history_for_branches(db, branches[:5])
                    print("Historial financiero de 24 meses poblado exitosamente!")
                return

        print("Poblando usuarios...")
        supervisor = Usuario(
            username="supervisor",
            nombre="Mariano Supervisor",
            rol="supervisor",
            password_hash=get_password_hash("admin123")
        )
        gerente_centro = Usuario(
            username="gerente_centro",
            nombre="Carlos Gómez",
            rol="gerente",
            password_hash=get_password_hash("gerente123")
        )
        gerente_norte = Usuario(
            username="gerente_norte",
            nombre="Laura Martínez",
            rol="gerente",
            password_hash=get_password_hash("gerente123")
        )
        gerente_sur = Usuario(
            username="gerente_sur",
            nombre="Roberto Fernández",
            rol="gerente",
            password_hash=get_password_hash("gerente123")
        )
        gerente_oeste = Usuario(
            username="gerente_oeste",
            nombre="Ana Beltrán",
            rol="gerente",
            password_hash=get_password_hash("gerente123")
        )
        gerente_disponible = Usuario(
            username="gerente_disponible",
            nombre="Martín Pardo (Sin Asignar)",
            rol="gerente",
            password_hash=get_password_hash("gerente123")
        )

        db.add_all([
            supervisor,
            gerente_centro,
            gerente_norte,
            gerente_sur,
            gerente_oeste,
            gerente_disponible
        ])
        db.commit()

        print("Poblando sucursales...")
        # 1. Sucursal Centro
        sucursal_centro = Sucursal(
            direccion="Av. Corrientes 1520, CABA",
            id_gerente=gerente_centro.id,
            ventas_mes=4500000.0,
            ventas_anio=38500000.0,
            ganancias_netas_mes=675000.0,
            ganancias_netas_anio=5775000.0,
            activa=True
        )

        # 2. Sucursal Constitución
        sucursal_constitucion = Sucursal(
            direccion="Av. Constitución 2450, Mar del Plata",
            id_gerente=gerente_norte.id,
            ventas_mes=3200000.0,
            ventas_anio=28580000.0,
            ganancias_netas_mes=224000.0,
            ganancias_netas_anio=2400000.0,
            activa=True
        )

        # 3. Sucursal Güemes
        sucursal_guemes = Sucursal(
            direccion="Calle Güemes 3120, Mar del Plata",
            id_gerente=gerente_sur.id,
            ventas_mes=2800000.0,
            ventas_anio=28260000.0,
            ganancias_netas_mes=-120000.0,
            ganancias_netas_anio=3100000.0,
            activa=True
        )

        # 4. Sucursal Belgrano
        sucursal_belgrano = Sucursal(
            direccion="Av. Cabildo 1820, CABA",
            id_gerente=gerente_oeste.id,
            ventas_mes=5100000.0,
            ventas_anio=44930000.0,
            ganancias_netas_mes=850000.0,
            ganancias_netas_anio=7490000.0,
            activa=True
        )

        # 5. Sucursal Inactiva
        sucursal_inactiva = Sucursal(
            direccion="Av. San Martín 450, Mendoza (Cerrada)",
            id_gerente=None,
            ventas_mes=0.0,
            ventas_anio=0.0,
            ganancias_netas_mes=0.0,
            ganancias_netas_anio=0.0,
            activa=False
        )

        branches = [
            sucursal_centro,
            sucursal_constitucion,
            sucursal_guemes,
            sucursal_belgrano,
            sucursal_inactiva
        ]
        db.add_all(branches)
        db.commit()

        print("Poblando 24 meses de historial financiero...")
        seed_financial_history_for_branches(db, branches)

        print("Poblando stock...")
        s_c1 = Stock(nombre_producto="Café en Grano Tostado 1kg", cantidad=60, stock_seguridad=20, id_sucursal=sucursal_centro.id)
        s_c2 = Stock(nombre_producto="Leche Entera 1L", cantidad=80, stock_seguridad=30, id_sucursal=sucursal_centro.id)
        s_c3 = Stock(nombre_producto="Vasos Polipapel 12oz", cantidad=400, stock_seguridad=150, id_sucursal=sucursal_centro.id)
        s_c4 = Stock(nombre_producto="Medialunas Docena", cantidad=35, stock_seguridad=15, id_sucursal=sucursal_centro.id)

        s_n1 = Stock(nombre_producto="Café Molido Colombia 500g", cantidad=0, stock_seguridad=25, id_sucursal=sucursal_constitucion.id)
        s_n2 = Stock(nombre_producto="Azúcar en Paquetes 1kg", cantidad=6, stock_seguridad=15, id_sucursal=sucursal_constitucion.id)
        s_n3 = Stock(nombre_producto="Vasos Polipapel 8oz", cantidad=120, stock_seguridad=50, id_sucursal=sucursal_constitucion.id)
        s_n4 = Stock(nombre_producto="Servilletas Pack x500", cantidad=8, stock_seguridad=5, id_sucursal=sucursal_constitucion.id)

        s_g1 = Stock(nombre_producto="Granos Colombia Excelso 1kg", cantidad=18, stock_seguridad=10, id_sucursal=sucursal_guemes.id)
        s_g2 = Stock(nombre_producto="Siropes Sabores Variados 750ml", cantidad=3, stock_seguridad=8, id_sucursal=sucursal_guemes.id)
        s_g3 = Stock(nombre_producto="Vasos Polipapel 12oz", cantidad=90, stock_seguridad=60, id_sucursal=sucursal_guemes.id)

        s_b1 = Stock(nombre_producto="Café Blend Especial 1kg", cantidad=45, stock_seguridad=20, id_sucursal=sucursal_belgrano.id)
        s_b2 = Stock(nombre_producto="Leche Vegetal Almendras 1L", cantidad=30, stock_seguridad=10, id_sucursal=sucursal_belgrano.id)
        s_b3 = Stock(nombre_producto="Vasos Térmicos 16oz", cantidad=200, stock_seguridad=70, id_sucursal=sucursal_belgrano.id)

        stock_items = [s_c1, s_c2, s_c3, s_c4, s_n1, s_n2, s_n3, s_n4, s_g1, s_g2, s_g3, s_b1, s_b2, s_b3]
        db.add_all(stock_items)
        db.commit()

        print("Poblando empleados...")
        empleados = [
            Empleado(nombre="Gonzalo Méndez", dni="34891234", rol="Encargado de Turno", sueldo=850000.0, asistencias=22, faltas=0, antiguedad=3, edad=31, id_sucursal=sucursal_centro.id),
            Empleado(nombre="Florencia Díaz", dni="38492019", rol="Barista Principal", sueldo=680000.0, asistencias=21, faltas=1, antiguedad=2, edad=26, id_sucursal=sucursal_centro.id),
            Empleado(nombre="Lucas Pereyra", dni="41938201", rol="Cajero", sueldo=590000.0, asistencias=20, faltas=2, antiguedad=1, edad=23, id_sucursal=sucursal_centro.id),
            Empleado(nombre="Matías Romero", dni="36294819", rol="Personal de Maestranza", sueldo=540000.0, asistencias=22, faltas=0, antiguedad=2, edad=29, id_sucursal=sucursal_centro.id),

            Empleado(nombre="Camila Rossi", dni="39182374", rol="Barista", sueldo=670000.0, asistencias=19, faltas=3, antiguedad=2, edad=25, id_sucursal=sucursal_constitucion.id),
            Empleado(nombre="Julián Blanco", dni="42194820", rol="Cajero y Mostrador", sueldo=580000.0, asistencias=21, faltas=1, antiguedad=1, edad=22, id_sucursal=sucursal_constitucion.id),
            Empleado(nombre="Silvia Morales", dni="31948291", rol="Cocinera / Pastelería", sueldo=720000.0, asistencias=22, faltas=0, antiguedad=4, edad=38, id_sucursal=sucursal_constitucion.id),
            Empleado(nombre="Esteban Quispe (Ex Empleado)", dni="37194820", rol="Cajero", sueldo=580000.0, asistencias=15, faltas=7, antiguedad=1, edad=24, activo=False, id_sucursal=sucursal_constitucion.id),

            Empleado(nombre="Nicolás Varela", dni="35891823", rol="Barista Senior", sueldo=710000.0, asistencias=22, faltas=0, antiguedad=3, edad=30, id_sucursal=sucursal_guemes.id),
            Empleado(nombre="Valeria Fontana", dni="40192847", rol="Atención al Cliente", sueldo=600000.0, asistencias=20, faltas=2, antiguedad=1, edad=24, id_sucursal=sucursal_guemes.id),
            Empleado(nombre="Damián Soria", dni="37482910", rol="Pastelero", sueldo=740000.0, asistencias=21, faltas=1, antiguedad=2, edad=28, id_sucursal=sucursal_guemes.id),

            Empleado(nombre="Mariela Benítez", dni="33918294", rol="Encargada General", sueldo=890000.0, asistencias=22, faltas=0, antiguedad=4, edad=34, id_sucursal=sucursal_belgrano.id),
            Empleado(nombre="Federico Castro", dni="38192849", rol="Barista", sueldo=670000.0, asistencias=22, faltas=0, antiguedad=2, edad=27, id_sucursal=sucursal_belgrano.id),
            Empleado(nombre="Agustina Paz", dni="43192039", rol="Cajera", sueldo=590000.0, asistencias=21, faltas=1, antiguedad=1, edad=21, id_sucursal=sucursal_belgrano.id),
            Empleado(nombre="Sebastián Luna", dni="39283748", rol="Cocina y Ensamble", sueldo=650000.0, asistencias=20, faltas=2, antiguedad=2, edad=26, id_sucursal=sucursal_belgrano.id),
            Empleado(nombre="Lucía Navarro", dni="41294820", rol="Limpieza y Stock", sueldo=540000.0, asistencias=22, faltas=0, antiguedad=1, edad=23, id_sucursal=sucursal_belgrano.id),
        ]
        db.add_all(empleados)
        db.commit()

        print("Evaluando alertas de stock y financieras...")
        for item in stock_items:
            AlertService.evaluate_stock_alerts(db, item.id_sucursal, item)

        for b in [sucursal_centro, sucursal_constitucion, sucursal_guemes, sucursal_belgrano]:
            AlertService.evaluate_financial_alerts(db, b)

        # Manual alerts
        AlertService.create_manual_alert(
            db=db,
            branch_id=sucursal_guemes.id,
            user_id=gerente_sur.id,
            gravedad="roja",
            mensaje="Rotura de cañería en barra de cocina",
            detalle="Se detectó una pérdida de agua severa por rotura de caño de alimentación bajo la pileta de la barra central. Se cerró la llave de paso del sector y se convocó plomería de urgencia."
        )

        AlertService.create_manual_alert(
            db=db,
            branch_id=sucursal_belgrano.id,
            user_id=gerente_oeste.id,
            gravedad="amarilla",
            mensaje="Mantenimiento preventivo molino de café",
            detalle="El molino secundario de especialidad emite un zumbido intermitente al moler cargas mayores a 20g. Requiere ajuste y cambio preventivo de muelas antes del fin de semana."
        )

        print("Seed completo exitoso con historial de 24 meses!")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--force-finance", action="store_true", help="Force populate financial history even if users exist")
    args = parser.parse_args()
    seed(force_finance=args.force_finance)
