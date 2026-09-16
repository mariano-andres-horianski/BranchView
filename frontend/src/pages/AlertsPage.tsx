import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Building2,
  RefreshCw,
  Search,
  Filter,
  Package,
  TrendingDown,
  Wrench,
  Sparkles,
  X,
  Clock,
  ShieldAlert,
  Info,
  Check
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { Toast, ToastMessage } from '../components/common/Toast';
import {
  SeverityFilterCard,
  CategoryFilterButton,
  ResolveAlertButton,
  ClearFiltersButton,
  RefreshAlertsButton,
} from '../components/alerts/AlertButtons';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../types';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // Filtros activos
  const [filterSeverity, setFilterSeverity] = useState<'todas' | 'roja' | 'naranja' | 'amarilla'>('todas');
  const [filterType, setFilterType] = useState<'todos' | 'stock' | 'financiera' | 'manual'>('todos');
  const [filterBranch, setFilterBranch] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  const { user } = useAuth();

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: Date.now().toString(), type, message });
  };

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.alerts.getAll();
      setAlerts(data);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al cargar las alertas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolveAlert = async (alertId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setResolvingId(alertId);
      await apiService.alerts.resolve(alertId);
      showToast('Alerta resuelta con éxito');
      await loadAlerts();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al resolver la alerta', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  // Contadores por gravedad
  const redCount = alerts.filter((a) => a.gravedad === 'roja').length;
  const orangeCount = alerts.filter((a) => a.gravedad === 'naranja').length;
  const yellowCount = alerts.filter((a) => a.gravedad === 'amarilla').length;

  // Lista única de sucursales presentes en las alertas
  const uniqueBranches = useMemo(() => {
    const set = new Set<string>();
    alerts.forEach((a) => {
      a.sucursales.forEach((s) => {
        if (s.direccion) set.add(s.direccion);
      });
    });
    return Array.from(set).sort();
  }, [alerts]);

  // Filtrado reactivo
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filterSeverity !== 'todas' && alert.gravedad !== filterSeverity) {
        return false;
      }
      if (filterType !== 'todos' && alert.tipo !== filterType) {
        return false;
      }
      if (filterBranch !== 'todas') {
        const hasBranch = alert.sucursales.some((s) => s.direccion === filterBranch);
        if (!hasBranch) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inMsg = alert.mensaje.toLowerCase().includes(q);
        const inDet = alert.detalle.toLowerCase().includes(q);
        const inBranch = alert.sucursales.some((s) => s.direccion.toLowerCase().includes(q));
        const inUser = (alert.usuario_nombre || '').toLowerCase().includes(q);
        if (!inMsg && !inDet && !inBranch && !inUser) return false;
      }
      return true;
    });
  }, [alerts, filterSeverity, filterType, filterBranch, searchQuery]);

  const hasActiveFilters =
    filterSeverity !== 'todas' || filterType !== 'todos' || filterBranch !== 'todas' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setFilterSeverity('todas');
    setFilterType('todos');
    setFilterBranch('todas');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50/50">
      <Header
        title="Centro de Alertas Operativas"
        subtitle={
          user?.rol === 'supervisor'
            ? 'Monitoreo consolidado de incidentes críticos, advertencias de stock y rentabilidad'
            : 'Alertas activas correspondientes a su sucursal asignada'
        }
        actions={
          <RefreshAlertsButton isLoading={isLoading} onRefresh={loadAlerts} />
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-7">
        {/* SECCIÓN 1: RESUMEN Y FILTROS POR GRAVEDAD (SEMÁNTICA: SECTION + COMPONENTES) */}
        <section aria-label="Resumen de alertas y filtros por gravedad">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SeverityFilterCard
              severity="todas"
              isActive={filterSeverity === 'todas'}
              count={alerts.length}
              label="Total de Alertas"
              sublabel="Filtrar todas"
              onClick={() => setFilterSeverity('todas')}
            />

            <SeverityFilterCard
              severity="roja"
              isActive={filterSeverity === 'roja'}
              count={redCount}
              label="Críticas (Rojas)"
              sublabel="Quiebre o pérdida"
              onClick={() => setFilterSeverity(filterSeverity === 'roja' ? 'todas' : 'roja')}
            />

            <SeverityFilterCard
              severity="naranja"
              isActive={filterSeverity === 'naranja'}
              count={orangeCount}
              label="Importantes (Naranjas)"
              sublabel="Margen neto < 10%"
              onClick={() => setFilterSeverity(filterSeverity === 'naranja' ? 'todas' : 'naranja')}
            />

            <SeverityFilterCard
              severity="amarilla"
              isActive={filterSeverity === 'amarilla'}
              count={yellowCount}
              label="Advertencias (Amarillas)"
              sublabel="Stock de seguridad"
              onClick={() => setFilterSeverity(filterSeverity === 'amarilla' ? 'todas' : 'amarilla')}
            />
          </div>
        </section>

        {/* SECCIÓN 2: BUSCADOR Y FILTRADO AVANZADO (SEMÁNTICA: SECTION, FORM, NAV) */}
        <section
          aria-label="Controles de búsqueda y filtros"
          className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4"
        >
          <form role="search" onSubmit={(e) => e.preventDefault()} className="flex flex-col md:flex-row gap-3">
            {/* Buscador */}
            <div className="flex-1 relative">
              <label htmlFor="alerts-search-input" className="sr-only">
                Buscar alertas por motivo, producto o sucursal
              </label>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                id="alerts-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por motivo, producto, sucursal o reporte..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Borrar búsqueda"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selector de Sucursal */}
            {user?.rol === 'supervisor' && uniqueBranches.length > 1 && (
              <div className="w-full md:w-64">
                <label htmlFor="branch-filter-select" className="sr-only">
                  Filtrar por sucursal
                </label>
                <select
                  id="branch-filter-select"
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="w-full py-2 px-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/60 font-medium text-slate-700"
                >
                  <option value="todas">Todas las sucursales</option>
                  {uniqueBranches.map((dir) => (
                    <option key={dir} value={dir}>
                      {dir}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form>

          {/* Filtro por Categoría / Tipo (SEMÁNTICA: NAV + COMPONENTES) */}
          <nav aria-label="Filtro por tipo de incidente" className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>Tipo:</span>
              </span>

              <CategoryFilterButton
                label="Todos"
                isActive={filterType === 'todos'}
                onClick={() => setFilterType('todos')}
              />

              <CategoryFilterButton
                label="Stock de Insumos"
                isActive={filterType === 'stock'}
                icon={Package}
                onClick={() => setFilterType('stock')}
              />

              <CategoryFilterButton
                label="Rentabilidad Financiera"
                isActive={filterType === 'financiera'}
                icon={TrendingDown}
                onClick={() => setFilterType('financiera')}
              />

              <CategoryFilterButton
                label="Incidentes Operativos"
                isActive={filterType === 'manual'}
                icon={Wrench}
                onClick={() => setFilterType('manual')}
              />
            </div>

            {hasActiveFilters && <ClearFiltersButton onClear={clearFilters} />}
          </nav>
        </section>

        {/* SECCIÓN 3: LISTADO DE ALERTAS (SEMÁNTICA: SECTION, UL, LI, ARTICLE, HEADER, FOOTER, TIME) */}
        <section aria-label="Listado de alertas activas" className="space-y-4">
          <header className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Alertas Detectadas ({filteredAlerts.length})
            </h3>
            <span className="text-xs font-medium text-slate-500">
              Prioridad por gravedad: 1° Roja → 2° Naranja → 3° Amarilla
            </span>
          </header>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" aria-hidden="true" />
              <span>Cargando centro de alertas...</span>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                {hasActiveFilters ? 'No se encontraron alertas con estos filtros' : 'Sin alertas activas'}
              </h4>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {hasActiveFilters
                  ? 'Prueba modificando el término de búsqueda o seleccionando otra gravedad.'
                  : 'Todas las sucursales monitoreadas operan dentro de los márgenes óptimos de rentabilidad y stock.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ver todas las alertas ({alerts.length})</span>
                </button>
              )}
            </div>
          ) : (
            <ul role="list" className="space-y-3.5">
              {filteredAlerts.map((alert) => {
                const branchDireccion =
                  alert.sucursales.length > 0 ? alert.sucursales[0].direccion : 'General';

                const borderAccent =
                  alert.gravedad === 'roja'
                    ? 'border-l-4 border-l-red-500'
                    : alert.gravedad === 'naranja'
                    ? 'border-l-4 border-l-amber-500'
                    : 'border-l-4 border-l-yellow-400';

                return (
                  <li key={alert.id}>
                    <article
                      aria-labelledby={`alert-title-${alert.id}`}
                      className={`bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 p-5 sm:p-6 ${borderAccent}`}
                    >
                      {/* ENCABEZADO DEL ARTÍCULO (SEMÁNTICA: HEADER) */}
                      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                        {/* Insignias: Gravedad + Tipo + Sucursal */}
                        <div className="flex flex-wrap items-center gap-2">
                          <SeverityBadge gravedad={alert.gravedad} size="sm" />

                          {alert.tipo === 'stock' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Package className="w-3 h-3" aria-hidden="true" />
                              <span>Stock</span>
                            </span>
                          )}
                          {alert.tipo === 'financiera' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <TrendingDown className="w-3 h-3" aria-hidden="true" />
                              <span>Finanzas</span>
                            </span>
                          )}
                          {alert.tipo === 'manual' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              <Wrench className="w-3 h-3" aria-hidden="true" />
                              <span>Operativa</span>
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200/80">
                            <Building2 className="w-3 h-3 text-blue-600" aria-hidden="true" />
                            <span>{branchDireccion}</span>
                          </span>
                        </div>

                        {/* Fecha semántica con TIME y Botón Resolver */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <time
                            dateTime={alert.fecha_creacion}
                            className="flex items-center gap-1.5 text-xs text-slate-400 font-medium"
                          >
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {new Date(alert.fecha_creacion).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </time>

                          <ResolveAlertButton
                            alertId={alert.id}
                            isResolving={resolvingId === alert.id}
                            onResolve={handleResolveAlert}
                          />
                        </div>
                      </header>

                      {/* CUERPO DEL ARTÍCULO: TÍTULO Y DESCRIPCIÓN */}
                      <div className="pt-3.5 space-y-2.5">
                        <h4
                          id={`alert-title-${alert.id}`}
                          className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug"
                        >
                          {alert.mensaje}
                        </h4>

                        {/* Recuadro de Detalle Completo */}
                        <p className="p-3.5 bg-slate-50/90 border border-slate-200/70 rounded-xl text-sm text-slate-700 leading-relaxed font-normal">
                          {alert.detalle}
                        </p>
                      </div>

                      {/* PIE DEL ARTÍCULO (SEMÁNTICA: FOOTER) */}
                      <footer className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            <span>
                              Reportado por:{' '}
                              <strong className="text-slate-700">
                                {alert.usuario_nombre || 'Sistema Automático'}
                              </strong>
                            </span>
                          </span>
                          <span className="text-slate-300" aria-hidden="true">•</span>
                          <span className="font-mono text-slate-400">ID #{alert.id}</span>
                        </div>

                        {/* Nota contextual según el tipo */}
                        <div className="text-[11px] font-medium text-slate-500">
                          {alert.tipo === 'stock' && (
                            <span className="text-blue-700">
                              💡 Se auto-resolverá cuando el stock supere el nivel de seguridad
                            </span>
                          )}
                          {alert.tipo === 'financiera' && (
                            <span className="text-emerald-700">
                              💡 Se auto-resolverá cuando el margen neto mensual alcance o supere el 10%
                            </span>
                          )}
                          {alert.tipo === 'manual' && (
                            <span className="text-purple-700">
                              🛠️ Requiere resolución manual por supervisor o gerente
                            </span>
                          )}
                        </div>
                      </footer>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

