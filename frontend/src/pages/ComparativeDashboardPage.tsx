import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Percent,
  BarChart3,
  Calendar,
  Award,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Header } from '../components/layout/Header';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { Toast, ToastMessage } from '../components/common/Toast';
import { apiService } from '../services/api';
import { BranchDetail, Alert, ComparativeAnalytics } from '../types';

const BRANCH_COLORS = [
  '#2563eb', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
];

export const ComparativeDashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [analytics, setAnalytics] = useState<ComparativeAnalytics | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number>(12);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [expandedBranchEmployees, setExpandedBranchEmployees] = useState<{ [id: number]: boolean }>(
    {}
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: Date.now().toString(), type, message });
  };

  const idsParam = searchParams.get('ids') || '';

  const loadComparison = async (months: number = selectedMonths) => {
    if (!idsParam) {
      setIsLoading(false);
      return;
    }

    const ids = idsParam
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (ids.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [branchesData, analyticsData] = await Promise.all([
        apiService.branches.compare(ids),
        apiService.branches.compareAnalytics(ids, months),
      ]);
      setBranches(branchesData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al cargar la comparación de sucursales', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = async (months: number) => {
    setSelectedMonths(months);
    const ids = idsParam
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));
    if (ids.length === 0) return;

    try {
      setIsAnalyticsLoading(true);
      const data = await apiService.branches.compareAnalytics(ids, months);
      setAnalytics(data);
    } catch (err: any) {
      showToast('Error al actualizar datos comparativos del período', 'error');
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, [idsParam]);

  const toggleEmployees = (branchId: number) => {
    setExpandedBranchEmployees((prev) => ({
      ...prev,
      [branchId]: !prev[branchId],
    }));
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      await apiService.alerts.resolve(alertId);
      showToast('Alerta resuelta con éxito');
      loadComparison();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al resolver la alerta', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-16">
        <Header title="Comparando sucursales..." />
        <div className="max-w-7xl mx-auto px-8 py-20 text-center text-sm text-slate-500">
          Cargando métricas comparativas...
        </div>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="min-h-screen pb-16">
        <Header title="Comparativa no disponible" />
        <div className="max-w-7xl mx-auto px-8 py-20 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800">No se seleccionaron sucursales</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Selecciona al menos dos sucursales desde la lista principal para compararlas.
          </p>
          <button
            onClick={() => navigate('/branches')}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-xs"
          >
            Volver a Sucursales
          </button>
        </div>
      </div>
    );
  }

  // Build title list: e.g. "Comparación: Centro, Constitución y Güemes"
  const branchNames = branches.map((b) => b.direccion);
  let titleFormatted = '';
  if (branchNames.length === 1) {
    titleFormatted = branchNames[0];
  } else if (branchNames.length === 2) {
    titleFormatted = `${branchNames[0]} y ${branchNames[1]}`;
  } else {
    titleFormatted = `${branchNames.slice(0, -1).join(', ')} y ${branchNames[branchNames.length - 1]}`;
  }

  // Consolidate all alerts from selected branches
  const allAlertsWithBranch: { alert: Alert; branchDireccion: string }[] = [];
  branches.forEach((b) => {
    b.alertas.forEach((a) => {
      allAlertsWithBranch.push({
        alert: a,
        branchDireccion: b.direccion,
      });
    });
  });

  // Group summary helpers
  const salesLeader = analytics?.ranking && analytics.ranking.length > 0 ? analytics.ranking[0] : null;
  const profitLeader = analytics?.branch_totals && analytics.branch_totals.length > 0
    ? [...analytics.branch_totals].sort((a, b) => b.ganancias_netas_total - a.ganancias_netas_total)[0]
    : null;
  const marginLeader = analytics?.branch_totals && analytics.branch_totals.length > 0
    ? [...analytics.branch_totals].sort((a, b) => b.margen_neto_promedio - a.margen_neto_promedio)[0]
    : null;
  const groupTotalSales = analytics?.branch_totals
    ? analytics.branch_totals.reduce((acc, b) => acc + b.ventas_total, 0)
    : 0;
  const groupTotalProfit = analytics?.branch_totals
    ? analytics.branch_totals.reduce((acc, b) => acc + b.ganancias_netas_total, 0)
    : 0;
  const groupAvgMargin = groupTotalSales > 0 ? (groupTotalProfit / groupTotalSales) * 100 : 0;

  return (
    <div className="min-h-screen pb-16">
      <Header
        title={`Comparación: ${titleFormatted}`}
        subtitle={`Análisis financiero y operativo de ${branches.length} sucursales seleccionadas`}
        actions={
          <button
            onClick={() => navigate('/branches')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Sucursales</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 mt-8 space-y-8">
        {/* Comparative Header Bar & Period Selector */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                Tablero Comparativo de Rendimiento y Márgenes
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visualización multi-sucursal interactiva basada en historial financiero mensual
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Período:</span>
            </span>
            {[6, 12, 24].map((m) => (
              <button
                key={m}
                onClick={() => handlePeriodChange(m)}
                disabled={isAnalyticsLoading}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedMonths === m
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {m} meses
              </button>
            ))}
          </div>
        </div>

        {/* Group KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" />
              <span>Líder en Ventas</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5 truncate" title={salesLeader?.direccion}>
              {salesLeader?.direccion || '-'}
            </div>
            <div className="text-xs text-slate-600 font-semibold mt-0.5">
              ${salesLeader?.ventas_total.toLocaleString('es-AR') ?? '0'}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Líder Ganancia Neta</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5 truncate" title={profitLeader?.direccion}>
              {profitLeader?.direccion || '-'}
            </div>
            <div className="text-xs text-emerald-700 font-semibold mt-0.5">
              ${profitLeader?.ganancias_netas_total.toLocaleString('es-AR') ?? '0'}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 uppercase tracking-wider">
              <Percent className="w-3.5 h-3.5" />
              <span>Mayor Margen Neto</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5 truncate" title={marginLeader?.direccion}>
              {marginLeader?.direccion || '-'}
            </div>
            <div className="text-xs text-purple-700 font-semibold mt-0.5">
              {marginLeader?.margen_neto_promedio.toFixed(1) ?? '0'}% prom.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Ventas Totales Grupo
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5">
              ${groupTotalSales.toLocaleString('es-AR')}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              En {selectedMonths} meses
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Ganancia Neta Grupo
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5">
              ${groupTotalProfit.toLocaleString('es-AR')}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              En {selectedMonths} meses
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Margen Grupo Promedio
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5">
              {groupAvgMargin.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Rentabilidad global
            </div>
          </div>
        </div>

        {/* Visual Analytics Grid */}
        <div className="space-y-6">
          {/* Chart 1: Multi-line Temporal Evolution */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 text-blue-600" />
                  <span>Evolución Temporal Comparativa de Ventas</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparación mes a mes de cada sucursal a lo largo de los últimos {selectedMonths} meses
                </p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.time_series_ventas || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mes_label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `$${Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
                      name
                    ]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  {branches.map((b, idx) => (
                    <Line
                      key={b.id}
                      type="monotone"
                      dataKey={b.direccion}
                      name={b.direccion}
                      stroke={BRANCH_COLORS[idx % BRANCH_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2: Sales by Branch & Profit by Branch */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 2: Total Sales by Branch */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Ventas Totales por Sucursal ({selectedMonths}m)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Comparativa de facturación acumulada en el período seleccionado
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.branch_totals || []} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="direccion" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        `$${Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
                        'Ventas Totales'
                      ]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Bar dataKey="ventas_total" name="Ventas Totales" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Net Profit by Branch */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Ganancias Netas por Sucursal ({selectedMonths}m)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Resultado neto acumulado después de costos y gastos operativos
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.branch_totals || []} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="direccion" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        `$${Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
                        'Ganancia Neta Total'
                      ]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Bar dataKey="ganancias_netas_total" name="Ganancia Neta Total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 3: Margins Comparison & Branch Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 4: Margins Comparison */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Comparación de Márgenes Promedio (%)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Margen Bruto vs. Margen Neto con línea crítica de rentabilidad del 10%
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.branch_totals || []} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="direccion" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        `${Number(val).toFixed(1)}%`,
                        name === 'margen_bruto_promedio' || name === 'Margen Bruto %'
                          ? 'Margen Bruto %'
                          : 'Margen Neto %'
                      ]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <ReferenceLine
                      y={10}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: 'Límite Crítico 10%', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }}
                    />
                    <Bar dataKey="margen_bruto_promedio" name="Margen Bruto %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="margen_neto_promedio" name="Margen Neto %" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Horizontal Ranking Bar Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Ranking de Sucursales por Ventas Totales
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ordenadas de mayor a menor facturación en los últimos {selectedMonths} meses
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={analytics?.ranking || []}
                    margin={{ top: 10, right: 25, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="direccion"
                      tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        `$${Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
                        'Ventas Acumuladas'
                      ]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Bar dataKey="ventas_total" name="Ventas Acumuladas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Secondary Collapsible Detailed Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              onClick={() => setIsTableOpen(!isTableOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Tabla de Datos Consolidados (Valores Mensuales y Anuales)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>{isTableOpen ? 'Ocultar tabla' : 'Ver tabla consolidada'}</span>
                {isTableOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isTableOpen && (
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5">Sucursal</th>
                      <th className="px-6 py-3.5">Gerente</th>
                      <th className="px-6 py-3.5 text-right">Ventas Mes</th>
                      <th className="px-6 py-3.5 text-right">Ganancias Mes</th>
                      <th className="px-6 py-3.5 text-right">Margen Neto Mes</th>
                      <th className="px-6 py-3.5 text-right">Ventas {selectedMonths}m</th>
                      <th className="px-6 py-3.5 text-right">Ganancias {selectedMonths}m</th>
                      <th className="px-6 py-3.5 text-center">Alertas Activas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {branches.map((b) => {
                      const totalItem = analytics?.branch_totals.find((bt) => bt.id === b.id);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <span>{b.direccion}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-medium">{b.gerente_nombre}</td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-800">
                            ${b.ventas_mes.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-bold ${
                              b.ganancias_netas_mes <= 0 ? 'text-red-600' : 'text-slate-800'
                            }`}
                          >
                            ${b.ganancias_netas_mes.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full font-bold text-xs ${
                                b.margen_neto_mes >= 10
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : b.margen_neto_mes > 0
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {b.margen_neto_mes}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600 font-medium">
                            ${(totalItem?.ventas_total ?? b.ventas_anio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600 font-medium">
                            ${(totalItem?.ganancias_netas_total ?? b.ganancias_netas_anio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {b.alertas.length > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                {b.alertas.length} alerta{b.alertas.length > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>


        {/* Employees Comparison: COLLAPSED BY DEFAULT FOR EACH BRANCH */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Nómina de Empleados por Sucursal
            </h3>
            <p className="text-xs text-slate-500">
              Las nóminas están cerradas por defecto. Puedes expandir cada sucursal de forma independiente.
            </p>
          </div>

          <div className="space-y-3">
            {branches.map((b) => {
              const isExpanded = !!expandedBranchEmployees[b.id];
              return (
                <div key={b.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleEmployees(b.id)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="font-bold text-xs text-slate-900">
                        Sucursal {b.direccion}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        ({b.empleados.length} empleados activos)
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                      <span>{isExpanded ? 'Ocultar empleados' : 'Ver empleados'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-200 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white text-slate-600 uppercase font-semibold border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-2.5">Nombre</th>
                            <th className="px-6 py-2.5">DNI</th>
                            <th className="px-6 py-2.5">Rol</th>
                            <th className="px-6 py-2.5 text-right">Sueldo</th>
                            <th className="px-6 py-2.5 text-center">Asistencias / Faltas</th>
                            <th className="px-6 py-2.5 text-center">Antigüedad</th>
                            <th className="px-6 py-2.5 text-center">Edad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {b.empleados.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 text-center text-slate-400">
                                Sin empleados registrados en esta sucursal.
                              </td>
                            </tr>
                          ) : (
                            b.empleados.map((emp) => (
                              <tr key={emp.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-2.5 font-semibold text-slate-900">
                                  {emp.nombre}
                                </td>
                                <td className="px-6 py-2.5 font-mono text-slate-600">{emp.dni}</td>
                                <td className="px-6 py-2.5 text-slate-700">{emp.rol}</td>
                                <td className="px-6 py-2.5 text-right font-medium text-slate-800">
                                  ${emp.sueldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-2.5 text-center text-slate-600">
                                  <span className="text-emerald-700 font-medium">
                                    {emp.asistencias}
                                  </span>{' '}
                                  / <span className="text-red-600 font-medium">{emp.faltas}</span>
                                </td>
                                <td className="px-6 py-2.5 text-center text-slate-600">
                                  {emp.antiguedad} años
                                </td>
                                <td className="px-6 py-2.5 text-center text-slate-600">
                                  {emp.edad} años
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Consolidated Alerts at the bottom */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Alertas en Comparación ({allAlertsWithBranch.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Mostradas como tarjetas independientes identificando cada sucursal
            </span>
          </div>

          {allAlertsWithBranch.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-medium text-slate-600">
                Ninguna de las sucursales seleccionadas tiene alertas activas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allAlertsWithBranch.map(({ alert, branchDireccion }) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border shadow-xs space-y-3 ${
                    alert.gravedad === 'roja'
                      ? 'bg-red-50/40 border-red-200'
                      : alert.gravedad === 'naranja'
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-yellow-50/40 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge gravedad={alert.gravedad} size="sm" />
                        <span className="text-[11px] font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                          {branchDireccion}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 pt-1">{alert.mensaje}</h4>
                      <p className="text-xs text-slate-600">{alert.detalle}</p>
                    </div>

                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-300 text-xs font-semibold rounded-md shadow-xs transition-colors shrink-0"
                    >
                      Resolver
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 border-t border-slate-200/50 pt-2 flex justify-between">
                    <span>Origen: {alert.tipo.toUpperCase()}</span>
                    <span>{new Date(alert.fecha_creacion).toLocaleString('es-AR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
