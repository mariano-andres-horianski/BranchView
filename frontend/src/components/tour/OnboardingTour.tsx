import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTour } from '../../context/TourContext';
import {
  Sparkles,
  Filter,
  TrendingUp,
  CheckSquare,
  AlertTriangle,
  Building2,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Compass,
} from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-6 h-6 text-purple-600" />,
  Filter: <Filter className="w-6 h-6 text-blue-600" />,
  TrendingUp: <TrendingUp className="w-6 h-6 text-emerald-600" />,
  CheckSquare: <CheckSquare className="w-6 h-6 text-blue-600" />,
  AlertTriangle: <AlertTriangle className="w-6 h-6 text-amber-600" />,
  Building2: <Building2 className="w-6 h-6 text-indigo-600" />,
};

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export const OnboardingTour: React.FC = () => {
  const {
    isTourActive,
    currentStep,
    steps,
    isWelcomeOpen,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    closeWelcome,
  } = useTour();

  const navigate = useNavigate();
  const location = useLocation();

  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom' | 'right' | 'center'>('center');
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);

  const activeStep = steps[currentStep];
  const popoverRef = useRef<HTMLDivElement>(null);

  // Asegurar que si el tour está activo y el paso requiere un selector en /branches, estemos en esa ruta
  useEffect(() => {
    if (isTourActive && activeStep?.targetSelector && location.pathname !== '/branches') {
      navigate('/branches');
    }
  }, [isTourActive, activeStep, location.pathname, navigate]);

  // Actualizar posición y spotlight del elemento objetivo
  const updatePosition = useCallback(() => {
    if (!isTourActive || !activeStep || !activeStep.targetSelector) {
      setTargetRect(null);
      setPopoverCoords(null);
      setPopoverPlacement('center');
      return;
    }

    const targetEl = document.querySelector(activeStep.targetSelector) as HTMLElement | null;
    if (!targetEl) {
      setTargetRect(null);
      setPopoverCoords(null);
      setPopoverPlacement('center');
      return;
    }

    const domRect = targetEl.getBoundingClientRect();
    const currentTarget: TargetRect = {
      top: domRect.top,
      left: domRect.left,
      width: domRect.width,
      height: domRect.height,
      right: domRect.right,
      bottom: domRect.bottom,
    };

    setTargetRect(currentTarget);

    // Dimensiones del popover
    const popoverWidth = Math.min(480, window.innerWidth - 32);
    const popoverHeight = 310;
    const padding = 12;

    // Caso especial: Elementos en la barra lateral izquierda (Sidebar)
    const isSidebarItem = currentTarget.left < 220 && window.innerWidth - currentTarget.right >= popoverWidth + 24;
    if (isSidebarItem) {
      setPopoverPlacement('right');
      const top = Math.max(16, Math.min(currentTarget.top - 20, window.innerHeight - popoverHeight - 20));
      const left = currentTarget.right + 20;
      setPopoverCoords({ top, left });
      return;
    }

    // Posicionamiento vertical (arriba o abajo del elemento)
    const spaceBelow = window.innerHeight - (currentTarget.bottom + padding);
    const spaceAbove = currentTarget.top - padding;

    let top = 0;
    let placement: 'top' | 'bottom' = 'bottom';

    if (spaceBelow >= popoverHeight + 20) {
      top = currentTarget.bottom + padding + 14;
      placement = 'bottom';
    } else if (spaceAbove >= popoverHeight + 20) {
      top = Math.max(16, currentTarget.top - padding - popoverHeight - 14);
      placement = 'top';
    } else {
      top = Math.max(16, window.innerHeight - popoverHeight - 20);
      placement = 'bottom';
    }

    let left = Math.max(16, Math.min(currentTarget.left, window.innerWidth - popoverWidth - 16));

    setPopoverPlacement(placement);
    setPopoverCoords({ top, left });
  }, [isTourActive, activeStep]);

  // Ejecutar reposicionamiento al cambiar paso o redimensionar
  useEffect(() => {
    if (!isTourActive || !activeStep) {
      setTargetRect(null);
      setPopoverCoords(null);
      return;
    }

    // Centrar en pantalla suavemente el elemento objetivo si existe
    if (activeStep.targetSelector) {
      const targetEl = document.querySelector(activeStep.targetSelector) as HTMLElement | null;
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }

    // Actualización inmediata y retardada (para esperar el scrollIntoView)
    updatePosition();
    const timeoutId = setTimeout(updatePosition, 350);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isTourActive, currentStep, activeStep, updatePosition]);

  // Navegación por teclado
  useEffect(() => {
    if (!isTourActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTour();
      } else if (e.key === 'ArrowRight') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourActive, currentStep, nextStep, prevStep, skipTour]);

  // 1. Modal de Bienvenida (con tipografía grande y clara)
  if (isWelcomeOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 text-slate-800 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-100 border border-purple-200 mx-auto mb-5 text-purple-700 shadow-sm">
            <Compass className="w-10 h-10" />
          </div>

          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-full uppercase tracking-wider mb-2 border border-purple-200/60">
              Recorrido Interactivo
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ¡Bienvenido a BranchView!
            </h3>
          </div>

          <p className="text-base sm:text-lg text-slate-600 text-center mt-3 leading-relaxed">
            Hemos preparado un <strong>tour guiado de 6 pasos</strong> para que descubras
            las herramientas esenciales de supervisión: filtros rápidos, tarjetas de rentabilidad neta, comparativas multi-sucursal y gestión de alertas.
          </p>

          <div className="mt-6 p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-2 text-slate-700">
            <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base text-purple-950">
              <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
              <span>100% Interactivo, visual y opcional</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 pl-7 leading-relaxed">
              En cada paso se resaltará directamente el componente en pantalla. Puedes saltearlo, cerrarlo o reiniciarlo cuando quieras.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <input
              id="dontAskAgain"
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="dontAskAgain" className="text-sm text-slate-600 select-none cursor-pointer font-medium">
              No volver a preguntar al iniciar sesión
            </label>
          </div>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => closeWelcome(dontAskAgain)}
              className="w-full sm:w-1/2 py-3 px-5 rounded-xl border border-slate-300 text-slate-700 text-base font-semibold hover:bg-slate-100 transition-colors order-2 sm:order-1"
            >
              Omitir por ahora
            </button>
            <button
              type="button"
              onClick={startTour}
              className="w-full sm:w-1/2 py-3 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-base font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/25 transition-all order-1 sm:order-2"
            >
              <span>Comenzar Tour</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Estado Activo del Tour
  if (!isTourActive || !activeStep) {
    return null;
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const padding = 10;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* 
        MÁSCARA SVG SPOTLIGHT:
        Crea un recorte 100% transparente sobre el elemento objetivo,
        dejándolo nítido y brillante con sus colores naturales,
        mientras oscurece el resto de la pantalla al 78%.
      */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto z-40 transition-all duration-300"
        onClick={skipTour}
        aria-hidden="true"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* Fondo blanco: oculta/oscurece todo el sitio */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Recorte negro: deja pasar el elemento objetivo 100% transparente y brillante */}
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Capa oscura con la máscara de corte aplicada */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="#090d16"
          fillOpacity="0.78"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* MARCO ILUMINADO DEL ELEMENTO OBJETIVO */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
          }}
          className="pointer-events-none z-40 rounded-2xl border-2 border-purple-400 ring-4 ring-purple-500/60 shadow-[0_0_50px_rgba(168,85,247,0.55)] transition-all duration-300 animate-pulse"
        >
          {/* Badge superior distintivo sobre el elemento enfocado */}
          <div className="absolute -top-3.5 left-4 flex items-center gap-1.5 px-3 py-0.5 bg-purple-600 text-white text-xs font-black rounded-full shadow-lg uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Paso {currentStep + 1}</span>
          </div>
        </div>
      )}

      {/* TARJETA EXPLICATIVA (POPOVER) CON TIPOGRAFÍA GRANDE */}
      <div
        ref={popoverRef}
        style={
          popoverCoords
            ? {
                top: `${popoverCoords.top}px`,
                left: `${popoverCoords.left}px`,
              }
            : undefined
        }
        className={`pointer-events-auto z-50 w-[calc(100vw-32px)] max-w-[480px] bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 text-slate-800 transition-all duration-300 animate-in fade-in zoom-in-95 ${
          !popoverCoords
            ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : 'fixed'
        }`}
      >
        {/* Flechas indicadoras visuales opcionales según el placement */}
        {popoverCoords && popoverPlacement === 'bottom' && (
          <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-t border-l border-slate-200 rotate-45" />
        )}
        {popoverCoords && popoverPlacement === 'top' && (
          <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white border-b border-r border-slate-200 rotate-45" />
        )}
        {popoverCoords && popoverPlacement === 'right' && (
          <div className="absolute top-8 -left-2 w-4 h-4 bg-white border-b border-l border-slate-200 rotate-45" />
        )}

        {/* Encabezado del paso */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-100 border border-purple-200 text-purple-700 shadow-xs">
              {ICONS[activeStep.iconName || 'Sparkles'] || <Sparkles className="w-6 h-6 text-purple-600" />}
            </div>
            <div>
              <span className="inline-block text-xs font-black text-purple-600 uppercase tracking-wider">
                Paso {currentStep + 1} de {steps.length}
              </span>
              <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                {activeStep.title}
              </h4>
            </div>
          </div>
          <button
            type="button"
            onClick={skipTour}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Cerrar tour (Escape)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido / Explicación con letra amplia y legible */}
        <div className="py-4 text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
          {activeStep.content}
        </div>

        {/* Pie de página con controles y barra de progreso */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={skipTour}
            className="text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-800 underline transition-colors"
          >
            Saltar tour
          </button>

          {/* Indicadores de pasos (Dots) */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-6 bg-purple-600'
                    : idx < currentStep
                    ? 'w-2 bg-purple-300'
                    : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={prevStep}
                className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                title="Paso anterior (Flecha Izquierda)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={isLastStep ? completeTour : nextStep}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm sm:text-base font-bold flex items-center gap-2 shadow-md hover:shadow-purple-500/25 transition-all"
              title={isLastStep ? 'Finalizar tour' : 'Siguiente paso (Flecha Derecha)'}
            >
              {isLastStep ? (
                <>
                  <span>Finalizar</span>
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
