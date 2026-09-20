import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, CalendarDays, ShoppingCart, ListChecks, User, Users, Sun, Moon, LogOut, Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { notificacionesAPI, Notificacion } from '../lib/api';
import { Logo } from './AuthShell';

const NAV = [
  { to: '/recetas', label: 'Recetas', icon: UtensilsCrossed },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/lista', label: 'Compra', icon: ShoppingCart },
  { to: '/tareas', label: 'Tareas', icon: ListChecks },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { usuario, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const nav = [...NAV];
  if (usuario?.esAdmin) nav.splice(5, 0, { to: '/usuarios', label: 'Usuarios', icon: Users });

  const salir = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-edge/60 bg-panel/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <NavLink to="/recetas" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-extrabold uppercase tracking-widest text-slate-100">CookPlan</span>
          </NavLink>
          <div className="flex-1" />
          <nav className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-edge/60 bg-panel p-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-md shadow-accent-500/30'
                      : 'text-slate-400 hover:bg-panel-3 hover:text-slate-200'
                  }`
                }
              >
                <n.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{n.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <button onClick={toggle} className="rounded-lg p-2 text-slate-400 transition hover:bg-panel-3 hover:text-slate-200" title="Cambiar tema">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {usuario && <Campana />}
            {usuario && (
              <div className="flex items-center gap-2">
                <button
                  onClick={salir}
                  className="flex items-center gap-2 rounded-full border border-edge/60 bg-panel py-1 pl-1 pr-3 transition hover:border-accent-500/50 hover:bg-panel-3"
                  title="Salir de la sesión"
                >
                  {usuario.logo ? (
                    <img src={`${import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || ''}/uploads/${usuario.logo}`} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent-400 to-accent-600 text-[10px] font-extrabold text-white">
                      {usuario.nombre.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="hidden max-w-24 truncate text-xs font-semibold text-slate-200 md:inline">{usuario.nombre}</span>
                  <LogOut className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 animate-fade-up">{children}</main>

      <footer className="border-t border-edge/60 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-1 px-4 sm:flex-row sm:gap-3">
          <span>CookPlan · recetas, plan semanal y tareas del hogar</span>
          <span className="hidden text-amber-600/80 sm:inline">·</span>
          <span>Hecho con ❤️ para Fiti, Mar y Jose</span>
        </div>
      </footer>
    </div>
  );
}

function msTiempo(iso: string): string {
  const d = new Date(iso);
  const ahora = new Date();
  const diff = ahora.getTime() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function Campana() {
  const [abierta, setAbierta] = useState(false);
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      const [r, n] = await Promise.all([notificacionesAPI.list(30), notificacionesAPI.noLeidas()]);
      setLista(r.data.notificaciones);
      setNoLeidas(n.data.noLeidas);
    } catch {
      /* sin conexion o sin token: se ignora */
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => {
    if (!abierta) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setAbierta(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [abierta]);

  const marcaLeida = async (id: number) => {
    setLista((p) => p.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    setNoLeidas((p) => Math.max(0, p - 1));
    notificacionesAPI.leer(id).catch(() => undefined);
  };

  const todasLeidas = async () => {
    setLista((p) => p.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
    notificacionesAPI.leerTodas().catch(() => undefined);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setAbierta((v) => !v)}
        className="relative rounded-lg p-2 text-slate-400 transition hover:bg-panel-3 hover:text-slate-200"
        title="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {noLeidas > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-white">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {abierta && (
        <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-2xl border border-edge bg-panel shadow-2xl">
          <div className="flex items-center gap-2 border-b border-edge px-4 py-2.5">
            <h3 className="text-sm font-extrabold text-slate-100">Notificaciones</h3>
            {noLeidas > 0 && (
              <button onClick={todasLeidas} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-accent-500 hover:text-accent-400">
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {cargando ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">Cargando...</p>
            ) : lista.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <ListChecks className="h-6 w-6 text-slate-600" />
                <p className="text-xs text-slate-500">No hay notificaciones.<br />Al repartir o finalizar tareas aparecerán aquí.</p>
              </div>
            ) : (
              <ul className="divide-y divide-edge">
                {lista.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => !n.leida && marcaLeida(n.id)}
                      className={`flex w-full gap-2.5 px-4 py-3 text-left transition hover:bg-panel-3 ${n.leida ? '' : 'bg-accent-500/5'}`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.leida ? 'bg-slate-600' : 'bg-accent-500'}`} />
                      <span className="min-w-0">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-xs font-bold ${n.leida ? 'text-slate-400' : 'text-slate-100'}`}>{n.titulo}</span>
                          <span className="shrink-0 text-[10px] text-slate-500">{msTiempo(n.createdAt)}</span>
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-slate-400">{n.mensaje}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}