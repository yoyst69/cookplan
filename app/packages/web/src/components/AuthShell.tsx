import React, { useEffect, useState } from 'react';
import { ChefHat, ChevronLeft, ChevronRight } from 'lucide-react';

const DIAS = [
  {
    img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80',
    emoji: '🍽️',
    titulo: 'Un recetario para tu cocina',
    texto: 'Todas las recetas de la familia guardadas en un mismo sitio.',
    gradiente: 'bg-gradient-to-br from-orange-700 via-orange-900 to-neutral-950',
  },
  {
    img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1600&q=80',
    emoji: '🥗',
    titulo: 'Comidas saludables cada día',
    texto: 'Planifica la semana sin repetir plato y sin pelearte con la cesta.',
    gradiente: 'bg-gradient-to-br from-lime-700 via-emerald-900 to-neutral-950',
  },
  {
    img: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1600&q=80',
    emoji: '🛒',
    titulo: 'La compra lista en un clic',
    texto: 'Genera la lista de la compra a partir del menú de la semana.',
    gradiente: 'bg-gradient-to-br from-rose-700 via-red-900 to-neutral-950',
  },
  {
    img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1600&q=80',
    emoji: '🧹',
    titulo: 'El hogar, bien repartido',
    texto: 'Sábado y domingo se reparten las tareas de casa entre todos.',
    gradiente: 'bg-gradient-to-br from-amber-700 via-orange-900 to-neutral-950',
  },
  {
    img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1600&q=80',
    emoji: '👩‍🍳',
    titulo: 'Cocinar en familia',
    texto: 'Recetas, plan semanal, lista de la compra y tareas. Todo junto.',
    gradiente: 'bg-gradient-to-br from-red-700 via-rose-900 to-neutral-950',
  },
];

const CHIPS = ['🥘 Recetas', '📅 Plan semanal', '🛒 Lista de la compra', '🧹 Tareas del hogar'];

function Carrusel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setIdx((i) => (i + 1) % DIAS.length), 6000);
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {DIAS.map((d, i) => (
        <figure
          key={d.img}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === idx ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          <div className={`absolute inset-0 ${d.gradiente}`} />
          {d.img && (
            <img
              src={d.img}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
          <figcaption className="absolute inset-x-0 bottom-16 px-10 text-white">
            <span className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-4xl shadow-xl ring-1 ring-white/20 backdrop-blur">
              {d.emoji}
            </span>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight drop-shadow">{d.titulo}</h2>
            <p className="mt-1.5 max-w-md text-sm text-white/85">{d.texto}</p>
          </figcaption>
        </figure>
      ))}

      <div className="absolute inset-x-0 bottom-7 z-20 flex items-center justify-center gap-2">
        {DIAS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Página ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-accent-400' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
          />
        ))}
      </div>

      <div className="absolute right-5 top-5 z-20 flex flex-col gap-2">
        <button
          onClick={() => setIdx((idx - 1 + DIAS.length) % DIAS.length)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/50"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setIdx((idx + 1) % DIAS.length)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/50"
          aria-label="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Logo({ grande }: { grande?: boolean }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-lg shadow-accent-500/30 ${grande ? 'h-14 w-14' : 'h-9 w-9'}`}>
      <ChefHat className={grande ? 'h-7 w-7' : 'h-5 w-5'} />
    </div>
  );
}

export default function AuthShell({
  children,
  titulo,
  subtitulo,
}: {
  children: React.ReactNode;
  titulo?: string;
  subtitulo?: string;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[46%] shrink-0 overflow-hidden lg:block">
        <Carrusel />
        <div className="absolute left-8 top-8 z-30 flex items-center gap-3 text-white">
          <Logo />
          <div>
            <div className="text-lg font-extrabold uppercase tracking-widest">CookPlan</div>
            <div className="text-[11px] uppercase tracking-widest text-white/70">Recetas · Plan · Hogar</div>
          </div>
        </div>
        <div className="absolute bottom-7 left-8 right-8 z-30 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <span key={c} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <Logo grande />
            <h1 className="mt-3 text-2xl font-extrabold uppercase tracking-widest text-slate-100">CookPlan</h1>
            <p className="text-sm text-slate-400">Recetas · Plan semanal · Tareas del hogar</p>
          </div>

          <div className="card relative overflow-hidden p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600" />
            {titulo && <h2 className="mb-1 text-2xl font-extrabold text-slate-100">{titulo}</h2>}
            {subtitulo && <p className="mb-5 text-sm text-slate-400">{subtitulo}</p>}
            {children}
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">CookPlan para el hogar de Fiti, Mar y Jose</p>
        </div>
      </div>
    </div>
  );
}