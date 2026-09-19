import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: React.ReactNode;
  ancho?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const ANCHOS: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-5xl',
};

export default function Modal({ abierto, onCerrar, titulo, children, ancho = 'md' }: ModalProps) {
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        className={`max-h-[92vh] w-full ${ANCHOS[ancho]} overflow-y-auto rounded-t-2xl border border-edge bg-panel shadow-2xl animate-fade-up sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-panel px-5 py-3.5">
          <h2 className="text-base font-bold text-slate-100">{titulo}</h2>
          <button className="rounded-lg p-1.5 text-slate-400 transition hover:bg-panel-3 hover:text-slate-200" onClick={onCerrar} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}