import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChefHat, CalendarDays, ShoppingCart, ListChecks, User, Users, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV = [
  { to: '/recetas', label: 'Recetas', icon: ChefHat },
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
      <header className="sticky top-0 z-30 border-b border-edge bg-panel/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-500 text-white shadow">
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-100">CookPlan</span>
          </div>
          <div className="flex-1" />
          <nav className="flex items-center gap-1 overflow-x-auto">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-accent-500/15 text-accent-500' : 'text-slate-400 hover:bg-panel-3 hover:text-slate-200'
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
            {usuario && (
              <button onClick={salir} className="flex items-center gap-1.5 rounded-lg p-2 text-slate-400 transition hover:bg-panel-3 hover:text-red-400" title="Salir">
                <LogOut className="h-4 w-4" />
                <span className="hidden text-xs font-semibold md:inline">{usuario.nombre}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">{children}</main>

      <footer className="border-t border-edge py-4 text-center text-xs text-slate-500">
        CookPlan · recetas, plan semanal y tareas del hogar
      </footer>
    </div>
  );
}