export type UserRole = 'supervisor' | 'gerente';

export interface User {
  id: number;
  username: string;
  nombre: string;
  rol: UserRole;
  sucursal_id?: number | null;
  sucursal_direccion?: string | null;
}

export interface Branch {
  id: number;
  direccion: string;
  id_gerente: number | null;
  gerente_nombre?: string;
  ventas_mes: number;
  ventas_anio: number;
  ganancias_netas_mes: number;
  ganancias_netas_anio: number;
  margen_neto_mes: number;
  activa: boolean;
  alertas_activas_count: number;
  has_roja_alert: boolean;
  has_naranja_alert: boolean;
  has_amarilla_alert: boolean;
}

export interface Employee {
  id: number;
  id_sucursal: number;
  nombre: string;
  dni: string;
  rol: string;
  sueldo: number;
  asistencias: number;
  faltas: number;
  antiguedad: number;
  edad: number;
  activo: boolean;
}

export interface StockItem {
  id: number;
  id_sucursal: number;
  nombre_producto: string;
  cantidad: number;
  stock_seguridad: number;
  estado: 'normal' | 'bajo' | 'agotado';
}

export interface Alert {
  id: number;
  gravedad: 'roja' | 'naranja' | 'amarilla';
  mensaje: string;
  tipo: 'stock' | 'financiera' | 'manual';
  detalle: string;
  estado: 'activa' | 'resuelta';
  id_usuario?: number | null;
  usuario_nombre?: string | null;
  fecha_creacion: string;
  sucursales: { id: number; direccion: string }[];
}

export interface BranchDetail extends Branch {
  empleados: Employee[];
  stock: StockItem[];
  alertas: Alert[];
}

export interface ManagerUser {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  is_assigned: boolean;
}

export interface MonthlyFinance {
  id: number;
  id_sucursal: number;
  anio: number;
  mes: number;
  mes_label: string;
  ventas: number;
  costo_ventas: number;
  gastos_operativos: number;
  ganancias_brutas: number;
  ganancias_netas: number;
  margen_bruto: number;
  margen_neto: number;
}

export interface FinanceSummaryMetric {
  mes_label: string;
  valor: number;
}

export interface FinanceSummary {
  mejor_mes_ventas?: FinanceSummaryMetric | null;
  peor_mes_ventas?: FinanceSummaryMetric | null;
  mejor_mes_ganancias?: FinanceSummaryMetric | null;
  peor_mes_ganancias?: FinanceSummaryMetric | null;
  promedio_ventas: number;
  promedio_ganancias: number;
  crecimiento_ventas_pct: number;
}

export interface BranchFinancialHistory {
  history: MonthlyFinance[];
  summary: FinanceSummary;
}

export interface ComparativeBranchTotal {
  id: number;
  direccion: string;
  ventas_total: number;
  ganancias_netas_total: number;
  margen_neto_promedio: number;
  margen_bruto_promedio: number;
}

export interface ComparativeAnalytics {
  time_series_ventas: Record<string, any>[];
  time_series_ganancias: Record<string, any>[];
  branch_totals: ComparativeBranchTotal[];
  ranking: ComparativeBranchTotal[];
}

export interface BranchFinances {
  ventas_mes: number;
  ventas_anio: number;
  ganancias_netas_mes: number;
  ganancias_netas_anio: number;
  margen_neto_mes: number;
  costo_ventas_mes: number;
  gastos_operativos_mes: number;
  ganancias_brutas_mes: number;
  margen_bruto_mes: number;
}
