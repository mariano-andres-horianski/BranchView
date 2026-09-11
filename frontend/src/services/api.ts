import axios from 'axios';
import {
  Branch,
  BranchDetail,
  Employee,
  StockItem,
  Alert,
  ManagerUser,
  User,
  MonthlyFinance,
  BranchFinancialHistory,
  ComparativeAnalytics,
  BranchFinances,
} from '../types';

const rawUrl = (import.meta.env.VITE_API_URL || '').trim();

function getApiBaseUrl(): string {
  if (!rawUrl) {
    // Por defecto usa '/api' (proxy en desarrollo Vite y Nginx en Docker)
    return '/api';
  }
  // Elimina barras finales accidentales
  const cleanUrl = rawUrl.replace(/\/+$/, '');
  // Si ya termina en /api, se usa directamente
  if (cleanUrl.endsWith('/api')) {
    return cleanUrl;
  }
  // Si se proporcionó la URL base sin /api (ej: https://branchview.onrender.com), se concatena /api
  return `${cleanUrl}/api`;
}

const API_BASE = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('branchview_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for auth expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('branchview_token');
      localStorage.removeItem('branchview_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Auth
  auth: {
    login: async (credentials: { username: string; password: string }) => {
      const res = await api.post<{ access_token: string; token_type: string; user: User }>('/auth/login', credentials);
      return res.data;
    },
    getMe: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  },

  // Branches
  branches: {
    getAll: async (params?: { q?: string; filter_type?: 'todas' | 'operativas' | 'con_alerta' }) => {
      const res = await api.get<Branch[]>('/branches', { params });
      return res.data;
    },
    getById: async (id: number) => {
      const res = await api.get<BranchDetail>(`/branches/${id}`);
      return res.data;
    },
    compare: async (ids: number[]) => {
      const res = await api.get<BranchDetail[]>('/branches/compare', {
        params: { ids: ids.join(',') },
      });
      return res.data;
    },
    compareAnalytics: async (ids: number[], months: number = 12) => {
      const res = await api.get<ComparativeAnalytics>('/branches/compare/analytics', {
        params: { ids: ids.join(','), months },
      });
      return res.data;
    },
    create: async (data: {
      direccion: string;
      id_gerente?: number | null;
      ventas_mes: number;
      ventas_anio: number;
      ganancias_netas_mes: number;
      ganancias_netas_anio: number;
    }) => {
      const res = await api.post<Branch>('/branches', data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await api.delete<{ message: string }>(`/branches/${id}`);
      return res.data;
    },
  },

  // Stock
  stock: {
    getByBranch: async (branchId: number) => {
      const res = await api.get<StockItem[]>(`/branches/${branchId}/stock`);
      return res.data;
    },
    updateQuantity: async (branchId: number, stockId: number, cantidad: number) => {
      const res = await api.put<StockItem>(`/branches/${branchId}/stock/${stockId}`, { cantidad });
      return res.data;
    },
  },

  // Finances
  finances: {
    getByBranch: async (branchId: number) => {
      const res = await api.get<BranchFinances>(`/branches/${branchId}/finances`);
      return res.data;
    },
    getHistory: async (branchId: number, months: number = 12) => {
      const res = await api.get<BranchFinancialHistory>(`/branches/${branchId}/finances/history`, {
        params: { months },
      });
      return res.data;
    },
    updateCurrent: async (
      branchId: number,
      data: {
        ventas: number;
        costo_ventas: number;
        gastos_operativos: number;
        anio?: number;
        mes?: number;
      }
    ) => {
      const res = await api.put<MonthlyFinance>(`/branches/${branchId}/finances/current`, data);
      return res.data;
    },
    update: async (
      branchId: number,
      data: {
        ventas_mes: number;
        costo_ventas_mes?: number;
        gastos_operativos_mes?: number;
        ventas_anio?: number;
        ganancias_netas_mes?: number;
        ganancias_netas_anio?: number;
      }
    ) => {
      const res = await api.put<BranchFinances>(`/branches/${branchId}/finances`, data);
      return res.data;
    },
  },

  // Employees
  employees: {
    getByBranch: async (branchId: number) => {
      const res = await api.get<Employee[]>(`/branches/${branchId}/employees`);
      return res.data;
    },
    create: async (branchId: number, data: Omit<Employee, 'id' | 'id_sucursal' | 'activo'>) => {
      const res = await api.post<Employee>(`/branches/${branchId}/employees`, data);
      return res.data;
    },
    update: async (id: number, data: Omit<Employee, 'id' | 'id_sucursal' | 'activo'>) => {
      const res = await api.put<Employee>(`/employees/${id}`, data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await api.delete<{ message: string }>(`/employees/${id}`);
      return res.data;
    },
  },

  // Alerts
  alerts: {
    getAll: async () => {
      const res = await api.get<Alert[]>('/alerts');
      return res.data;
    },
    getById: async (id: number) => {
      const res = await api.get<Alert>(`/alerts/${id}`);
      return res.data;
    },
    createManual: async (data: { gravedad: string; mensaje: string; detalle: string }) => {
      const res = await api.post<Alert>('/alerts', data);
      return res.data;
    },
    resolve: async (id: number) => {
      const res = await api.patch<Alert>(`/alerts/${id}/resolve`);
      return res.data;
    },
  },

  // Users / Managers
  users: {
    getManagers: async () => {
      const res = await api.get<ManagerUser[]>('/users/managers');
      return res.data;
    },
  },
};

export default api;
