import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChefHat, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { errMsg } from '../lib/api';
import { Campo } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const { notificar } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await login(email, password);
      notificar('Sesión iniciada');
      navigate('/recetas');
    } catch (err) {
      setError(await errMsg(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500 text-white shadow-lg">
            <ChefHat className="h-8 w-8" />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-slate-100">CookPlan</h1>
          <p className="text-sm text-slate-400">Recetas, plan semanal y tareas del hogar</p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <Campo label="Correo electrónico">
            <input className="input w-full" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" />
          </Campo>
          <Campo label="Contraseña">
            <input className="input w-full" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" />
          </Campo>
          {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">{error}</p>}
          <button className="btn-primary w-full" disabled={enviando}>
            <LogIn className="h-4 w-4" />
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
          <div className="flex items-center justify-between text-sm">
            <Link to="/registro" className="font-semibold text-accent-500 hover:underline">Crear cuenta</Link>
            <Link to="/recuperar" className="text-slate-400 hover:text-slate-200">Olvidé mi contraseña</Link>
          </div>
        </form>
      </div>
    </div>
  );
}