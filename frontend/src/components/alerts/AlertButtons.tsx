import React from 'react';
import {
  RefreshCw,
  X,
  Check,
  ShieldAlert,
  TrendingDown,
  Package,
  AlertTriangle,
  LucideIcon,
} from 'lucide-react';

// 1. Botón de tarjeta métrica por gravedad (SeverityFilterCard)
export interface SeverityFilterCardProps {
  severity: 'todas' | 'roja' | 'naranja' | 'amarilla';
  isActive: boolean;
  count: number;
  label: string;
  sublabel: string;
  onClick: () => void;
}

export const SeverityFilterCard: React.FC<SeverityFilterCardProps> = ({
  severity,
  isActive,
  count,
  label,
  sublabel,
  onClick,
}) => {
  let activeStyles = 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50';
  let icon = <AlertTriangle className="w-4 h-4" />;
  let iconWrapperClass = 'bg-slate-100 text-slate-700';
  let badgeTitle = (
    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
      {label}
    </span>
  );
  let countColor = 'text-slate-900';
  let sublabelColor = 'text-slate-500';

  if (severity === 'roja') {
    activeStyles = isActive
      ? 'bg-red-50/90 border-red-500 ring-2 ring-red-500/20 shadow-md'
      : 'bg-white border-slate-200 hover:border-red-300 hover:bg-red-50/30';
    icon = <ShieldAlert className="w-4 h-4" />;
    iconWrapperClass = 'bg-red-100 text-red-700';
    badgeTitle = (
      <span className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />
        {label}
      </span>
    );
    countColor = 'text-red-600';
    sublabelColor = 'text-red-700/80';
  } else if (severity === 'naranja') {
    activeStyles = isActive
      ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
      : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30';
    icon = <TrendingDown className="w-4 h-4" />;
    iconWrapperClass = 'bg-amber-100 text-amber-800';
    badgeTitle = (
      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden="true" />
        {label}
      </span>
    );
    countColor = 'text-amber-700';
    sublabelColor = 'text-amber-800/80';
  } else if (severity === 'amarilla') {
    activeStyles = isActive
      ? 'bg-yellow-50/90 border-yellow-500 ring-2 ring-yellow-500/20 shadow-md'
      : 'bg-white border-slate-200 hover:border-yellow-300 hover:bg-yellow-50/30';
    icon = <Package className="w-4 h-4" />;
    iconWrapperClass = 'bg-yellow-100 text-yellow-800';
    badgeTitle = (
      <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
        {label}
      </span>
    );
    countColor = 'text-yellow-700';
    sublabelColor = 'text-yellow-800/80';
  } else if (isActive) {
    activeStyles = 'bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-md';
  }

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`p-5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between shadow-xs ${activeStyles}`}
    >
      <div className="flex items-center justify-between">
        {badgeTitle}
        <div className={`p-2 rounded-xl ${iconWrapperClass}`} aria-hidden="true">
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className={`text-3xl font-black ${countColor}`}>{count}</span>
        <span className={`text-xs font-semibold ${sublabelColor}`}>
          {isActive ? 'Filtro activo' : sublabel}
        </span>
      </div>
    </button>
  );
};

// 2. Botón de filtro de categoría / tipo (CategoryFilterButton)
export interface CategoryFilterButtonProps {
  label: string;
  isActive: boolean;
  icon?: LucideIcon;
  onClick: () => void;
}

export const CategoryFilterButton: React.FC<CategoryFilterButtonProps> = ({
  label,
  isActive,
  icon: Icon,
  onClick,
}) => {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        isActive
          ? 'bg-blue-600 text-white shadow-xs'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
};

// 3. Botón de acción para resolver alerta (ResolveAlertButton)
export interface ResolveAlertButtonProps {
  alertId: number;
  isResolving: boolean;
  onResolve: (alertId: number, e: React.MouseEvent) => void;
}

export const ResolveAlertButton: React.FC<ResolveAlertButtonProps> = ({
  alertId,
  isResolving,
  onResolve,
}) => {
  return (
    <button
      type="button"
      onClick={(e) => onResolve(alertId, e)}
      disabled={isResolving}
      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-emerald-600 text-slate-700 hover:text-white border border-slate-300 hover:border-emerald-600 text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
      title="Marcar alerta como resuelta"
      aria-label={`Resolver alerta #${alertId}`}
    >
      {isResolving ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Check className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      <span>Resolver</span>
    </button>
  );
};

// 4. Botón de limpiar filtros activos (ClearFiltersButton)
export interface ClearFiltersButtonProps {
  onClear: () => void;
}

export const ClearFiltersButton: React.FC<ClearFiltersButtonProps> = ({ onClear }) => {
  return (
    <button
      type="button"
      onClick={onClear}
      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
    >
      <X className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Limpiar filtros</span>
    </button>
  );
};

// 5. Botón de actualizar en el header (RefreshAlertsButton)
export interface RefreshAlertsButtonProps {
  isLoading: boolean;
  onRefresh: () => void;
}

export const RefreshAlertsButton: React.FC<RefreshAlertsButtonProps> = ({
  isLoading,
  onRefresh,
}) => {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isLoading}
      className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl shadow-xs transition-colors disabled:opacity-50"
      aria-label="Actualizar listado de alertas"
    >
      <RefreshCw
        className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`}
        aria-hidden="true"
      />
      <span>Actualizar</span>
    </button>
  );
};