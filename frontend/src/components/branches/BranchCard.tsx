import React from 'react';
import {
  CheckSquare,
  Square,
  User,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { Branch } from '../../types';

interface BranchCardProps {
  branch: Branch;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onDelete: (branch: Branch) => void;
  onNavigate: (id: number) => void;
  isTourTarget?: boolean;
}

export const BranchCard: React.FC<BranchCardProps> = ({
  branch,
  isSelected,
  onToggleSelect,
  onDelete,
  onNavigate,
  isTourTarget = false,
}) => {
  const formatCurrency = (val: number) =>
    `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  const getMarginColorClass = (margin: number) => {
    if (margin >= 10) return 'text-emerald-700';
    if (margin > 0) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <article
      {...(isTourTarget ? { 'data-tour': 'branch-card' } : {})}
      aria-label={`Sucursal ${branch.direccion}`}
      className={`bg-white rounded-xl border transition-all relative flex flex-col ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
          : 'border-slate-200 hover:border-slate-300 shadow-xs'
      } ${!branch.activa ? 'opacity-65 bg-slate-50' : ''}`}
    >
      {/* Encabezado de la tarjeta */}
      <header className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              disabled={!branch.activa}
              onClick={() => onToggleSelect(branch.id)}
              aria-label={
                isSelected
                  ? `Deseleccionar ${branch.direccion}`
                  : `Seleccionar ${branch.direccion}`
              }
              className="mt-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded-sm"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" aria-hidden="true" />
              ) : (
                <Square className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
            <div>
              <h3 className="font-bold text-sm text-slate-900 leading-snug">
                {branch.direccion}
              </h3>
              <p className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <User className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>
                  Gerente: <strong>{branch.gerente_nombre}</strong>
                </span>
              </p>
            </div>
          </div>

          <div>
            <StatusBadge
              type={branch.activa ? 'active' : 'inactive'}
              label={branch.activa ? 'Operativa' : 'Inactiva'}
            />
          </div>
        </div>
      </header>

      {/* Resumen financiero estructurado */}
      <dl className="px-5 py-3 border-y border-slate-100 bg-slate-50/50 space-y-2 m-0">
        <div className="flex justify-between items-center text-xs">
          <dt className="text-slate-500 font-medium">Ventas Mes:</dt>
          <dd className="font-semibold text-slate-800 m-0">
            {formatCurrency(branch.ventas_mes)}
          </dd>
        </div>

        <div className="flex justify-between items-center text-xs">
          <dt className="text-slate-500 font-medium">Margen Neto:</dt>
          <dd className={`font-bold m-0 ${getMarginColorClass(branch.margen_neto_mes)}`}>
            {branch.margen_neto_mes}%
          </dd>
        </div>
      </dl>

      {/* Indicadores de alertas operativas */}
      <section
        aria-label="Estado de alertas operativas"
        className="px-5 py-2.5 flex items-center justify-between text-xs"
      >
        <span className="text-slate-500 font-medium">Estado de Alertas:</span>
        <div>
          {branch.alertas_activas_count === 0 ? (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Sin alertas
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              {branch.has_roja_alert && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                  🔴 Crítica
                </span>
              )}
              {branch.has_naranja_alert && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  🟠 Rentabilidad
                </span>
              )}
              {branch.has_amarilla_alert && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200">
                  🟡 Stock
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Pie de tarjeta con acciones */}
      <footer className="mt-auto p-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        {branch.activa ? (
          <button
            type="button"
            onClick={() => onDelete(branch)}
            title="Eliminar lógicamente sucursal"
            aria-label={`Eliminar lógicamente sucursal ${branch.direccion}`}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={() => onNavigate(branch.id)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <span>Ver Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
};
