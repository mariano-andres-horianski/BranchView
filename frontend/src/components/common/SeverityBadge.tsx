import React from 'react';

interface SeverityBadgeProps {
  gravedad: 'roja' | 'naranja' | 'amarilla';
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ gravedad, size = 'md' }) => {
  const isSm = size === 'sm';

  switch (gravedad) {
    case 'roja':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full border border-red-200 bg-red-50 text-red-700 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          Crítica / Roja
        </span>
      );
    case 'naranja':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full border border-amber-200 bg-amber-50 text-amber-800 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Importante / Naranja
        </span>
      );
    case 'amarilla':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full border border-yellow-200 bg-yellow-50 text-yellow-800 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          Advertencia / Amarilla
        </span>
      );
    default:
      return null;
  }
};
