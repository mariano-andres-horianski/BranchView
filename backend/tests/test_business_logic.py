import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.stock import Stock
from app.models.empleado import Empleado
from app.models.alerta import Alerta
from app.models.alerta_sucursal import AlertaSucursal
from app.services.alert_service import AlertService

# Setup in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_stock_alerts_lifecycle(db):
    # Setup branch
    branch = Sucursal(direccion="Test Branch", ventas_mes=100000, ventas_anio=1200000, ganancias_netas_mes=15000, ganancias_netas_anio=180000)
    db.add(branch)
    db.commit()
    db.refresh(branch)

    # 1. Product starts with normal stock (10 >= 10)
    item = Stock(nombre_producto="Café Test", cantidad=10, stock_seguridad=10, id_sucursal=branch.id)
    db.add(item)
    db.commit()
    db.refresh(item)

    alert = AlertService.evaluate_stock_alerts(db, branch.id, item)
    assert alert is None
    assert db.query(Alerta).filter(Alerta.estado == "activa").count() == 0

    # 2. Stock drops to low (4 < 10) -> Amarilla
    item.cantidad = 4
    db.commit()
    alert_yellow = AlertService.evaluate_stock_alerts(db, branch.id, item)
    assert alert_yellow is not None
    assert alert_yellow.gravedad == "amarilla"
    assert alert_yellow.estado == "activa"
    assert "Stock bajo" in alert_yellow.mensaje

    # 3. Stock drops to 0 -> Escalates to Roja (no duplicates)
    item.cantidad = 0
    db.commit()
    alert_red = AlertService.evaluate_stock_alerts(db, branch.id, item)
    assert alert_red.id == alert_yellow.id
    assert alert_red.gravedad == "roja"
    assert alert_red.estado == "activa"
    assert db.query(Alerta).filter(Alerta.estado == "activa").count() == 1

    # 4. Stock replenished to 15 (>= 10) -> Auto resolved
    item.cantidad = 15
    db.commit()
    alert_none = AlertService.evaluate_stock_alerts(db, branch.id, item)
    assert alert_none is None
    assert db.query(Alerta).filter(Alerta.estado == "activa").count() == 0
    assert db.query(Alerta).filter(Alerta.estado == "resuelta").count() == 1

def test_financial_alerts_lifecycle(db):
    branch = Sucursal(direccion="Fin Branch", ventas_mes=100000, ventas_anio=1200000, ganancias_netas_mes=15000, ganancias_netas_anio=180000)
    db.add(branch)
    db.commit()
    db.refresh(branch)

    # Normal margin: 15,000 / 100,000 = 15% >= 10%
    alert = AlertService.evaluate_financial_alerts(db, branch)
    assert alert is None
    assert db.query(Alerta).filter(Alerta.estado == "activa").count() == 0

    # Profit drops to 5,000 (margin 5% < 10%) -> Naranja
    branch.ganancias_netas_mes = 5000
    db.commit()
    alert_orange = AlertService.evaluate_financial_alerts(db, branch)
    assert alert_orange is not None
    assert alert_orange.gravedad == "naranja"
    assert alert_orange.estado == "activa"

    # Profit drops to -1,000 (negative profit) -> Roja
    branch.ganancias_netas_mes = -1000
    db.commit()
    alert_red = AlertService.evaluate_financial_alerts(db, branch)
    assert alert_red.id == alert_orange.id
    assert alert_red.gravedad == "roja"
    assert alert_red.estado == "activa"
    assert db.query(Alerta).filter(Alerta.estado == "activa").count() == 1

    # Profit recovers to 20,000 (20%) -> Auto resolved
    branch.ganancias_netas_mes = 20000
    db.commit()
    alert_resolved = AlertService.evaluate_financial_alerts(db, branch)
    assert alert_resolved is None
    assert db.query(Alerta).filter(Alerta.estado == "activa").count() == 0
    assert db.query(Alerta).filter(Alerta.estado == "resuelta").count() == 1

def test_manual_alert_and_resolution(db):
    user_gerente = Usuario(username="mgr", nombre="Manager", rol="gerente", password_hash="fake")
    user_supervisor = Usuario(username="sup", nombre="Supervisor", rol="supervisor", password_hash="fake")
    user_other_mgr = Usuario(username="other", nombre="Other", rol="gerente", password_hash="fake")
    db.add_all([user_gerente, user_supervisor, user_other_mgr])
    db.commit()

    branch = Sucursal(direccion="Branch 1", id_gerente=user_gerente.id, ventas_mes=100, ventas_anio=1200, ganancias_netas_mes=20, ganancias_netas_anio=240)
    db.add(branch)
    db.commit()

    # Create manual alert
    manual_alert = AlertService.create_manual_alert(
        db, branch.id, user_gerente.id,
        gravedad="amarilla",
        mensaje="Problema eléctrico",
        detalle="Chispa en enchufe"
    )
    assert manual_alert.tipo == "manual"
    assert manual_alert.estado == "activa"
    assert manual_alert.id_usuario == user_gerente.id

    # Other manager cannot resolve it
    with pytest.raises(PermissionError):
        AlertService.resolve_alert(db, manual_alert.id, user_other_mgr)

    # Supervisor can resolve it
    resolved = AlertService.resolve_alert(db, manual_alert.id, user_supervisor)
    assert resolved.estado == "resuelta"

def test_logical_deletions(db):
    branch = Sucursal(direccion="Delete Me", activa=True)
    db.add(branch)
    db.commit()
    db.refresh(branch)

    emp = Empleado(nombre="John", dni="123", rol="Barista", edad=25, id_sucursal=branch.id, activo=True)
    db.add(emp)
    db.commit()
    db.refresh(emp)

    # Logical delete employee
    emp.activo = False
    db.commit()
    assert db.query(Empleado).filter(Empleado.id == emp.id).first().activo is False

    # Logical delete branch
    branch.activa = False
    db.commit()
    assert db.query(Sucursal).filter(Sucursal.id == branch.id).first().activa is False
