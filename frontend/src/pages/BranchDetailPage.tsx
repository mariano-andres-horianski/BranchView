import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Store,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Plus,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
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
import { KpiCard } from '../components/common/KpiCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Toast, ToastMessage } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import {
  BranchDetail,
  Employee,
  StockItem,
  Alert,
  MonthlyFinance,
  BranchFinancialHistory,
  BranchFinances,
} from '../types';

export const BranchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [extendedFinances, setExtendedFinances] = useState<BranchFinances | null>(null);
  const [financeHistory, setFinanceHistory] = useState<BranchFinancialHistory | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number>(12);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryTableOpen, setIsHistoryTableOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmployeesExpanded, setIsEmployeesExpanded] = useState(false); // Collapsed by default

  // Modals
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [financeForm, setFinanceForm] = useState({
    ventas: 0,
    costo_ventas: 0,
    gastos_operativos: 0,
    ventas_anio: 0,
  });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    nombre: '',
    dni: '',
    rol: '',
    sueldo: 0,
    asistencias: 0,
    faltas: 0,
    antiguedad: 0,
    edad: 25,
  });

  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);

  const [isManualAlertModalOpen, setIsManualAlertModalOpen] = useState(false);
  const [alertForm, setAlertForm] = useState<{
    gravedad: 'roja' | 'naranja' | 'amarilla';
    mensaje: string;
    detalle: string;
  }>({
    gravedad: 'amarilla',
    mensaje: '',
    detalle: '',
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: Date.now().toString(), type, message });
  };

  // Determine branch ID
  const effectiveBranchId = user?.rol === 'gerente' ? user.sucursal_id : (id ? parseInt(id, 10) : null);

  const loadBranch = async () => {
    if (!effectiveBranchId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [branchData, finData, histData] = await Promise.all([
        apiService.branches.getById(effectiveBranchId),
        apiService.finances.getByBranch(effectiveBranchId),
        apiService.finances.getHistory(effectiveBranchId, selectedMonths),
      ]);
      setBranch(branchData);
      setExtendedFinances(finData);
      setFinanceHistory(histData);
      setFinanceForm({
        ventas: finData.ventas_mes,
        costo_ventas: finData.costo_ventas_mes,
        gastos_operativos: finData.gastos_operativos_mes,
        ventas_anio: finData.ventas_anio,
      });
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al cargar los datos de la sucursal', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = async (months: number) => {
    setSelectedMonths(months);
    if (!effectiveBranchId) return;
    try {
      setIsHistoryLoading(true);
      const histData = await apiService.finances.getHistory(effectiveBranchId, months);
      setFinanceHistory(histData);
    } catch (err: any) {
      showToast('Error al actualizar período histórico', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadBranch();
  }, [effectiveBranchId]);

  // Is current user the assigned manager?
  const isBranchManager = user?.rol === 'gerente' && branch?.id_gerente === user.id;

  // Finance updates
  const handleUpdateFinances = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;

    try {
      await apiService.finances.updateCurrent(branch.id, {
        ventas: financeForm.ventas,
        costo_ventas: financeForm.costo_ventas,
        gastos_operativos: financeForm.gastos_operativos,
      });
      showToast('Finanzas actualizadas correctamente. Alertas recalculadas.');
      setIsFinanceModalOpen(false);
      loadBranch();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al actualizar finanzas', 'error');
    }
  };

  // Stock updates
  const handleOpenStockEdit = (item: StockItem) => {
    setSelectedStockItem(item);
    setNewStockQty(item.cantidad);
    setIsStockModalOpen(true);
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch || !selectedStockItem) return;

    try {
      await apiService.stock.updateQuantity(branch.id, selectedStockItem.id, newStockQty);
      showToast('Stock actualizado correctamente. Alertas recalculadas.');
      setIsStockModalOpen(false);
      loadBranch();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al actualizar stock', 'error');
    }
  };

  // Employee creation/editing
  const handleOpenEmployeeCreate = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      nombre: '',
      dni: '',
      rol: '',
      sueldo: 600000,
      asistencias: 20,
      faltas: 0,
      antiguedad: 0,
      edad: 25,
    });
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEmployeeEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      nombre: emp.nombre,
      dni: emp.dni,
      rol: emp.rol,
      sueldo: emp.sueldo,
      asistencias: emp.asistencias,
      faltas: emp.faltas,
      antiguedad: emp.antiguedad,
      edad: emp.edad,
    });
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;

    try {
      if (editingEmployee) {
        await apiService.employees.update(editingEmployee.id, employeeForm);
        showToast('Empleado actualizado correctamente');
      } else {
        await apiService.employees.create(branch.id, employeeForm);
        showToast('Empleado contratado / registrado correctamente');
      }
      setIsEmployeeModalOpen(false);
      loadBranch();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al guardar empleado', 'error');
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    setIsDeletingEmployee(true);
    try {
      await apiService.employees.delete(employeeToDelete.id);
      showToast(`Empleado ${employeeToDelete.nombre} dado de baja lógicamente`);
      setEmployeeToDelete(null);
      loadBranch();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al dar de baja al empleado', 'error');
    } finally {
      setIsDeletingEmployee(false);
    }
  };

  // Manual Alert
  const handleCreateManualAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.mensaje.trim() || !alertForm.detalle.trim()) {
      showToast('Por favor ingrese mensaje y detalle para la alerta', 'error');
      return;
    }

    try {
      await apiService.alerts.createManual(alertForm);
      showToast('Alerta manual creada correctamente');
      setIsManualAlertModalOpen(false);
      setAlertForm({ gravedad: 'amarilla', mensaje: '', detalle: '' });
      loadBranch();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al crear alerta manual', 'error');
    }
  };

  // Resolve alert
  const handleResolveAlert = async (alertId: number) => {
    try {
      await apiService.alerts.resolve(alertId);
      showToast('Alerta resuelta con éxito');
      loadBranch();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al resolver la alerta', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-16">
        <Header title="Cargando sucursal..." />
        <div className="max-w-7xl mx-auto px-8 py-20 text-center text-sm text-slate-500">
          Cargando detalles operativos de la sucursal...
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen pb-16">
        <Header title="Sucursal no disponible" />
        <div className="max-w-7xl mx-auto px-8 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800">No se pudo acceder a la sucursal</h2>
          <p className="text-xs text-slate-500 mt-1">
            No tienes permisos suficientes o la sucursal no existe.
          </p>
        </div>
      </div>
    );
  }

  const marginColor =
    branch.margen_neto_mes >= 10
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : branch.margen_neto_mes > 0
      ? 'text-amber-800 bg-amber-50 border-amber-200'
      : 'text-red-700 bg-red-50 border-red-200';

  return (
    <div className="min-h-screen pb-16">
      <Header
        title={branch.direccion}
        subtitle={`Gerente responsable: ${branch.gerente_nombre || 'Sin asignar'}`}
        actions={
          user?.rol === 'supervisor' ? (
            <button
              onClick={() => navigate('/branches')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Sucursales</span>
            </button>
          ) : undefined
        }
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 mt-8 space-y-8">
        {/* Branch Info Banner */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900">{branch.direccion}</h2>
                {branch.activa ? (
                  <StatusBadge type="active" label="Operativa" />
                ) : (
                  <StatusBadge type="inactive" label="Inactiva" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Identificador #{branch.id} • Gerente: <strong>{branch.gerente_nombre}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isBranchManager && (
              <button
                onClick={() => setIsFinanceModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Actualizar Finanzas</span>
              </button>
            )}
          </div>
        </div>

        {/* Financial Executive KPIs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Métricas Financieras del Período Actual
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Valores calculados por el backend y base de reglas automáticas de alertas
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Ventas del Mes"
              value={`$${branch.ventas_mes.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
              icon={<DollarSign className="w-4 h-4 text-blue-600" />}
            />
            <KpiCard
              title="Costo de Ventas"
              value={`$${(extendedFinances?.costo_ventas_mes ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
              icon={<DollarSign className="w-4 h-4 text-amber-500" />}
              subtitle="Costos directos de mercadería"
            />
            <KpiCard
              title="Gastos Operativos"
              value={`$${(extendedFinances?.gastos_operativos_mes ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
              icon={<DollarSign className="w-4 h-4 text-rose-500" />}
              subtitle="Alquiler, sueldos y servicios"
            />
            <KpiCard
              title="Ganancia Bruta Mes"
              value={`$${(extendedFinances?.ganancias_brutas_mes ?? (branch.ventas_mes - (extendedFinances?.costo_ventas_mes ?? 0))).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
              icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              badge={
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Margen: {(extendedFinances?.margen_bruto_mes ?? 0).toFixed(1)}%
                </span>
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <KpiCard
              title="Ganancia Neta Mes"
              value={`$${branch.ganancias_netas_mes.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
              icon={<DollarSign className="w-4 h-4" />}
              highlight={branch.ganancias_netas_mes <= 0}
              subtitle="Bruta - Gastos Op."
            />
            <KpiCard
              title="Margen Neto Mes"
              value={`${branch.margen_neto_mes.toFixed(1)}%`}
              badge={
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${marginColor}`}>
                  {branch.margen_neto_mes >= 10
                    ? 'Saludable (≥10%)'
                    : branch.margen_neto_mes > 0
                    ? 'Baja Rentabilidad (<10%)'
                    : 'Crítico (≤0%)'}
                </span>
              }
              subtitle="Objetivo: >= 10%"
              highlight={branch.margen_neto_mes < 10}
            />
            <KpiCard
              title="Ventas Acumuladas Año"
              value={`$${branch.ventas_anio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
              icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
            />
            <KpiCard
              title="Ganancias Netas Año"
              value={`$${branch.ganancias_netas_anio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
              icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
            />
          </div>
        </div>

        {/* Historical Evolution & Interactive Charts */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Evolución Histórica y Análisis Visual
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Visualizaciones interactivas de ventas, márgenes y rentabilidad temporal
              </p>
            </div>

            {/* Period Selector Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
              <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Período:</span>
              </span>
              {[6, 12, 24].map((m) => (
                <button
                  key={m}
                  onClick={() => handlePeriodChange(m)}
                  disabled={isHistoryLoading}
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

          {/* Highlights & Best/Worst Summary */}
          {financeHistory?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                  Mejor Mes Ventas
                </div>
                <div className="text-sm font-bold text-emerald-950 mt-1">
                  ${financeHistory.summary.mejor_mes_ventas?.valor.toLocaleString('es-AR') ?? '-'}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                  {financeHistory.summary.mejor_mes_ventas?.mes_label ?? '-'}
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                  Menor Mes Ventas
                </div>
                <div className="text-sm font-bold text-amber-950 mt-1">
                  ${financeHistory.summary.peor_mes_ventas?.valor.toLocaleString('es-AR') ?? '-'}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5 font-medium">
                  {financeHistory.summary.peor_mes_ventas?.mes_label ?? '-'}
                </div>
              </div>

              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                  Mejor Ganancia Neta
                </div>
                <div className="text-sm font-bold text-blue-950 mt-1">
                  ${financeHistory.summary.mejor_mes_ganancias?.valor.toLocaleString('es-AR') ?? '-'}
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5 font-medium">
                  {financeHistory.summary.mejor_mes_ganancias?.mes_label ?? '-'}
                </div>
              </div>

              <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
                  Menor Ganancia Neta
                </div>
                <div className="text-sm font-bold text-rose-950 mt-1">
                  ${financeHistory.summary.peor_mes_ganancias?.valor.toLocaleString('es-AR') ?? '-'}
                </div>
                <div className="text-[11px] text-rose-700 mt-0.5 font-medium">
                  {financeHistory.summary.peor_mes_ganancias?.mes_label ?? '-'}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Promedio Ventas
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  ${financeHistory.summary.promedio_ventas.toLocaleString('es-AR')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Mensual en {selectedMonths}m
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Tendencia Ventas
                </div>
                <div className="text-sm font-bold flex items-center gap-1 mt-1 text-slate-900">
                  {financeHistory.summary.crecimiento_ventas_pct >= 0 ? (
                    <>
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">+{financeHistory.summary.crecimiento_ventas_pct}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-4 h-4 text-rose-600" />
                      <span className="text-rose-700">{financeHistory.summary.crecimiento_ventas_pct}%</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  vs. mitad inicial
                </div>
              </div>
            </div>
          )}

          {/* 4 Interactive Visualizations (2x2 Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Evolución de Ventas */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Evolución de Ventas Mensuales
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Trayectoria de ingresos en los últimos {selectedMonths} meses
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financeHistory?.history || []} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="mes_label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`$${Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 'Ventas']}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ventas"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#2563eb' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Ventas vs Ganancias Netas */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Ventas vs. Ganancias Netas
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Comparación directa de facturación bruta y resultado neto final
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financeHistory?.history || []} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
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
                        name === 'ventas' || name === 'Ventas' ? 'Ventas' : 'Ganancias Netas'
                      ]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Line
                      type="monotone"
                      dataKey="ventas"
                      name="Ventas"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="ganancias_netas"
                      name="Ganancias Netas"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 3: Margen Neto (%) con Línea de 10% */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Margen Neto (%) y Umbral Crítico
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Alerta si cae por debajo del 10% (umbral de rentabilidad)
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financeHistory?.history || []} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="mes_label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <YAxis
                      unit="%"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toFixed(1)}%`, 'Margen Neto']}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <ReferenceLine
                      y={10}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: 'Límite Crítico 10%', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="margen_neto"
                      name="Margen Neto %"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#8b5cf6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 4: Costos y Gastos Operativos */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Estructura de Costos y Gastos
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Costo de mercadería vs. Gastos operativos mensuales
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financeHistory?.history || []} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
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
                        name === 'costo_ventas' || name === 'Costo de Ventas' ? 'Costo de Ventas' : 'Gastos Operativos'
                      ]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Bar dataKey="costo_ventas" name="Costo de Ventas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos_operativos" name="Gastos Operativos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Secondary Collapsible Detailed Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              onClick={() => setIsHistoryTableOpen(!isHistoryTableOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Tabla Detallada de Historial Mensual ({financeHistory?.history.length || 0} meses)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>{isHistoryTableOpen ? 'Ocultar Detalle' : 'Ver Detalle Numérico'}</span>
                {isHistoryTableOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isHistoryTableOpen && (
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Período</th>
                      <th className="px-5 py-3 text-right">Ventas</th>
                      <th className="px-5 py-3 text-right">Costo Ventas</th>
                      <th className="px-5 py-3 text-right">Gastos Op.</th>
                      <th className="px-5 py-3 text-right">Ganancia Bruta</th>
                      <th className="px-5 py-3 text-right">Margen Bruto</th>
                      <th className="px-5 py-3 text-right">Ganancia Neta</th>
                      <th className="px-5 py-3 text-right">Margen Neto</th>
                      <th className="px-5 py-3 text-center">Salud</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!financeHistory || financeHistory.history.length === 0) ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-6 text-center text-slate-400">
                          No hay registros históricos disponibles.
                        </td>
                      </tr>
                    ) : (
                      [...financeHistory.history].reverse().map((item) => {
                        const statusColor =
                          item.margen_neto >= 10
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : item.margen_neto > 0
                            ? 'text-amber-800 bg-amber-50 border-amber-200'
                            : 'text-red-700 bg-red-50 border-red-200';
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3 font-semibold text-slate-900">{item.mes_label}</td>
                            <td className="px-5 py-3 text-right font-medium text-slate-800">
                              ${item.ventas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-600">
                              ${item.costo_ventas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-600">
                              ${item.gastos_operativos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-3 text-right font-medium text-slate-800">
                              ${item.ganancias_brutas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-600 font-medium">
                              {item.margen_bruto.toFixed(1)}%
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-slate-900">
                              ${item.ganancias_netas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-slate-900">
                              {item.margen_neto.toFixed(1)}%
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                                {item.margen_neto >= 10 ? 'Saludable' : item.margen_neto > 0 ? 'Bajo' : 'Crítico'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>


        {/* Stock Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Control de Stock</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Estados calculados dinámicamente
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Producto</th>
                  <th className="px-6 py-3">Cantidad Actual</th>
                  <th className="px-6 py-3">Stock de Seguridad</th>
                  <th className="px-6 py-3">Estado Calculado</th>
                  {isBranchManager && <th className="px-6 py-3 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branch.stock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                      No hay productos registrados en esta sucursal.
                    </td>
                  </tr>
                ) : (
                  branch.stock.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {item.nombre_producto}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-800">
                        {item.cantidad} unidades
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {item.stock_seguridad} unidades
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge type={item.estado} />
                      </td>
                      {isBranchManager && (
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => handleOpenStockEdit(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Actualizar</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Employees Section (COLLAPSED BY DEFAULT) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div
            onClick={() => setIsEmployeesExpanded(!isEmployeesExpanded)}
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Nómina de Empleados ({branch.empleados.length} activos)
                </h3>
                <p className="text-xs text-slate-500">
                  {isEmployeesExpanded
                    ? 'Haz clic para colapsar la nómina'
                    : 'Sección colapsada por defecto. Haz clic para expandir y consultar.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isBranchManager && isEmployeesExpanded && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEmployeeCreate();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Contratar Empleado</span>
                </button>
              )}
              <div className="p-1 rounded-md text-slate-400">
                {isEmployeesExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>

          {isEmployeesExpanded && (
            <div className="border-t border-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Nombre</th>
                    <th className="px-6 py-3">DNI</th>
                    <th className="px-6 py-3">Rol</th>
                    <th className="px-6 py-3">Sueldo</th>
                    <th className="px-6 py-3">Asistencias / Faltas</th>
                    <th className="px-6 py-3">Antigüedad</th>
                    <th className="px-6 py-3">Edad</th>
                    {isBranchManager && <th className="px-6 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branch.empleados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-6 text-center text-slate-400">
                        No hay empleados activos en esta sucursal.
                      </td>
                    </tr>
                  ) : (
                    branch.empleados.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-900">{emp.nombre}</td>
                        <td className="px-6 py-3 font-mono text-slate-600">{emp.dni}</td>
                        <td className="px-6 py-3 text-slate-700">{emp.rol}</td>
                        <td className="px-6 py-3 font-medium text-slate-800">
                          ${emp.sueldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-slate-600">
                          <span className="text-emerald-700 font-medium">{emp.asistencias}</span> /{' '}
                          <span className="text-red-600 font-medium">{emp.faltas}</span>
                        </td>
                        <td className="px-6 py-3 text-slate-600">{emp.antiguedad} años</td>
                        <td className="px-6 py-3 text-slate-600">{emp.edad} años</td>
                        {isBranchManager && (
                          <td className="px-6 py-3 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEmployeeEdit(emp)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar empleado"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEmployeeToDelete(emp)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Dar de baja lógicamente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Branch Alerts Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Alertas Activas de la Sucursal ({branch.alertas.length})
              </h3>
            </div>
            {isBranchManager && (
              <button
                onClick={() => setIsManualAlertModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Alerta Manual</span>
              </button>
            )}
          </div>

          {branch.alertas.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-100">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">
                No hay alertas activas en esta sucursal. Todas las condiciones son normales.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {branch.alertas.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-all ${
                    alert.gravedad === 'roja'
                      ? 'bg-red-50/50 border-red-200'
                      : alert.gravedad === 'naranja'
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-yellow-50/50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge gravedad={alert.gravedad} size="sm" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {alert.tipo === 'stock'
                            ? 'Alerta Automática de Stock'
                            : alert.tipo === 'financiera'
                            ? 'Alerta Automática Financiera'
                            : 'Alerta Operativa Manual'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{alert.mensaje}</h4>
                      <p className="text-xs text-slate-600 whitespace-pre-line">{alert.detalle}</p>
                      <div className="text-[11px] text-slate-400 pt-1">
                        Fecha: {new Date(alert.fecha_creacion).toLocaleString('es-AR')} • Creado por:{' '}
                        {alert.usuario_nombre || 'Sistema'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-300 text-xs font-semibold rounded-md shadow-xs transition-colors shrink-0"
                    >
                      Resolver Alerta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Editar Finanzas */}
      <Modal
        isOpen={isFinanceModalOpen}
        onClose={() => setIsFinanceModalOpen(false)}
        title="Actualizar Datos Financieros del Mes Actual"
      >
        <form onSubmit={handleUpdateFinances} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ventas del Mes ($) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={financeForm.ventas}
              onChange={(e) =>
                setFinanceForm({ ...financeForm, ventas: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Costo de Ventas ($) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={financeForm.costo_ventas}
              onChange={(e) =>
                setFinanceForm({ ...financeForm, costo_ventas: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Costo directo de adquisición o producción de los productos vendidos.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gastos Operativos ($) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={financeForm.gastos_operativos}
              onChange={(e) =>
                setFinanceForm({ ...financeForm, gastos_operativos: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Gastos de funcionamiento: alquiler, servicios, sueldos administrativos, mantenimiento.
            </p>
          </div>

          {/* Live derived preview */}
          {(() => {
            const v = financeForm.ventas;
            const cv = financeForm.costo_ventas;
            const go = financeForm.gastos_operativos;
            const gb = v - cv;
            const gn = gb - go;
            const mb = v > 0 ? (gb / v) * 100 : 0;
            const mn = v > 0 ? (gn / v) * 100 : 0;

            return (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2.5 mt-3">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Cálculos Derivados Automáticos (Vista Previa)
                </div>
                <div className="grid grid-cols-2 gap-3 text-slate-600">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Ganancia Bruta:</span>
                    <strong className={`text-sm ${gb < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      ${gb.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Margen Bruto:</span>
                    <strong className={`text-sm ${mb < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {mb.toFixed(1)}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Ganancia Neta:</span>
                    <strong className={`text-sm ${gn <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      ${gn.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Margen Neto:</span>
                    <strong className={`text-sm ${mn < 10 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {mn.toFixed(1)}%
                    </strong>
                  </div>
                </div>

                {mn < 10 && (
                  <div className="text-[11px] flex items-center gap-2 text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      {mn <= 0
                        ? 'Generará ALERTA ROJA (Ganancia neta nula o negativa)'
                        : 'Generará ALERTA NARANJA (Margen neto < 10%)'}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFinanceModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              Guardar y Recalcular
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Actualizar Stock */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Actualizar Stock: ${selectedStockItem?.nombre_producto}`}
      >
        <form onSubmit={handleUpdateStock} className="space-y-4">
          <div>
            <p className="text-xs text-slate-600 mb-3">
              Stock de seguridad configurado:{' '}
              <strong>{selectedStockItem?.stock_seguridad} unidades</strong>.
            </p>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nueva Cantidad Disponible
            </label>
            <input
              type="number"
              min="0"
              required
              value={newStockQty}
              onChange={(e) => setNewStockQty(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStockModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Guardar Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Empleado Form (Contratar/Editar) */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        title={editingEmployee ? 'Editar Datos de Empleado' : 'Contratar / Registrar Empleado'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={employeeForm.nombre}
                onChange={(e) => setEmployeeForm({ ...employeeForm, nombre: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">DNI *</label>
              <input
                type="text"
                required
                value={employeeForm.dni}
                onChange={(e) => setEmployeeForm({ ...employeeForm, dni: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rol / Puesto *</label>
              <input
                type="text"
                required
                value={employeeForm.rol}
                onChange={(e) => setEmployeeForm({ ...employeeForm, rol: e.target.value })}
                placeholder="Ej. Barista, Encargado, Cajero"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sueldo ($) *</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={employeeForm.sueldo}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, sueldo: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Asistencias</label>
              <input
                type="number"
                min="0"
                value={employeeForm.asistencias}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, asistencias: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Faltas</label>
              <input
                type="number"
                min="0"
                value={employeeForm.faltas}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, faltas: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Antigüedad (años)</label>
              <input
                type="number"
                min="0"
                value={employeeForm.antiguedad}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, antiguedad: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Edad</label>
              <input
                type="number"
                min="16"
                max="99"
                value={employeeForm.edad}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, edad: parseInt(e.target.value, 10) || 18 })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEmployeeModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              {editingEmployee ? 'Guardar Cambios' : 'Registrar Empleado'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmación Baja Lógica Empleado */}
      <ConfirmDialog
        isOpen={!!employeeToDelete}
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={handleDeleteEmployee}
        title="Dar de Baja a Empleado"
        message={`¿Seguro que deseas dar de baja al empleado ${employeeToDelete?.nombre} (DNI ${employeeToDelete?.dni})? La baja será lógica y se mantendrá en el registro histórico.`}
        confirmText="Confirmar Baja Lógica"
        isLoading={isDeletingEmployee}
      />

      {/* Modal: Crear Alerta Manual */}
      <Modal
        isOpen={isManualAlertModalOpen}
        onClose={() => setIsManualAlertModalOpen(false)}
        title="Crear Alerta Operativa Manual"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateManualAlert} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gravedad</label>
            <select
              value={alertForm.gravedad}
              onChange={(e) =>
                setAlertForm({
                  ...alertForm,
                  gravedad: e.target.value as 'roja' | 'naranja' | 'amarilla',
                })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="amarilla">Amarilla — Advertencia / Mantenimiento preventivo</option>
              <option value="naranja">Naranja — Importante / Afectación parcial de servicio</option>
              <option value="roja">Roja — Crítica / Emergencia operativa (robo, rotura caño, etc.)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título o Mensaje Resumido *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Rotura de cañería en barra de cocina"
              value={alertForm.mensaje}
              onChange={(e) => setAlertForm({ ...alertForm, mensaje: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detalle Extenso del Incidente *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describa con precisión lo ocurrido, medidas inmediatas adoptadas y seguimiento requerido..."
              value={alertForm.detalle}
              onChange={(e) => setAlertForm({ ...alertForm, detalle: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsManualAlertModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Publicar Alerta Manual
            </button>
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
