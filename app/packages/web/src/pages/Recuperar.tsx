import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useToast } from '../components/Toast';
import { authAPI, errMsg } from '../lib/api';
import { Campo } from '../components/ui';
import AuthShell from '../components/AuthShell';

export default function Recuperar() {
  const { notificar } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [enviando, setEnviando] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    setEnviando(true);
    try {
      const r = await authAPI.recuperar(email);
      setOk(r.data.mensaje);
      notificar('Solicitud enviada');
    } catch (err) {
      setError(await errMsg(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthShell titulo="Recuperar contraseña" subtitulo="Te enviaremos un enlace por correo para restablecerla">
      <form onSubmit={submit} className="space-y-4">
        <Campo label="Correo electrónico">
          <input className="input-dark input w-full" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
        </Campo>
        {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">{error}</p>}
        {ok && <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-400">{ok}</p>}
        <button className="btn-primary w-full py-2.5" disabled={enviando}>
          <Mail className="h-4 w-4" />
          {enviando ? 'Enviando...' : 'Enviar enlace'}
        </button>
        <div className="text-center text-sm">
          <Link to="/login" className="font-semibold text-accent-500 hover:text-accent-400 hover:underline">Volver al inicio</Link>
        </div>
      </form>
    </AuthShell>
  );
}