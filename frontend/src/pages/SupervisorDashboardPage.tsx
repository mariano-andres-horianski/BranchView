import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Toast, ToastMessage } from '../components/common/Toast';
import {
  BranchCard,
  BranchFilters,
  BranchFilterType,
  BranchSelectionBar,
  BranchEmptyState,
  CreateBranchModal,
  CreateBranchFormData,
} from '../components/branches';
import { apiService } from '../services/api';
import { Branch, ManagerUser } from '../types';

export const SupervisorDashboardPage: React.FC = () => {
  // Datos y filtros principales
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<BranchFilterType>('operativas');
  const [isLoading, setIsLoading] = useState(true);

  // Estado del modal de alta
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);

  // Estado del diálogo de confirmación de baja lógica
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback al usuario
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const navigate = useNavigate();

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ id: Date.now().toString(), type, message });
    },
    []
  );

  const loadBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiService.branches.getAll({
        q: searchQuery,
        filter_type: filterType,
      });
      setBranches(data);
    } catch {
      showToast('Error al cargar las sucursales', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterType, showToast]);

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
    } catch {
      showToast('Error al cargar la lista de gerentes', 'error');
    }
  };

  const handleCreateBranch = async (formData: CreateBranchFormData) => {
    if (!formData.direccion.trim()) {
      showToast('Debe ingresar la dirección de la sucursal', 'error');
      return;
    }

    setIsSubmittingBranch(true);
    try {
      await apiService.branches.create({
        direccion: formData.direccion.trim(),
        id_gerente: formData.id_gerente ? Number(formData.id_gerente) : null,
        ventas_mes: Number(formData.ventas_mes),
        ventas_anio: Number(formData.ventas_anio),
        ganancias_netas_mes: Number(formData.ganancias_netas_mes),
        ganancias_netas_anio: Number(formData.ganancias_netas_anio),
      });

      showToast('Sucursal creada exitosamente');
      setIsAddModalOpen(false);
      await loadBranches();
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
      setSelectedBranchIds((prev) => prev.filter((id) => id !== branchToDelete.id));
      await loadBranches();
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

  const activeBranches = useMemo(
    () => branches.filter((b) => b.activa),
    [branches]
  );

  const isAllSelected = useMemo(
    () =>
      activeBranches.length > 0 &&
      selectedBranchIds.length === activeBranches.length,
    [activeBranches.length, selectedBranchIds.length]
  );

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBranchIds([]);
    } else {
      setSelectedBranchIds(activeBranches.map((b) => b.id));
    }
  };

  const handleActionClick = () => {
    if (selectedBranchIds.length === 0) return;
    if (selectedBranchIds.length === 1) {
      navigate(`/branches/${selectedBranchIds[0]}`);
    } else {
      navigate(`/compare?ids=${selectedBranchIds.join(',')}`);
    }
  };

  return (
    <main className="min-h-screen pb-16">
      <Header
        title="Gestión de Sucursales"
        subtitle="Supervisión global, auditoría y análisis comparativo"
        actions={
          <button
            type="button"
            data-tour="add-branch"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Agregar Sucursal</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 mt-8 space-y-6">
        {/* Barra de búsqueda y filtros rápidos */}
        <BranchFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onSearchClick={loadBranches}
          filterType={filterType}
          onFilterChange={setFilterType}
        />

        {/* Barra de selección y comparador */}
        <BranchSelectionBar
          selectedCount={selectedBranchIds.length}
          activeBranchesCount={activeBranches.length}
          isAllSelected={isAllSelected}
          onToggleSelectAll={handleToggleSelectAll}
          onActionClick={handleActionClick}
        />

        {/* Sección de listado / cuadrícula de sucursales */}
        <section aria-label="Catálogo de sucursales">
          {isLoading ? (
            <p className="py-20 text-center text-sm text-slate-500">
              Cargando sucursales...
            </p>
          ) : branches.length === 0 ? (
            <BranchEmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {branches.map((branch, index) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  isSelected={selectedBranchIds.includes(branch.id)}
                  onToggleSelect={toggleSelectBranch}
                  onDelete={setBranchToDelete}
                  onNavigate={(id) => navigate(`/branches/${id}`)}
                  isTourTarget={index === 0}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal: Agregar Sucursal */}
      <CreateBranchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateBranch}
        managers={managers}
        isSubmitting={isSubmittingBranch}
      />

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

      {/* Mensajes flotantes de feedback */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
};
