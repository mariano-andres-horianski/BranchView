import React from 'react';
import { CheckSquare, Square, ArrowRight } from 'lucide-react';

interface BranchSelectionBarProps {
  selectedCount: number;
  activeBranchesCount: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onActionClick: () => void;
}

export const BranchSelectionBar: React.FC<BranchSelectionBarProps> = ({
  selectedCount,
  activeBranchesCount,
  isAllSelected,
  onToggleSelectAll,
  onActionClick,
}) => {
  const getActionButtonLabel = () => {
    if (selectedCount <= 1) return 'Ver sucursal';
    return `Comparar ${selectedCount} sucursales`;
  };

  return (
    <section
      data-tour="compare-mode"
      aria-label="Acciones de selección y comparador de sucursales"
      className="flex items-center justify-between bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-xs"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSelectAll}
          aria-label={
            isAllSelected
              ? 'Deseleccionar todas las sucursales operativas'
              : 'Seleccionar todas las sucursales operativas'
          }
          className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded-sm"
        >
          {isAllSelected ? (
            <CheckSquare className="w-4 h-4 text-blue-600" aria-hidden="true" />
          ) : (
            <Square className="w-4 h-4 text-slate-400" aria-hidden="true" />
          )}
          <span>Seleccionar todas ({activeBranchesCount})</span>
        </button>

        <span className="text-slate-300" aria-hidden="true">|</span>

        <span className="text-xs font-semibold text-slate-700">
          {selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}
        </span>
      </div>

      <button
        type="button"
        onClick={onActionClick}
        disabled={selectedCount === 0}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-md shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        <span>{getActionButtonLabel()}</span>
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </section>
  );
};
