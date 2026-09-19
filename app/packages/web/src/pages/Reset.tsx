import React, { useState, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useToast } from '../components/Toast';
import { authAPI, errMsg } from '../lib/api';
import { Campo } from '../components/ui';

export default function Reset() {
  const { notificar } = useToast();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
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
      const r = await authAPI.reset(token, password);
      setOk(r.data.mensaje);
      notificar('Contraseña actualizada');
    } catch (err) {
      setError(await errMsg(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="card space-y-4 p-6">
          <h1 className="text-xl font-extrabold text-slate-100">Nueva contraseña</h1>
          <form onSubmit={submit} className="space-y-4">
            <Campo label="Contraseña" hint="Mínimo 6 caracteres">
              <input className="input w-full" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </Campo>
            <Campo label="Repite la contraseña">
              <input className="input w-full" type="password" required value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
            </Campo>
            {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">{error}</p>}
            {ok && <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-400">{ok}</p>}
            <button className="btn-primary w-full" disabled={enviando}>
              <KeyRound className="h-4 w-4" />
              {enviando ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
          <div className="text-center text-sm">
            <Link to="/login" className="font-semibold text-accent-500 hover:underline">Volver al inicio</Link>
          </div>
        </div>
      </div>
    </div>
  );
}