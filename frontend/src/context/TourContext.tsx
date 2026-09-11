import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string;
  iconName?: string;
}

interface TourContextType {
  isTourActive: boolean;
  currentStep: number;
  steps: TourStep[];
  isWelcomeOpen: boolean;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  openWelcome: () => void;
  closeWelcome: (dontAskAgain?: boolean) => void;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenido al Panel de Supervisión',
    content:
      'Como supervisor, tienes acceso global al control de todas las sucursales de la cadena, con visibilidad de sus finanzas, stock de insumos y alertas operativas en tiempo real.',
    iconName: 'Sparkles',
  },
  {
    id: 'search-filters',
    title: 'Búsqueda Rápida y Filtros',
    content:
      'Usa este panel para filtrar sucursales operativas, ver la nómina completa o enfocarte rápidamente en aquellas con alertas activas. También puedes buscar por dirección o nombre de gerente.',
    targetSelector: '[data-tour="search-filters"]',
    iconName: 'Filter',
  },
  {
    id: 'branch-card',
    title: 'Métricas de Sucursal y Salud Financiera',
    content:
      'Cada tarjeta resume la facturación del mes y el Margen Neto. El indicador visual se adapta automáticamente: verde (saludable ≥ 10%), amarillo/naranja (< 10%) o rojo crítico (ganancia nula o negativa).',
    targetSelector: '[data-tour="branch-card"]',
    iconName: 'TrendingUp',
  },
  {
    id: 'compare-mode',
    title: 'Comparativa Multi-Sucursal',
    content:
      'Marca 2 o más sucursales mediante sus casillas de verificación y presiona "Comparar Sucursales" para abrir el tablero comparativo con gráficos analíticos interactivos y rankings de facturación.',
    targetSelector: '[data-tour="compare-mode"]',
    iconName: 'CheckSquare',
  },
  {
    id: 'alerts-link',
    title: 'Monitoreo de Alertas Operativas',
    content:
      'Accede a la sección de Alertas desde la barra lateral para gestionar roturas de infraestructura, faltantes de stock y desvíos de rentabilidad. Las alertas financieras se auto-resuelven cuando la sucursal se recupera.',
    targetSelector: '[data-tour="alerts-link"]',
    iconName: 'AlertTriangle',
  },
  {
    id: 'add-branch',
    title: 'Gestión y Creación de Sucursales',
    content:
      'Puedes dar de alta nuevas sucursales asignándoles un gerente, o entrar a "Ver Dashboard" en cada sucursal para auditar su historial financiero de 24 meses y nómina de empleados.',
    targetSelector: '[data-tour="add-branch"]',
    iconName: 'Building2',
  },
];

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

  // Check if tour should be automatically suggested on login
  useEffect(() => {
    if (isAuthenticated && user && user.rol === 'supervisor') {
      const tourKey = `branchview_tour_dismissed_${user.id}`;
      const isDismissed = localStorage.getItem(tourKey);

      // If user is 'tour', always suggest it on clean login unless already active
      if (user.username === 'tour' && !isDismissed) {
        setIsWelcomeOpen(true);
      }
    } else {
      setIsTourActive(false);
      setIsWelcomeOpen(false);
    }
  }, [isAuthenticated, user]);

  const startTour = () => {
    setIsWelcomeOpen(false);
    setCurrentStep(0);
    setIsTourActive(true);
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const skipTour = () => {
    setIsTourActive(false);
    if (user) {
      localStorage.setItem(`branchview_tour_dismissed_${user.id}`, 'true');
    }
  };

  const completeTour = () => {
    setIsTourActive(false);
    if (user) {
      localStorage.setItem(`branchview_tour_completed_${user.id}`, 'true');
      localStorage.setItem(`branchview_tour_dismissed_${user.id}`, 'true');
    }
  };

  const openWelcome = () => {
    setIsWelcomeOpen(true);
  };

  const closeWelcome = (dontAskAgain = false) => {
    setIsWelcomeOpen(false);
    if (dontAskAgain && user) {
      localStorage.setItem(`branchview_tour_dismissed_${user.id}`, 'true');
    }
  };

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStep,
        steps: TOUR_STEPS,
        isWelcomeOpen,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        completeTour,
        openWelcome,
        closeWelcome,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
