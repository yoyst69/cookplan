import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, UserPlus } from 'lucide-react';
import { useToast } from '../components/Toast';
import { authAPI, errMsg } from '../lib/api';
import { Campo } from '../components/ui';

export default function Register() {
  const { notificar } = useToast();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [enviando, setEnviando] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    if (password !== password2) return setError('Las contraseñas no coinciden');
    setEnviando(true);
    try {
      const r = await authAPI.register(nombre, email, password);
      setOk(r.data.mensaje);
      notificar('Cuenta creada');
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
          <h1 className="mt-3 text-2xl font-extrabold text-slate-100">Crear cuenta</h1>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <Campo label="Nombre">
            <input className="input w-full" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
          </Campo>
          <Campo label="Correo electrónico">
            <input className="input w-full" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" />
          </Campo>
          <Campo label="Contraseña" hint="Mínimo 6 caracteres">
            <input className="input w-full" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Campo>
          <Campo label="Repite la contraseña">
            <input className="input w-full" type="password" required value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
          </Campo>
          {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">{error}</p>}
          {ok && <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-400">{ok}</p>}
          <button className="btn-primary w-full" disabled={enviando}>
            <UserPlus className="h-4 w-4" />
            {enviando ? 'Creando...' : 'Registrarme'}
          </button>
          <div className="text-center text-sm">
            <Link to="/login" className="font-semibold text-accent-500 hover:underline">Ya tengo cuenta</Link>
          </div>
        </form>
      </div>
    </div>
  );
}