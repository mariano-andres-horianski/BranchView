from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class AlertBase(BaseModel):
    gravedad: str = Field(..., pattern="^(roja|naranja|amarilla)$")
    mensaje: str = Field(..., min_length=1, max_length=255)
    detalle: str = Field(..., min_length=1)

class AlertCreateManual(AlertBase):
    pass

class BranchShort(BaseModel):
    id: int
    direccion: str

    class Config:
        from_attributes = True

class AlertResponse(AlertBase):
    id: int
    tipo: str  # 'stock', 'financiera', 'manual'
    estado: str  # 'activa', 'resuelta'
    id_usuario: Optional[int] = None
    usuario_nombre: Optional[str] = None
    fecha_creacion: datetime
    sucursales: List[BranchShort] = []

    class Config:
        from_attributes = True
