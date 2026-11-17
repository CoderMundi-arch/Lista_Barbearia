import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  notify: (variant: ToastVariant, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info, warning: TriangleAlert };
const TONES: Record<ToastVariant, string> = {
  success: 'text-emerald-300',
  error: 'text-rose-300',
  info: 'text-silver-200',
  warning: 'text-amber-300',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = ++counter.current;
      setToasts((t) => [...t.slice(-2), { id, variant, title, description }]);
      window.setTimeout(() => dismiss(id), variant === 'error' ? 5500 : 3500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.variant];
          return (
            <div
              key={toast.id}
              role={toast.variant === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl border border-white/10 bg-graphite-800/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur"
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${TONES[toast.variant]}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-xs leading-relaxed text-silver-400">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-m-1 rounded-md p-1 text-silver-500 transition hover:bg-white/5 hover:text-white"
                aria-label="Fechar notificação"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>.');
  return ctx;
}
