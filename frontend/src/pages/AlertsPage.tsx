import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  User,
  Building2,
  RefreshCw,
  Info
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { Toast, ToastMessage } from '../components/common/Toast';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../types';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAlertIds, setExpandedAlertIds] = useState<{ [id: number]: boolean }>({});
  const [toast, setToast] = useState<ToastMessage | null>(null);

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

  const toggleExpand = (id: number) => {
    setExpandedAlertIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleResolveAlert = async (alertId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiService.alerts.resolve(alertId);
      showToast('Alerta marcada como resuelta.');
      loadAlerts();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al resolver la alerta', 'error');
    }
  };

  // Group alerts count by severity
  const redCount = alerts.filter((a) => a.gravedad === 'roja').length;
  const orangeCount = alerts.filter((a) => a.gravedad === 'naranja').length;
  const yellowCount = alerts.filter((a) => a.gravedad === 'amarilla').length;

  return (
    <div className="min-h-screen pb-16">
      <Header
        title="Centro de Alertas Operativas"
        subtitle={
          user?.rol === 'supervisor'
            ? 'Monitoreo consolidado de incidentes críticos, advertencias de stock y rentabilidad'
            : 'Alertas activas correspondientes a su sucursal asignada'
        }
        actions={
          <button
            onClick={loadAlerts}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 mt-8 space-y-6">
        {/* Severity Counters Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-600" />
              <div>
                <span className="text-xs font-bold text-red-900 uppercase tracking-wider">
                  Críticas / Rojas
                </span>
                <p className="text-[11px] text-red-700">Stock agotado o rentabilidad nula/negativa</p>
              </div>
            </div>
            <span className="text-2xl font-black text-red-700">{redCount}</span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div>
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Importantes / Naranjas
                </span>
                <p className="text-[11px] text-amber-700">Margen neto mensual inferior al 10%</p>
              </div>
            </div>
            <span className="text-2xl font-black text-amber-800">{orangeCount}</span>
          </div>

          <div className="bg-yellow-50/70 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div>
                <span className="text-xs font-bold text-yellow-900 uppercase tracking-wider">
                  Advertencias / Amarillas
                </span>
                <p className="text-[11px] text-yellow-700">Stock bajo umbral de seguridad</p>
              </div>
            </div>
            <span className="text-2xl font-black text-yellow-800">{yellowCount}</span>
          </div>
        </div>

        {/* Alerts List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Listado de Alertas Activas ({alerts.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Orden obligatorio por gravedad: 1° Rojas → 2° Naranjas → 3° Amarillas (Fecha desc.)
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-500">Cargando alertas...</div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">No hay alertas activas</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Todas las sucursales operan bajo parámetros normales de stock y rentabilidad.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((alert) => {
                const isExpanded = !!expandedAlertIds[alert.id];
                const branchDireccion =
                  alert.sucursales.length > 0 ? alert.sucursales[0].direccion : 'General';

                return (
                  <div
                    key={alert.id}
                    onClick={() => toggleExpand(alert.id)}
                    className="p-5 hover:bg-slate-50/80 transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Indicator, Branch address, Message */}
                      <div className="flex items-start sm:items-center gap-3">
                        <SeverityBadge gravedad={alert.gravedad} size="sm" />
                        <div className="space-y-0.5">
                          <span className="font-bold text-sm text-slate-900">
                            {branchDireccion} — {alert.mensaje}
                          </span>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(alert.fecha_creacion).toLocaleString('es-AR')}
                            </span>
                            <span>•</span>
                            <span className="capitalize font-medium text-slate-500">
                              Tipo: {alert.tipo}
                            </span>
                            {alert.usuario_nombre && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-500">
                                  <User className="w-3 h-3" />
                                  {alert.usuario_nombre}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={(e) => handleResolveAlert(alert.id, e)}
                          className="px-3.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-300 text-xs font-semibold rounded-md shadow-xs transition-colors"
                        >
                          Resolver alerta
                        </button>
                        <div className="text-slate-400 p-1">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details Accordion */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-4 rounded-lg space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <Info className="w-3.5 h-3.5 text-blue-600" />
                          <span>Detalle Completo del Incidente</span>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {alert.detalle}
                        </p>
                        <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-200/60 flex flex-wrap gap-4">
                          <span>
                            Identificador: <strong>#{alert.id}</strong>
                          </span>
                          <span>
                            Sucursal asignada: <strong>{branchDireccion}</strong>
                          </span>
                          <span>
                            Reportado por:{' '}
                            <strong>{alert.usuario_nombre || 'Módulo Automático del Sistema'}</strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
