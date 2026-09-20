import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MailCheck, Loader2 } from 'lucide-react';
import { authAPI, errMsg } from '../lib/api';
import AuthShell from '../components/AuthShell';

export default function Confirmar() {
  const { token } = useParams();
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!token) {
      setEstado('error');
      setMensaje('Falta el token de confirmación');
      return;
    }
    authAPI
      .confirmar(token)
      .then((r) => {
        setEstado('ok');
        setMensaje(r.data.mensaje);
      })
      .catch(async (e) => {
        setEstado('error');
        setMensaje(await errMsg(e));
      });
  }, [token]);

  return (
    <AuthShell>
      <div className="p-4 text-center sm:p-6">
        {estado === 'cargando' && (
          <div className="flex flex-col items-center gap-3 py-6 text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin text-accent-500" />
            <p className="text-sm">Confirmando tu correo...</p>
          </div>
        )}
        {estado === 'ok' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <MailCheck className="h-14 w-14 text-emerald-500" />
            <p className="font-semibold text-emerald-400">{mensaje}</p>
            <Link to="/login" className="btn-primary mt-2">Iniciar sesión</Link>
          </div>
        )}
        {estado === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="font-semibold text-red-400">{mensaje}</p>
            <Link to="/login" className="btn-outline mt-2">Volver al inicio</Link>
          </div>
        )}
      </div>
    </AuthShell>
  );
}