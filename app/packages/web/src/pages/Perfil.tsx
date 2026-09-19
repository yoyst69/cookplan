import React, { useState, FormEvent } from 'react';
import { UserRound, ImagePlus, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { authAPI, errMsg } from '../lib/api';
import { Campo } from '../components/ui';

export default function Perfil() {
  const { usuario, refrescar } = useAuth();
  const { notificar } = useToast();
  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [telefono, setTelefono] = useState(usuario?.telefono || '');
  const [email, setEmail] = useState(usuario?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  if (!usuario) return null;

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await authAPI.updateMeJson({ nombre, telefono: telefono || undefined, email, password: password || undefined });
      notificar('Perfil actualizado');
      setPassword('');
      await refrescar();
    } catch (err) {
      setError(await errMsg(err));
    } finally {
      setEnviando(false);
    }
  };

  const subirLogo = async (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    setSubiendoLogo(true);
    try {
      await authAPI.updateMe(fd);
      notificar('Logo actualizado');
      await refrescar();
    } catch (err) {
      notificar(await errMsg(err), 'error');
    } finally {
      setSubiendoLogo(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-100">
        <UserRound className="h-6 w-6 text-accent-500" /> Mi perfil
      </h1>

      <div className="card flex items-center gap-4 p-5">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-edge bg-panel-2">
          {usuario.logo ? (
            <img src={`${import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || ''}/uploads/${usuario.logo}`} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-accent-500">
              {usuario.nombre.slice(0, 2).toUpperCase()}
            </div>
          )}
          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 text-transparent transition hover:bg-black/40 hover:text-white" title="Cambiar logo">
            <ImagePlus className="h-6 w-6" />
            <input type="file" accept="image/*" className="hidden" disabled={subiendoLogo} onChange={(e) => { const f = e.target.files?.[0]; if (f) subirLogo(f); }} />
          </label>
        </div>
        <div>
          <div className="text-lg font-bold text-slate-100">{usuario.nombre}</div>
          <div className="text-sm text-slate-400">{usuario.email}</div>
          <div className="mt-1 flex items-center gap-2">
            {usuario.esAdmin && <span className="badge bg-accent-500/15 text-accent-500">admin</span>}
            {usuario.confirmado ? <span className="badge bg-emerald-500/15 text-emerald-400">correo verificado</span> : <span className="badge bg-amber-500/15 text-amber-400">pendiente verificación</span>}
          </div>
        </div>
        {subiendoLogo && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400"><UploadCloud className="h-4 w-4 animate-bounce" /> subiendo logo...</span>
        )}
      </div>

      <form onSubmit={guardar} className="card space-y-4 p-5">
        <Campo label="Nombre">
          <input className="input w-full" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Correo electrónico">
            <input className="input w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          <Campo label="Teléfono">
            <input className="input w-full" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />
          </Campo>
        </div>
        <Campo label="Nueva contraseña" hint="Déjalo vacío para no cambiarla">
          <input className="input w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Campo>
        {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">{error}</p>}
        <div className="flex justify-end">
          <button className="btn-primary" disabled={enviando}>{enviando ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </form>
    </div>
  );
}