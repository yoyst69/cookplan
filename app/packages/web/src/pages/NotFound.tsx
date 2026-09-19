import React from 'react';
import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <ChefHat className="h-12 w-12 text-accent-500" />
      <h1 className="text-3xl font-extrabold text-slate-100">404</h1>
      <p className="text-slate-400">Esa página no existe.</p>
      <Link to="/recetas" className="btn-primary">Ir a recetas</Link>
    </div>
  );
}