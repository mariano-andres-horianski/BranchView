import React from 'react';
import { Building2 } from 'lucide-react';

interface BranchEmptyStateProps {
  title?: string;
  description?: string;
}

export const BranchEmptyState: React.FC<BranchEmptyStateProps> = ({
  title = 'No se encontraron sucursales',
  description = 'No hay sucursales que coincidan con los filtros seleccionados o el término de búsqueda.',
}) => {
  return (
    <section
      aria-label="Sin resultados"
      className="bg-white rounded-xl border border-slate-200 p-12 text-center"
    >
      <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" aria-hidden="true" />
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
        {description}
      </p>
    </section>
  );
};
