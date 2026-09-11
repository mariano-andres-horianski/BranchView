import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TourProvider } from './context/TourContext';
import { OnboardingTour } from './components/tour/OnboardingTour';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SupervisorDashboardPage } from './pages/SupervisorDashboardPage';
import { BranchDetailPage } from './pages/BranchDetailPage';
import { ComparativeDashboardPage } from './pages/ComparativeDashboardPage';
import { AlertsPage } from './pages/AlertsPage';

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Cargando BranchView...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.rol === 'supervisor') {
    return <Navigate to="/branches" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <TourProvider>
        <BrowserRouter>
          <OnboardingTour />
          <Routes>
            <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RootRedirect />} />

            {/* Supervisor routes */}
            <Route
              path="branches"
              element={
                <ProtectedRoute allowedRole="supervisor">
                  <SupervisorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="compare"
              element={
                <ProtectedRoute allowedRole="supervisor">
                  <ComparativeDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Gerente route: direct dashboard to their branch */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRole="gerente">
                  <BranchDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Single branch detail (accessible to supervisor or manager of this branch) */}
            <Route path="branches/:id" element={<BranchDetailPage />} />

            {/* Alerts Center */}
            <Route path="alerts" element={<AlertsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TourProvider>
  </AuthProvider>
  );
};

export default App;
