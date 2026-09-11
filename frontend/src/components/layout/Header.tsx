import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actions }) => {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-20">
      <div>
        {title && <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>}
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {actions}
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>{user?.nombre}</span>
          <span className="text-slate-400">|</span>
          <span className="capitalize font-semibold text-slate-700">{user?.rol}</span>
        </div>
      </div>
    </header>
  );
};
