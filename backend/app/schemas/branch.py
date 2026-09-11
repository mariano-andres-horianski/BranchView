from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.stock import StockResponse
from app.schemas.employee import EmployeeResponse
from app.schemas.alert import AlertResponse

class BranchBase(BaseModel):
    direccion: str = Field(..., min_length=1, max_length=255)
    id_gerente: Optional[int] = None
    ventas_mes: float = Field(0.0, ge=0)
    ventas_anio: float = Field(0.0, ge=0)
    ganancias_netas_mes: float = 0.0
    ganancias_netas_anio: float = 0.0

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    direccion: Optional[str] = None
    id_gerente: Optional[int] = None

class BranchResponse(BaseModel):
    id: int
    direccion: str
    id_gerente: Optional[int] = None
    gerente_nombre: Optional[str] = None
    ventas_mes: float
    ventas_anio: float
    ganancias_netas_mes: float
    ganancias_netas_anio: float
    margen_neto_mes: float
    activa: bool
    alertas_activas_count: int = 0
    has_roja_alert: bool = False
    has_naranja_alert: bool = False
    has_amarilla_alert: bool = False

    class Config:
        from_attributes = True

class BranchDetailResponse(BranchResponse):
    empleados: List[EmployeeResponse] = []
    stock: List[StockResponse] = []
    alertas: List[AlertResponse] = []

    class Config:
        from_attributes = True
