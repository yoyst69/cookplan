import React from 'react';
import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { Logo } from '../components/AuthShell';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-4 text-center">
      <Logo grande />
      <div>
        <h1 className="gradient-text text-7xl font-extrabold tracking-tight">404</h1>
        <p className="mt-2 max-w-sm text-slate-400">
          Ups... esta receta no está en nuestro libro. Esa página no existe.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/recetas" className="btn-primary">Ir a recetas</Link>
        <Link to="/" className="btn-outline">Volver al inicio</Link>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><ChefHat className="h-3.5 w-3.5 text-accent-500" /> CookPlan · recetas, plan semanal y tareas del hogar</p>
    </div>
  );
}