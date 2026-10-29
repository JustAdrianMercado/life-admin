"use client";

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; action?: { label: string; onClick: () => void | Promise<void> } };

const ToastContext = createContext<(toast: Omit<Toast, "id">) => void>(() => {});

/** Aviso abajo de la pantalla, con una acción opcional ("Deshacer"), como en Gmail. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = useCallback((t: Omit<Toast, "id">) => setToast({ ...t, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-fg px-4 py-3 text-sm text-bg shadow-xl md:bottom-6"
        >
          <span className="flex-1">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="cursor-pointer font-semibold text-accent-soft"
              onClick={async () => {
                setToast(null);
                await toast.action!.onClick();
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" aria-label="Cerrar" className="cursor-pointer opacity-60" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
