from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_supervisor
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.schemas.user import UserSimpleResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/managers", response_model=List[UserSimpleResponse])
def get_managers(
    current_user: Usuario = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    managers = db.query(Usuario).filter(Usuario.rol == "gerente").all()
    assigned_manager_ids = {
        s.id_gerente
        for s in db.query(Sucursal.id_gerente).filter(
            Sucursal.activa == True,
            Sucursal.id_gerente.isnot(None)
        ).all()
    }

    result = []
    for m in managers:
        result.append(
            UserSimpleResponse(
                id=m.id,
                username=m.username,
                nombre=m.nombre,
                rol=m.rol,
                is_assigned=m.id in assigned_manager_ids
            )
        )
    return result
