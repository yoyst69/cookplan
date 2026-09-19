import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

type Tipo = 'ok' | 'error' | 'info';

interface Toast {
  id: number;
  tipo: Tipo;
  texto: string;
}

interface ToastContextValue {
  notificar: (texto: string, tipo?: Tipo) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notificar = (texto: string, tipo: Tipo = 'ok') => {
    const id = nextId++;
    setToasts((p) => [...p, { id, tipo, texto }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  };

  return (
    <ToastContext.Provider value={{ notificar }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2 rounded-xl border border-edge bg-panel px-4 py-2.5 text-sm font-medium shadow-xl animate-pop"
          >
            {t.tipo === 'ok' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
            {t.tipo === 'error' && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
            {t.tipo === 'info' && <Info className="h-4 w-4 shrink-0 text-sky-500" />}
            <span className="text-slate-100">{t.texto}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}