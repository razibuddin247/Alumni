import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Info, X } from 'lucide-react';

export type ToastVariant = 'loading' | 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (variant: ToastVariant, title: string, message?: string, durationMs?: number) => string;
  updateToast: (
    id: string,
    variant: ToastVariant,
    title: string,
    message?: string,
    durationMs?: number
  ) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const scheduleAutoDismiss = useCallback(
    (id: string, variant: ToastVariant, durationMs?: number) => {
      if (variant === 'loading') return;
      const timeout = durationMs ?? (variant === 'error' ? 5500 : 3800);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, timeout);
    },
    []
  );

  const showToast = useCallback(
    (variant: ToastVariant, title: string, message?: string, durationMs?: number) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, variant, title, message }]);
      scheduleAutoDismiss(id, variant, durationMs);
      return id;
    },
    [scheduleAutoDismiss]
  );

  const updateToast = useCallback(
    (
      id: string,
      variant: ToastVariant,
      title: string,
      message?: string,
      durationMs?: number
    ) => {
      setToasts((prev) =>
        prev.some((t) => t.id === id)
          ? prev.map((t) => (t.id === id ? { id, variant, title, message } : t))
          : [...prev.slice(-3), { id, variant, title, message }]
      );
      scheduleAutoDismiss(id, variant, durationMs);
    },
    [scheduleAutoDismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, updateToast, dismissToast }}>
      {children}

      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[90] flex w-full max-w-sm flex-col gap-2.5 px-4 sm:bottom-6 sm:right-6 sm:px-0 pointer-events-none"
        >
          {toasts.map((toast) => {
            const palette =
              toast.variant === 'success'
                ? 'border-emerald-200 bg-white text-slate-900 shadow-emerald-950/10'
                : toast.variant === 'error'
                ? 'border-rose-200 bg-white text-slate-900 shadow-rose-950/10'
                : toast.variant === 'loading'
                ? 'border-[#C5A059]/40 bg-white text-slate-900'
                : 'border-slate-200 bg-white text-slate-900';

            return (
              <div
                key={toast.id}
                role="status"
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-xl transition-all ${palette}`}
              >
                <div className="mt-0.5 shrink-0">
                  {toast.variant === 'loading' && (
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-[#0A192F]" />
                  )}
                  {toast.variant === 'success' && (
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                  )}
                  {toast.variant === 'error' && (
                    <AlertCircle className="h-4.5 w-4.5 text-rose-600" />
                  )}
                  {toast.variant === 'info' && (
                    <Info className="h-4.5 w-4.5 text-[#0A192F]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#0A192F]">{toast.title}</p>
                  {toast.message && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                      {toast.message}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
