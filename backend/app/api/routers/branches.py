from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_supervisor, verify_branch_read_access
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.alerta import Alerta
from app.models.alerta_sucursal import AlertaSucursal
from app.schemas.branch import (
    BranchCreate,
    BranchUpdate,
    BranchResponse,
    BranchDetailResponse,
)
from app.schemas.employee import EmployeeResponse
from app.schemas.stock import StockResponse
from app.schemas.alert import AlertResponse, BranchShort
from app.schemas.monthly_finance import ComparativeAnalyticsResponse
from app.services.alert_service import AlertService
from app.services.finance_service import FinanceService
from datetime import datetime

router = APIRouter(prefix="/branches", tags=["branches"])

def build_branch_response(branch: Sucursal, db: Session) -> BranchResponse:
    # Query active alerts for this branch
    active_alerts: List[Alerta] = (
        db.query(Alerta)
        .join(AlertaSucursal, Alerta.id == AlertaSucursal.id_alerta)
        .filter(AlertaSucursal.id_sucursal == branch.id, Alerta.estado == "activa")
        .all()
    )

    has_roja = any(a.gravedad == "roja" for a in active_alerts)
    has_naranja = any(a.gravedad == "naranja" for a in active_alerts)
    has_amarilla = any(a.gravedad == "amarilla" for a in active_alerts)

    return BranchResponse(
        id=branch.id,
        direccion=branch.direccion,
        id_gerente=branch.id_gerente,
        gerente_nombre=branch.gerente.nombre if branch.gerente else "Sin asignar",
        ventas_mes=branch.ventas_mes,
        ventas_anio=branch.ventas_anio,
        ganancias_netas_mes=branch.ganancias_netas_mes,
        ganancias_netas_anio=branch.ganancias_netas_anio,
        margen_neto_mes=branch.margen_neto_mes,
        activa=branch.activa,
        alertas_activas_count=len(active_alerts),
        has_roja_alert=has_roja,
        has_naranja_alert=has_naranja,
        has_amarilla_alert=has_amarilla,
    )

