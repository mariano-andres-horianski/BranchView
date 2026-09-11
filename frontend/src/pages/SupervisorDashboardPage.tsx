import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  User,
  Trash2,
  CheckSquare,
  Square,
  DollarSign,
  Filter
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Toast, ToastMessage } from '../components/common/Toast';
import { apiService } from '../services/api';
import { Branch, ManagerUser } from '../types';

export const SupervisorDashboardPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'operativas' | 'todas' | 'con_alerta'>('operativas');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [newBranchData, setNewBranchData] = useState({
    direccion: '',
    id_gerente: '' as string | number,
    ventas_mes: 0,
    ventas_anio: 0,
    ganancias_netas_mes: 0,
    ganancias_netas_anio: 0,
  });
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);

  // Delete modal state
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const navigate = useNavigate();

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: Date.now().toString(), type, message });
  };

  const loadBranches = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.branches.getAll({
        q: searchQuery,
        filter_type: filterType,
      });
      setBranches(data);
    } catch (err) {
      showToast('Error al cargar las sucursales', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [filterType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBranches();
  };

  const handleOpenAddModal = async () => {
    try {
      const managersList = await apiService.users.getManagers();
      setManagers(managersList);
      setIsAddModalOpen(true);
    } catch (err) {
      showToast('Error al cargar la lista de gerentes', 'error');
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchData.direccion.trim()) {
      showToast('Debe ingresar la dirección de la sucursal', 'error');
      return;
    }

    setIsSubmittingBranch(true);
    try {
      await apiService.branches.create({
        direccion: newBranchData.direccion.trim(),
        id_gerente: newBranchData.id_gerente ? Number(newBranchData.id_gerente) : null,
        ventas_mes: Number(newBranchData.ventas_mes),
        ventas_anio: Number(newBranchData.ventas_anio),
        ganancias_netas_mes: Number(newBranchData.ganancias_netas_mes),
        ganancias_netas_anio: Number(newBranchData.ganancias_netas_anio),
      });

      showToast('Sucursal creada exitosamente');
      setIsAddModalOpen(false);
      setNewBranchData({
        direccion: '',
        id_gerente: '',
        ventas_mes: 0,
        ventas_anio: 0,
        ganancias_netas_mes: 0,
        ganancias_netas_anio: 0,
      });
      loadBranches();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al crear la sucursal', 'error');
    } finally {
      setIsSubmittingBranch(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!branchToDelete) return;

    setIsDeleting(true);
    try {
      await apiService.branches.delete(branchToDelete.id);
      showToast(`Sucursal ${branchToDelete.direccion} eliminada lógicamente`);
      setBranchToDelete(null);
      // Remove from selected if was selected
      setSelectedBranchIds((prev) => prev.filter((id) => id !== branchToDelete.id));
      loadBranches();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error al eliminar la sucursal', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectBranch = (id: number) => {
    setSelectedBranchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const activeBranches = branches.filter((b) => b.activa);
    if (selectedBranchIds.length === activeBranches.length) {
      setSelectedBranchIds([]);
    } else {
      setSelectedBranchIds(activeBranches.map((b) => b.id));
    }
  };

  const handleViewSelectedBranches = () => {
    if (selectedBranchIds.length === 0) return;
    if (selectedBranchIds.length === 1) {
      navigate(`/branches/${selectedBranchIds[0]}`);
    } else {
      navigate(`/compare?ids=${selectedBranchIds.join(',')}`);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <Header
        title="Gestión de Sucursales"
        subtitle="Supervisión global, auditoría y análisis comparativo"
        actions={
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Sucursal</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 mt-8 space-y-6">
        {/* Search & Filters */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por dirección, gerente o referencia..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
              />
            </form>
            <button
              onClick={() => loadBranches()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Buscar
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <span className="text-xs font-semibold text-slate-500 mr-2">Filtrar por:</span>
            {(['operativas', 'todas', 'con_alerta'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterType(filter)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterType === filter
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter === 'operativas' && 'Operativas'}
                {filter === 'todas' && 'Todas (incluye inactivas)'}
                {filter === 'con_alerta' && 'Con alertas activas'}
              </button>
            ))}
          </div>
        </div>

        {/* Selection Bar / Actions */}
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              {selectedBranchIds.length > 0 &&
              selectedBranchIds.length === branches.filter((b) => b.activa).length ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Seleccionar todas ({branches.filter((b) => b.activa).length})</span>
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-semibold text-slate-700">
              {selectedBranchIds.length} seleccionada{selectedBranchIds.length !== 1 ? 's' : ''}
            </span>
          </div>

          <button
            onClick={handleViewSelectedBranches}
            disabled={selectedBranchIds.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
          >
            <span>
              {selectedBranchIds.length <= 1
                ? 'Ver sucursal'
                : `Comparar ${selectedBranchIds.length} sucursales`}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Branch Cards Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-sm text-slate-500">Cargando sucursales...</div>
        ) : branches.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No se encontraron sucursales</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No hay sucursales que coincidan con los filtros seleccionados o el término de búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((branch) => {
              const isSelected = selectedBranchIds.includes(branch.id);
              return (
                <div
                  key={branch.id}
                  className={`bg-white rounded-xl border transition-all relative flex flex-col ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-xs'
                  } ${!branch.activa ? 'opacity-65 bg-slate-50' : ''}`}
                >
                  {/* Card Header */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          disabled={!branch.activa}
                          onClick={() => toggleSelectBranch(branch.id)}
                          className="mt-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 leading-snug">
                            {branch.direccion}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Gerente: <strong>{branch.gerente_nombre}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {branch.activa ? (
                          <StatusBadge type="active" label="Operativa" />
                        ) : (
                          <StatusBadge type="inactive" label="Inactiva" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial & Alerts Summary */}
                  <div className="px-5 py-3 border-y border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Ventas Mes:</span>
                      <span className="font-semibold text-slate-800">
                        ${branch.ventas_mes.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Margen Neto:</span>
                      <span
                        className={`font-bold ${
                          branch.margen_neto_mes >= 10
                            ? 'text-emerald-700'
                            : branch.margen_neto_mes > 0
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {branch.margen_neto_mes}%
                      </span>
                    </div>
                  </div>

                  {/* Alert Indicators */}
                  <div className="px-5 py-2.5 flex items-center justify-between text-xs">
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
                  </div>

                  {/* Card Actions */}
                  <div className="mt-auto p-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {branch.activa && (
                      <button
                        type="button"
                        onClick={() => setBranchToDelete(branch)}
                        title="Eliminar lógicamente sucursal"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate(`/branches/${branch.id}`)}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <span>Ver Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Agregar Sucursal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Crear Nueva Sucursal"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBranch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Dirección de la Sucursal *
            </label>
            <input
              type="text"
              required
              value={newBranchData.direccion}
              onChange={(e) =>
                setNewBranchData({ ...newBranchData, direccion: e.target.value })
              }
              placeholder="Ej: Av. San Juan 3400, CABA"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Gerente Asignado
            </label>
            <select
              value={newBranchData.id_gerente}
              onChange={(e) =>
                setNewBranchData({ ...newBranchData, id_gerente: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">-- Sin gerente asignado --</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id} disabled={m.is_assigned}>
                  {m.nombre} ({m.username}) {m.is_assigned ? '— [Ya asignado]' : '— [Disponible]'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ventas Mensuales ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={newBranchData.ventas_mes}
                onChange={(e) =>
                  setNewBranchData({ ...newBranchData, ventas_mes: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ventas Anuales ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={newBranchData.ventas_anio}
                onChange={(e) =>
                  setNewBranchData({ ...newBranchData, ventas_anio: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ganancias Netas Mes ($)
              </label>
              <input
                type="number"
                step="any"
                value={newBranchData.ganancias_netas_mes}
                onChange={(e) =>
                  setNewBranchData({
                    ...newBranchData,
                    ganancias_netas_mes: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ganancias Netas Año ($)
              </label>
              <input
                type="number"
                step="any"
                value={newBranchData.ganancias_netas_anio}
                onChange={(e) =>
                  setNewBranchData({
                    ...newBranchData,
                    ganancias_netas_anio: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmittingBranch}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {isSubmittingBranch ? 'Creando...' : 'Crear Sucursal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmación de Baja Lógica */}
      <ConfirmDialog
        isOpen={!!branchToDelete}
        onClose={() => setBranchToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Sucursal"
        message={`¿Seguro que deseas eliminar la sucursal "${branchToDelete?.direccion}"? La eliminación será lógica y se conservará el historial en la base de datos.`}
        confirmText="Eliminar lógicamente"
        isLoading={isDeleting}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
