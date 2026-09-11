import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.finanzas_mensuales import FinanzasMensuales
from app.services.finance_service import FinanceService

# Setup in-memory SQLite database
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

def test_derived_fields_calculations():
    # Standard healthy month
    gb, gn, mb, mn = FinanceService.calculate_derived_fields(
        ventas=100000.0,
        costo_ventas=35000.0,
        gastos_operativos=50000.0
    )
    assert gb == 65000.0
    assert gn == 15000.0
    assert mb == 65.0
    assert mn == 15.0

    # Negative profit month
    gb2, gn2, mb2, mn2 = FinanceService.calculate_derived_fields(
        ventas=100000.0,
        costo_ventas=40000.0,
        gastos_operativos=70000.0
    )
    assert gb2 == 60000.0
    assert gn2 == -10000.0
    assert mb2 == 60.0
    assert mn2 == -10.0

    # Zero sales (division by zero safeguard)
    gb0, gn0, mb0, mn0 = FinanceService.calculate_derived_fields(
        ventas=0.0,
        costo_ventas=0.0,
        gastos_operativos=5000.0
    )
    assert gb0 == 0.0
    assert gn0 == -5000.0
    assert mb0 == 0.0
    assert mn0 == 0.0

def test_upsert_monthly_record_and_synchronization(db):
    branch = Sucursal(
        direccion="Test Branch",
        ventas_mes=0.0,
        ventas_anio=0.0,
        ganancias_netas_mes=0.0,
        ganancias_netas_anio=0.0,
        activa=True
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)

    # Insert month 1
    rec1 = FinanceService.update_current_period(
        db=db,
        branch=branch,
        ventas=200000.0,
        costo_ventas=70000.0,
        gastos_operativos=100000.0,
        anio=2026,
        mes=8
    )
    assert rec1.ganancias_brutas == 130000.0
    assert rec1.ganancias_netas == 30000.0
    assert rec1.margen_neto == 15.0

    # Branch top-level sync
    assert branch.ventas_mes == 200000.0
    assert branch.ganancias_netas_mes == 30000.0
    assert branch.ventas_anio == 200000.0

    # Insert month 2 (current)
    rec2 = FinanceService.update_current_period(
        db=db,
        branch=branch,
        ventas=300000.0,
        costo_ventas=100000.0,
        gastos_operativos=150000.0,
        anio=2026,
        mes=9
    )
    assert branch.ventas_mes == 300000.0
    assert branch.ganancias_netas_mes == 50000.0
    # Annual should sum both months of 2026: 200k + 300k = 500k
    assert branch.ventas_anio == 500000.0
    assert branch.ganancias_netas_anio == 80000.0

def test_history_analytics_summary(db):
    branch = Sucursal(direccion="Analytics Branch", activa=True)
    db.add(branch)
    db.commit()
    db.refresh(branch)

    # Populate 3 months
    FinanceService.upsert_monthly_record(db, branch.id, 2026, 1, 100000.0, 40000.0, 50000.0) # gn = 10000
    FinanceService.upsert_monthly_record(db, branch.id, 2026, 2, 200000.0, 70000.0, 90000.0) # gn = 40000 (best)
    FinanceService.upsert_monthly_record(db, branch.id, 2026, 3, 50000.0, 20000.0, 40000.0)  # gn = -10000 (worst)

    history_resp = FinanceService.get_branch_history(db, branch.id, months=12)
    assert len(history_resp.history) == 3
    assert history_resp.summary.mejor_mes_ventas.valor == 200000.0
    assert history_resp.summary.peor_mes_ventas.valor == 50000.0
    assert history_resp.summary.mejor_mes_ganancias.valor == 40000.0
    assert history_resp.summary.peor_mes_ganancias.valor == -10000.0
    assert history_resp.summary.promedio_ventas == round((100000 + 200000 + 50000) / 3, 2)

def test_comparative_analytics(db):
    b1 = Sucursal(direccion="Sucursal Alfa", activa=True)
    b2 = Sucursal(direccion="Sucursal Beta", activa=True)
    db.add_all([b1, b2])
    db.commit()

    FinanceService.upsert_monthly_record(db, b1.id, 2026, 1, 100000.0, 40000.0, 50000.0)
    FinanceService.upsert_monthly_record(db, b2.id, 2026, 1, 200000.0, 80000.0, 90000.0)

    comp = FinanceService.get_comparative_analytics(db, [b1.id, b2.id], months=12)
    assert len(comp.branch_totals) == 2
    # Beta has higher sales -> ranking position 0
    assert comp.ranking[0].direccion == "Sucursal Beta"
    assert comp.ranking[1].direccion == "Sucursal Alfa"
    assert len(comp.time_series_ventas) == 1
    assert comp.time_series_ventas[0]["Sucursal Beta"] == 200000.0
    assert comp.time_series_ventas[0]["Sucursal Alfa"] == 100000.0
