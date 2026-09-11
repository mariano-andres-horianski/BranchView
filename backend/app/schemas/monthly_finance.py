from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class MonthlyFinanceBase(BaseModel):
    anio: int = Field(..., ge=2000, le=2100)
    mes: int = Field(..., ge=1, le=12)
    ventas: float = Field(..., ge=0)
    costo_ventas: float = Field(..., ge=0)
    gastos_operativos: float = Field(..., ge=0)

class MonthlyFinanceCreate(MonthlyFinanceBase):
    pass

class MonthlyFinanceUpdate(BaseModel):
    ventas: float = Field(..., ge=0)
    costo_ventas: float = Field(..., ge=0)
    gastos_operativos: float = Field(..., ge=0)
    anio: Optional[int] = None
    mes: Optional[int] = None

class MonthlyFinanceResponse(BaseModel):
    id: int
    id_sucursal: int
    anio: int
    mes: int
    mes_label: str
    ventas: float
    costo_ventas: float
    gastos_operativos: float
    ganancias_brutas: float
    ganancias_netas: float
    margen_bruto: float
    margen_neto: float

    class Config:
        from_attributes = True

class FinanceSummaryMetric(BaseModel):
    mes_label: str
    valor: float

class FinanceSummaryResponse(BaseModel):
    mejor_mes_ventas: Optional[FinanceSummaryMetric] = None
    peor_mes_ventas: Optional[FinanceSummaryMetric] = None
    mejor_mes_ganancias: Optional[FinanceSummaryMetric] = None
    peor_mes_ganancias: Optional[FinanceSummaryMetric] = None
    promedio_ventas: float = 0.0
    promedio_ganancias: float = 0.0
    crecimiento_ventas_pct: float = 0.0

class BranchFinanceHistoryResponse(BaseModel):
    history: List[MonthlyFinanceResponse]
    summary: FinanceSummaryResponse

# Comparative Analytics
class ComparativeBranchTotal(BaseModel):
    id: int
    direccion: str
    ventas_total: float
    ganancias_netas_total: float
    margen_neto_promedio: float
    margen_bruto_promedio: float

class ComparativeAnalyticsResponse(BaseModel):
    time_series_ventas: List[Dict[str, Any]]
    time_series_ganancias: List[Dict[str, Any]]
    branch_totals: List[ComparativeBranchTotal]
    ranking: List[ComparativeBranchTotal]
