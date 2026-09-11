import React from 'react';

interface StatusBadgeProps {
  type: 'active' | 'inactive' | 'normal' | 'bajo' | 'agotado';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, label }) => {
  switch (type) {
    case 'active':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          {label || 'Operativa'}
        </span>
      );
    case 'inactive':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
          {label || 'Inactiva'}
        </span>
      );
    case 'normal':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          {label || 'Normal'}
        </span>
      );
    case 'bajo':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5" />
          {label || 'Stock Bajo'}
        </span>
      );
    case 'agotado':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
          {label || 'Agotado'}
        </span>
      );
    default:
      return null;
  }
};
