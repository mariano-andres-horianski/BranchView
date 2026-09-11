from pydantic import BaseModel, Field

class EmployeeBase(BaseModel):
    nombre: str = Field(..., min_length=1)
    dni: str = Field(..., min_length=1)
    rol: str = Field(..., min_length=1)
    sueldo: float = Field(..., ge=0)
    asistencias: int = Field(0, ge=0)
    faltas: int = Field(0, ge=0)
    antiguedad: int = Field(0, ge=0)
    edad: int = Field(..., ge=16, le=100)

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(EmployeeBase):
    pass

class EmployeeResponse(EmployeeBase):
    id: int
    id_sucursal: int
    activo: bool

    class Config:
        from_attributes = True
