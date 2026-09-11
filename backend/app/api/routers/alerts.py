from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_gerente
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.alerta import Alerta
from app.models.alerta_sucursal import AlertaSucursal
from app.schemas.alert import AlertResponse, AlertCreateManual, BranchShort
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["alerts"])

def build_alert_response(a: Alerta) -> AlertResponse:
    return AlertResponse(
        id=a.id,
        gravedad=a.gravedad,
        mensaje=a.mensaje,
        tipo=a.tipo,
        detalle=a.detalle,
        estado=a.estado,
        id_usuario=a.id_usuario,
        usuario_nombre=a.usuario.nombre if a.usuario else ("Sistema" if a.tipo != "manual" else "Desconocido"),
        fecha_creacion=a.fecha_creacion,
        sucursales=[BranchShort(id=s.id, direccion=s.direccion) for s in a.sucursales]
    )

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Alerta)
        .join(AlertaSucursal, Alerta.id == AlertaSucursal.id_alerta)
        .join(Sucursal, Sucursal.id == AlertaSucursal.id_sucursal)
        .filter(Alerta.estado == "activa", Sucursal.activa == True)
    )

    if current_user.rol == "gerente":
        if not current_user.sucursal:
            return []
        query = query.filter(AlertaSucursal.id_sucursal == current_user.sucursal.id)

    raw_alerts = query.all()
    # Deduplicate alerts by ID if multiple branches were joined
    unique_alerts = list({a.id: a for a in raw_alerts}.values())

    # Ordering required: 1. rojas, 2. naranjas, 3. amarillas, then fecha_creacion DESC
    severity_weights = {"roja": 1, "naranja": 2, "amarilla": 3}
    sorted_alerts = sorted(
        unique_alerts,
        key=lambda a: (severity_weights.get(a.gravedad, 4), -a.fecha_creacion.timestamp())
    )
    return [build_alert_response(a) for a in sorted_alerts]

@router.get("/{id}", response_model=AlertResponse)
def get_alert_detail(
    id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(Alerta).filter(Alerta.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    if current_user.rol == "gerente":
        branch_ids = [s.id for s in alert.sucursales]
        if not current_user.sucursal or current_user.sucursal.id not in branch_ids:
            raise HTTPException(status_code=403, detail="No tienes permisos para ver esta alerta")

    return build_alert_response(alert)

@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_manual_alert(
    alert_in: AlertCreateManual,
    current_user: Usuario = Depends(require_gerente),
    db: Session = Depends(get_db)
):
    if not current_user.sucursal:
        raise HTTPException(status_code=400, detail="El gerente no tiene una sucursal asignada")

    created = AlertService.create_manual_alert(
        db=db,
        branch_id=current_user.sucursal.id,
        user_id=current_user.id,
        gravedad=alert_in.gravedad,
        mensaje=alert_in.mensaje.strip(),
        detalle=alert_in.detalle.strip()
    )
    return build_alert_response(created)

@router.patch("/{id}/resolve", response_model=AlertResponse)
def resolve_alert(
    id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        resolved = AlertService.resolve_alert(db=db, alert_id=id, user=current_user)
        return build_alert_response(resolved)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
