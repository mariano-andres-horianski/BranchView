import React from 'react';
import { Search, Filter } from 'lucide-react';

export type BranchFilterType = 'operativas' | 'todas' | 'con_alerta';

interface BranchFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onSearchClick: () => void;
  filterType: BranchFilterType;
  onFilterChange: (filter: BranchFilterType) => void;
}

const FILTER_OPTIONS: { id: BranchFilterType; label: string }[] = [
  { id: 'operativas', label: 'Operativas' },
  { id: 'todas', label: 'Todas (incluye inactivas)' },
  { id: 'con_alerta', label: 'Con alertas activas' },
];

export const BranchFilters: React.FC<BranchFiltersProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSearchClick,
  filterType,
  onFilterChange,
}) => {
  return (
    <section
      data-tour="search-filters"
      aria-label="Búsqueda y filtros de sucursales"
      className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4"
    >
      <div className="flex flex-col md:flex-row gap-3">
        <form
          role="search"
          onSubmit={onSearchSubmit}
          className="flex-1 relative"
        >
          <label htmlFor="branch-search" className="sr-only">
            Buscar por dirección, gerente o referencia
          </label>
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id="branch-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por dirección, gerente o referencia..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
          />
        </form>
        <button
          type="button"
          onClick={onSearchClick}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          Buscar
        </button>
      </div>

      {/* Selector de píldoras de filtrado */}
      <nav
        aria-label="Filtros rápidos de sucursales"
        className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap"
      >
        <span className="flex items-center text-xs font-semibold text-slate-500 mr-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5" aria-hidden="true" />
          Filtrar por:
        </span>
        {FILTER_OPTIONS.map((option) => {
          const isActive = filterType === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onFilterChange(option.id)}
              aria-pressed={isActive}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </nav>
    </section>
  );
};
