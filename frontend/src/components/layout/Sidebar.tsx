import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Building2, AlertTriangle, LogOut, UserCircle, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 min-h-screen">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold tracking-tight text-white text-base">BranchView</span>
          <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Enterprise Hub
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-3 space-y-1.5">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Supervisión
        </div>

        {user.rol === 'supervisor' ? (
          <>
            <NavLink
              to="/branches"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Building2 className="w-4 h-4" />
              <span>Sucursales</span>
            </NavLink>
          </>
        ) : (
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <Store className="w-4 h-4" />
            <span>Mi Sucursal</span>
          </NavLink>
        )}

        <NavLink
          to="/alerts"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`
          }
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Alertas</span>
        </NavLink>
      </div>

      {/* User info & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
            <UserCircle className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user.nombre}</p>
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  user.rol === 'supervisor' ? 'bg-blue-400' : 'bg-emerald-400'
                }`}
              />
              <p className="text-xs text-slate-400 capitalize font-medium">{user.rol}</p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-red-950/40 hover:border-red-800/50 rounded-md border border-slate-700/60 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};
