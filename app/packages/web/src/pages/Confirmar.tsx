import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MailCheck, Loader2 } from 'lucide-react';
import { authAPI, errMsg } from '../lib/api';

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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8 text-center">
        {estado === 'cargando' && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Confirmando tu correo...</p>
          </div>
        )}
        {estado === 'ok' && (
          <div className="flex flex-col items-center gap-3">
            <MailCheck className="h-10 w-10 text-emerald-500" />
            <p className="font-semibold text-emerald-400">{mensaje}</p>
            <Link to="/login" className="btn-primary mt-2">Iniciar sesión</Link>
          </div>
        )}
        {estado === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <p className="font-semibold text-red-400">{mensaje}</p>
            <Link to="/login" className="btn-outline mt-2">Volver al inicio</Link>
          </div>
        )}
      </div>
    </div>
  );
}