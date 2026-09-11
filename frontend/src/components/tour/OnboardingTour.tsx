import React, { useEffect, useState, useRef } from 'react';
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
  Sparkles: <Sparkles className="w-5 h-5 text-purple-600" />,
  Filter: <Filter className="w-5 h-5 text-blue-600" />,
  TrendingUp: <TrendingUp className="w-5 h-5 text-emerald-600" />,
  CheckSquare: <CheckSquare className="w-5 h-5 text-blue-600" />,
  AlertTriangle: <AlertTriangle className="w-5 h-5 text-amber-600" />,
  Building2: <Building2 className="w-5 h-5 text-indigo-600" />,
};

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

  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<'top' | 'bottom' | 'center'>('center');
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);

  const activeStep = steps[currentStep];
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position and highlight target element
  useEffect(() => {
    if (!isTourActive || !activeStep) {
      setHighlightStyle(null);
      setPopoverCoords(null);
      return;
    }

    const updatePosition = () => {
      if (!activeStep.targetSelector) {
        setHighlightStyle(null);
        setPopoverPosition('center');
        setPopoverCoords(null);
        return;
      }

      const targetEl = document.querySelector(activeStep.targetSelector) as HTMLElement | null;
      if (!targetEl) {
        setHighlightStyle(null);
        setPopoverPosition('center');
        setPopoverCoords(null);
        return;
      }

      // Scroll into view gently
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

      const rect = targetEl.getBoundingClientRect();
      const padding = 8;

      setHighlightStyle({
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + padding * 2}px`,
        height: `${rect.height + padding * 2}px`,
      });

      // Determine popover position
      const popoverWidth = 420;
      const popoverHeight = 250;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top = 0;
      let left = Math.max(16, Math.min(rect.left, window.innerWidth - popoverWidth - 24));

      if (spaceBelow > popoverHeight + 20) {
        top = rect.bottom + 16;
        setPopoverPosition('bottom');
      } else if (spaceAbove > popoverHeight + 20) {
        top = rect.top - popoverHeight - 16;
        setPopoverPosition('top');
      } else {
        setPopoverPosition('center');
        setPopoverCoords(null);
        return;
      }

      setPopoverCoords({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isTourActive, currentStep, activeStep]);

  // Keyboard navigation
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
  }, [isTourActive, currentStep]);

  // 1. Welcome Modal
  if (isWelcomeOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 mx-auto mb-4 text-purple-600 shadow-xs">
            <Compass className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-center text-slate-900 tracking-tight">
            ¡Bienvenido a BranchView!
          </h3>

          <p className="text-sm text-slate-600 text-center mt-2 leading-relaxed">
            Hemos preparado un <strong>recorrido guiado de 6 pasos</strong> para que conozcas
            las herramientas clave de supervisión: filtros, tarjetas de salud financiera, comparativas multi-sucursal y alertas operativas.
          </p>

          <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>100% interactivo y opcional</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-6">
              Puedes saltearlo, cancelarlo o volver a iniciarlo en cualquier momento desde el botón en la barra superior.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <input
              id="dontAskAgain"
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="dontAskAgain" className="text-xs text-slate-500 select-none cursor-pointer">
              No volver a preguntar al iniciar sesión
            </label>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => closeWelcome(dontAskAgain)}
              className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors order-2 sm:order-1"
            >
              Omitir por ahora
            </button>
            <button
              type="button"
              onClick={startTour}
              className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors order-1 sm:order-2"
            >
              <span>Comenzar Tour</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active Tour Step Popover
  if (!isTourActive || !activeStep) {
    return null;
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dark overlay backdrop */}
      <div className="absolute inset-0 bg-slate-950/50 transition-opacity duration-300 pointer-events-auto" onClick={skipTour} />

      {/* Target element highlight ring */}
      {highlightStyle && (
        <div
          style={highlightStyle}
          className="absolute z-50 rounded-xl transition-all duration-300 pointer-events-none ring-4 ring-purple-500/90 ring-offset-4 ring-offset-slate-900 shadow-2xl shadow-purple-500/20"
        />
      )}

      {/* Popover Step Card */}
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
        className={`pointer-events-auto z-50 w-full max-w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 text-slate-800 transition-all duration-300 animate-in fade-in zoom-in-95 ${
          !popoverCoords
            ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : 'absolute'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
              {ICONS[activeStep.iconName || 'Sparkles'] || <Sparkles className="w-5 h-5 text-purple-600" />}
            </div>
            <div>
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
                Paso {currentStep + 1} de {steps.length}
              </span>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
                {activeStep.title}
              </h4>
            </div>
          </div>
          <button
            type="button"
            onClick={skipTour}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Cerrar tour (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-3 text-xs text-slate-600 leading-relaxed">
          {activeStep.content}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={skipTour}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-700 underline transition-colors"
          >
            Saltar tour
          </button>

          {/* Step Dots */}
          <div className="flex items-center gap-1">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-4 bg-purple-600'
                    : idx < currentStep
                    ? 'bg-purple-300'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {!isFirstStep && (
              <button
                type="button"
                onClick={prevStep}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Paso anterior (←)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={isLastStep ? completeTour : nextStep}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              title={isLastStep ? 'Finalizar tour' : 'Siguiente paso (→)'}
            >
              {isLastStep ? (
                <>
                  <span>Finalizar</span>
                  <Check className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
