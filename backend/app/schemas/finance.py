from typing import Optional
from pydantic import BaseModel, Field

class FinanceUpdate(BaseModel):
    ventas_mes: float = Field(..., ge=0)
    costo_ventas_mes: float = Field(0.0, ge=0)
    gastos_operativos_mes: float = Field(0.0, ge=0)
    ventas_anio: Optional[float] = Field(None, ge=0)
    ganancias_netas_mes: Optional[float] = None
    ganancias_netas_anio: Optional[float] = None

class FinanceResponse(BaseModel):
    ventas_mes: float
    ventas_anio: float
    ganancias_netas_mes: float
    ganancias_netas_anio: float
    margen_neto_mes: float
    costo_ventas_mes: float = 0.0
    gastos_operativos_mes: float = 0.0
    ganancias_brutas_mes: float = 0.0
    margen_bruto_mes: float = 0.0

    class Config:
        from_attributes = True
