from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, verify_branch_read_access, require_branch_manager_write
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.finanzas_mensuales import FinanzasMensuales
from app.schemas.finance import FinanceUpdate, FinanceResponse
from app.schemas.monthly_finance import (
    MonthlyFinanceUpdate,
    MonthlyFinanceResponse,
    BranchFinanceHistoryResponse,
)
from app.services.finance_service import FinanceService

router = APIRouter(tags=["finances"])

@router.get("/branches/{branch_id}/finances", response_model=FinanceResponse)
def get_branch_finances(
    branch_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = verify_branch_read_access(branch_id, current_user, db)

    # Check if there is a record for the current month/year
    now = datetime.utcnow()
    current_record = (
        db.query(FinanzasMensuales)
        .filter(
            FinanzasMensuales.id_sucursal == branch.id,
            FinanzasMensuales.anio == now.year,
            FinanzasMensuales.mes == now.month
        )
        .first()
    )

    if current_record:
        costo_ventas = current_record.costo_ventas
        gastos_operativos = current_record.gastos_operativos
        ganancias_brutas = current_record.ganancias_brutas
        margen_bruto = current_record.margen_bruto
    else:
        costo_ventas = 0.0
        gastos_operativos = 0.0
        ganancias_brutas = branch.ventas_mes
        margen_bruto = 100.0 if branch.ventas_mes > 0 else 0.0

    return FinanceResponse(
        ventas_mes=branch.ventas_mes,
        ventas_anio=branch.ventas_anio,
        ganancias_netas_mes=branch.ganancias_netas_mes,
        ganancias_netas_anio=branch.ganancias_netas_anio,
        margen_neto_mes=branch.margen_neto_mes,
        costo_ventas_mes=costo_ventas,
        gastos_operativos_mes=gastos_operativos,
        ganancias_brutas_mes=ganancias_brutas,
        margen_bruto_mes=margen_bruto
    )

@router.get("/branches/{branch_id}/finances/history", response_model=BranchFinanceHistoryResponse)
def get_branch_finance_history(
    branch_id: int,
    months: int = Query(12, ge=1, le=48),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = verify_branch_read_access(branch_id, current_user, db)
    return FinanceService.get_branch_history(db=db, branch_id=branch.id, months=months)

@router.put("/branches/{branch_id}/finances/current", response_model=MonthlyFinanceResponse)
def update_current_monthly_finance(
    branch_id: int,
    update_in: MonthlyFinanceUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = require_branch_manager_write(branch_id, current_user, db)

    record = FinanceService.update_current_period(
        db=db,
        branch=branch,
        ventas=update_in.ventas,
        costo_ventas=update_in.costo_ventas,
        gastos_operativos=update_in.gastos_operativos,
        anio=update_in.anio,
        mes=update_in.mes
    )

    return MonthlyFinanceResponse(
        id=record.id,
        id_sucursal=record.id_sucursal,
        anio=record.anio,
        mes=record.mes,
        mes_label=FinanceService.get_month_label(record.anio, record.mes),
        ventas=record.ventas,
        costo_ventas=record.costo_ventas,
        gastos_operativos=record.gastos_operativos,
        ganancias_brutas=record.ganancias_brutas,
        ganancias_netas=record.ganancias_netas,
        margen_bruto=record.margen_bruto,
        margen_neto=record.margen_neto
    )

@router.put("/branches/{branch_id}/finances", response_model=FinanceResponse)
def update_branch_finances(
    branch_id: int,
    finance_update: FinanceUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = require_branch_manager_write(branch_id, current_user, db)

    # If manager provided costs and expenses, compute derived net profit
    costo = finance_update.costo_ventas_mes or 0.0
    gastos = finance_update.gastos_operativos_mes or 0.0

    if finance_update.ganancias_netas_mes is not None and costo == 0.0 and gastos == 0.0:
        # Legacy direct net profit input
        net_profit = finance_update.ganancias_netas_mes
        gross_profit = finance_update.ventas_mes
    else:
        gross_profit, net_profit, _, _ = FinanceService.calculate_derived_fields(
            finance_update.ventas_mes, costo, gastos
        )

    # Update current period via FinanceService
    record = FinanceService.update_current_period(
        db=db,
        branch=branch,
        ventas=finance_update.ventas_mes,
        costo_ventas=costo,
        gastos_operativos=gastos
    )

    return FinanceResponse(
        ventas_mes=branch.ventas_mes,
        ventas_anio=branch.ventas_anio,
        ganancias_netas_mes=branch.ganancias_netas_mes,
        ganancias_netas_anio=branch.ganancias_netas_anio,
        margen_neto_mes=branch.margen_neto_mes,
        costo_ventas_mes=record.costo_ventas,
        gastos_operativos_mes=record.gastos_operativos,
        ganancias_brutas_mes=record.ganancias_brutas,
        margen_bruto_mes=record.margen_bruto
    )
