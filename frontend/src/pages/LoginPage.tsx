import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Lock, User, AlertCircle, ArrowRight, ShieldCheck, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor complete todos los campos');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiService.auth.login({ username: username.trim(), password });
      login(data.access_token, data.user);

      if (data.user.rol === 'supervisor') {
        navigate('/branches');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Error al iniciar sesión. Verifique sus credenciales.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Store className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          BranchView
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Sistema Empresarial de Supervisión y Gestión de Sucursales
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {error && (
            <div className="mb-5 flex items-center gap-3 p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario
              </label>
              <div className="relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. supervisor o gerente_centro"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-xs disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Iniciando sesión...</span>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick login for demonstration and testing */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Credenciales de prueba rápida
            </span>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('supervisor', 'admin123')}
                className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-md transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Supervisor: <strong>supervisor</strong></span>
                </div>
                <span className="text-[10px] bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600 font-mono">admin123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('gerente_centro', 'gerente123')}
                className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-md transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span>Gerente Centro (Saludable)</span>
                </div>
                <span className="text-[10px] bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600 font-mono">gerente123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('gerente_norte', 'gerente123')}
                className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 border border-slate-200 rounded-md transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span>Gerente Constitución (Alertas)</span>
                </div>
                <span className="text-[10px] bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600 font-mono">gerente123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('gerente_sur', 'gerente123')}
                className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-red-50 hover:text-red-700 border border-slate-200 rounded-md transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-red-600" />
                  <span>Gerente Güemes (Crítica)</span>
                </div>
                <span className="text-[10px] bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600 font-mono">gerente123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
