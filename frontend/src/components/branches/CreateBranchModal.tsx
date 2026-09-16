import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ManagerUser } from '../../types';

export interface CreateBranchFormData {
  direccion: string;
  id_gerente: string | number;
  ventas_mes: number;
  ventas_anio: number;
  ganancias_netas_mes: number;
  ganancias_netas_anio: number;
}

const INITIAL_FORM_DATA: CreateBranchFormData = {
  direccion: '',
  id_gerente: '',
  ventas_mes: 0,
  ventas_anio: 0,
  ganancias_netas_mes: 0,
  ganancias_netas_anio: 0,
};

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CreateBranchFormData) => Promise<void>;
  managers: ManagerUser[];
  isSubmitting: boolean;
}

export const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  managers,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<CreateBranchFormData>(INITIAL_FORM_DATA);

  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_DATA);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nueva Sucursal"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Datos generales */}
        <fieldset className="space-y-4 border-0 p-0 m-0">
          <legend className="sr-only">Datos generales de la sucursal</legend>

          <div>
            <label
              htmlFor="branch-address"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Dirección de la Sucursal *
            </label>
            <input
              id="branch-address"
              type="text"
              required
              value={formData.direccion}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, direccion: e.target.value }))
              }
              placeholder="Ej: Av. San Juan 3400, CABA"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="branch-manager-select"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Gerente Asignado
            </label>
            <select
              id="branch-manager-select"
              value={formData.id_gerente}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, id_gerente: e.target.value }))
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
        </fieldset>

        {/* Datos financieros iniciales */}
        <fieldset className="pt-2 border-t border-slate-100 border-x-0 border-b-0 p-0 m-0">
          <legend className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
            Parámetros Financieros Iniciales
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="branch-ventas-mes"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Ventas Mensuales ($)
              </label>
              <input
                id="branch-ventas-mes"
                type="number"
                min="0"
                step="any"
                value={formData.ventas_mes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ventas_mes: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="branch-ventas-anio"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Ventas Anuales ($)
              </label>
              <input
                id="branch-ventas-anio"
                type="number"
                min="0"
                step="any"
                value={formData.ventas_anio}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ventas_anio: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="branch-ganancias-mes"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Ganancias Netas Mes ($)
              </label>
              <input
                id="branch-ganancias-mes"
                type="number"
                step="any"
                value={formData.ganancias_netas_mes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ganancias_netas_mes: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="branch-ganancias-anio"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Ganancias Netas Año ($)
              </label>
              <input
                id="branch-ganancias-anio"
                type="number"
                step="any"
                value={formData.ganancias_netas_anio}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ganancias_netas_anio: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Acciones del formulario */}
        <footer className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isSubmitting ? 'Creando...' : 'Crear Sucursal'}
          </button>
        </footer>
      </form>
    </Modal>
  );
};
