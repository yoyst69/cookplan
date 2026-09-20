import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { errMsg } from '../lib/api';
import { Campo } from '../components/ui';
import AuthShell from '../components/AuthShell';

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
    <AuthShell titulo="Bienvenido de nuevo" subtitulo="Inicia sesión para entrar en tu cocina">
      <form onSubmit={submit} className="space-y-4">
        <Campo label="Correo electrónico">
          <input className="input-dark input w-full" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" />
        </Campo>
        <Campo label="Contraseña">
          <input className="input-dark input w-full" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" />
        </Campo>
        {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">{error}</p>}
        <button className="btn-primary w-full py-2.5" disabled={enviando}>
          <LogIn className="h-4 w-4" />
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
        <div className="flex items-center justify-between text-sm">
          <Link to="/registro" className="font-semibold text-accent-500 hover:text-accent-400 hover:underline">Crear cuenta</Link>
          <Link to="/recuperar" className="text-slate-400 hover:text-slate-200">¿Olvidaste tu contraseña?</Link>
        </div>
      </form>
    </AuthShell>
  );
}