import React from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ texto }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" />
      {texto && <span>{texto}</span>}
    </div>
  );
}

export function Campo({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function EmptyState({ icon: Icon, texto }: { icon: React.ComponentType<{ className?: string }>; texto: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-400">
      <Icon className="h-10 w-10 opacity-40" />
      <p className="text-sm">{texto}</p>
    </div>
  );
}

export function Esfuerzo({ peso }: { peso: number }) {
  return (
    <span className="text-xs text-slate-500">
      {'●'.repeat(peso)}
      {'○'.repeat(3 - peso)}
    </span>
  );
}

export const MOMENTO_LABEL: Record<string, string> = {
  COMIDA: 'Comida',
  CENA: 'Cena',
  AMBAS: 'Comida / Cena',
  POSTRE: 'Postre',
};

export function MomentoBadge({ momento }: { momento: string }) {
  const colores: Record<string, string> = {
    COMIDA: 'bg-amber-500/15 text-amber-500',
    CENA: 'bg-indigo-500/15 text-indigo-400',
    AMBAS: 'bg-emerald-500/15 text-emerald-400',
    POSTRE: 'bg-pink-500/15 text-pink-400',
  };
  return <span className={`badge ${colores[momento] || ''}`}>{MOMENTO_LABEL[momento] || momento}</span>;
}