@router.get("", response_model=List[BranchResponse])
def get_branches(
    q: Optional[str] = None,
    filter_type: str = Query("operativas", enum=["todas", "operativas", "con_alerta"]),
    current_user: Usuario = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    query = db.query(Sucursal)

    if filter_type == "operativas":
        query = query.filter(Sucursal.activa == True)
    elif filter_type == "todas":
        # Per specification: inactive branches don't appear in normal lists, but supervisor can view 'todas'
        pass
    elif filter_type == "con_alerta":
        query = query.filter(Sucursal.activa == True).join(
            AlertaSucursal, Sucursal.id == AlertaSucursal.id_sucursal
        ).join(
            Alerta, Alerta.id == AlertaSucursal.id_alerta
        ).filter(Alerta.estado == "activa")

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.outerjoin(Usuario, Sucursal.id_gerente == Usuario.id).filter(
            (Sucursal.direccion.ilike(search_pattern)) |
            (Usuario.nombre.ilike(search_pattern))
        )

    branches = query.distinct().all()
    return [build_branch_response(b, db) for b in branches]

@router.get("/compare")
def compare_branches(
    ids: str = Query(..., description="Comma separated branch IDs, e.g. 1,2,3"),
    current_user: Usuario = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    try:
        branch_ids = [int(i.strip()) for i in ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de IDs inválido")

    if not branch_ids:
        raise HTTPException(status_code=400, detail="Debe especificar al menos una sucursal")

    branches = db.query(Sucursal).filter(Sucursal.id.in_(branch_ids), Sucursal.activa == True).all()
    if len(branches) != len(branch_ids):
        found_ids = {b.id for b in branches}
        missing = set(branch_ids) - found_ids
        raise HTTPException(status_code=404, detail=f"Sucursales no encontradas o inactivas: {missing}")

    result = []
    for b in branches:
        detail = get_branch_detail(b.id, current_user, db)
        result.append(detail)

    return result

@router.get("/compare/analytics", response_model=ComparativeAnalyticsResponse)
def compare_branches_analytics(
    ids: str = Query(..., description="Comma separated branch IDs, e.g. 1,2,3"),
    months: int = Query(12, ge=1, le=48),
    current_user: Usuario = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    try:
        branch_ids = [int(i.strip()) for i in ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de IDs inválido")

    if not branch_ids:
        raise HTTPException(status_code=400, detail="Debe especificar al menos una sucursal")

    return FinanceService.get_comparative_analytics(db=db, branch_ids=branch_ids, months=months)

@router.get("/{id}", response_model=BranchDetailResponse)
def get_branch_detail(
    id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = verify_branch_read_access(id, current_user, db)
    base_info = build_branch_response(branch, db)

    # Only active employees
    active_employees = [e for e in branch.empleados if e.activo]
    emp_responses = [EmployeeResponse.model_validate(e) for e in active_employees]

    # Stock items
    stock_responses = []
    for s in branch.stock_items:
        stock_resp = StockResponse(
            id=s.id,
            id_sucursal=s.id_sucursal,
            nombre_producto=s.nombre_producto,
            cantidad=s.cantidad,
            stock_seguridad=s.stock_seguridad,
            estado=s.estado
        )
        stock_responses.append(stock_resp)

    # Active alerts
    active_alerts = (
        db.query(Alerta)
        .join(AlertaSucursal, Alerta.id == AlertaSucursal.id_alerta)
        .filter(AlertaSucursal.id_sucursal == branch.id, Alerta.estado == "activa")
        .all()
    )

    alert_responses = []
    for a in active_alerts:
        alert_resp = AlertResponse(
            id=a.id,
            gravedad=a.gravedad,
            mensaje=a.mensaje,
            tipo=a.tipo,
            detalle=a.detalle,
            estado=a.estado,
            id_usuario=a.id_usuario,
            usuario_nombre=a.usuario.nombre if a.usuario else None,
            fecha_creacion=a.fecha_creacion,
            sucursales=[BranchShort(id=s.id, direccion=s.direccion) for s in a.sucursales]
        )
        alert_responses.append(alert_resp)

    return BranchDetailResponse(
        **base_info.model_dump(),
        empleados=emp_responses,
        stock=stock_responses,
        alertas=alert_responses
    )

@router.post("", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(
    branch_in: BranchCreate,
    current_user: Usuario = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    if branch_in.id_gerente is not None:
        manager = db.query(Usuario).filter(Usuario.id == branch_in.id_gerente).first()
        if not manager:
            raise HTTPException(status_code=404, detail="El gerente especificado no existe")
        if manager.rol != "gerente":
            raise HTTPException(
                status_code=400,
                detail="No se puede asignar un usuario supervisor como gerente de sucursal"
            )
        # Check if already assigned to an active branch
        existing = db.query(Sucursal).filter(
            Sucursal.id_gerente == branch_in.id_gerente,
            Sucursal.activa == True
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"El gerente {manager.nombre} ya está asignado a la sucursal activa #{existing.id} ({existing.direccion})"
            )

    new_branch = Sucursal(
        direccion=branch_in.direccion.strip(),
        id_gerente=branch_in.id_gerente,
        ventas_mes=branch_in.ventas_mes,
        ventas_anio=branch_in.ventas_anio,
        ganancias_netas_mes=branch_in.ganancias_netas_mes,
        ganancias_netas_anio=branch_in.ganancias_netas_anio,
        activa=True
    )
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)

    # Initialize current month in finanzas_mensuales
    now = datetime.utcnow()
    costo_estimado = round(new_branch.ventas_mes * 0.4, 2)
    gastos_estimados = round(max(0.0, new_branch.ventas_mes - costo_estimado - new_branch.ganancias_netas_mes), 2)
    FinanceService.upsert_monthly_record(
        db=db,
        branch_id=new_branch.id,
        anio=now.year,
        mes=now.month,
        ventas=new_branch.ventas_mes,
        costo_ventas=costo_estimado,
        gastos_operativos=gastos_estimados
    )

    # Trigger initial financial alert evaluation if financial values were set
    AlertService.evaluate_financial_alerts(db, new_branch)

    return build_branch_response(new_branch, db)

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_branch(
    id: int,
    current_user: Usuario = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    branch = db.query(Sucursal).filter(Sucursal.id == id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")

    if not branch.activa:
        raise HTTPException(status_code=400, detail="La sucursal ya se encuentra eliminada")

    # Logical deletion
    branch.activa = False
    db.add(branch)
    db.commit()

    return {"message": f"Sucursal #{id} ({branch.direccion}) eliminada lógicamente con éxito"}
