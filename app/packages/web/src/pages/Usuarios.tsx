import React, { useCallback, useEffect, useState } from 'react';
import { Users, Plus, Trash2, RotateCcw, Shield, UserCheck } from 'lucide-react';
import { usuariosAPI, errMsg, Usuario } from '../lib/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Spinner, Campo } from '../components/ui';

export default function Usuarios() {
  const { notificar } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await usuariosAPI.list();
      setUsuarios(r.data.usuarios);
    } catch (e) {
      notificar(await errMsg(e), 'error');
    } finally {
      setCargando(false);
    }
  }, [notificar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const toggleAdmin = async (u: Usuario) => {
    try {
      await usuariosAPI.patch(u.id, { esAdmin: !u.esAdmin });
      notificar(`${u.nombre} ${u.esAdmin ? 'deja de ser' : 'ahora es'} admin`);
      cargar();
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  const toggleActivo = async (u: Usuario) => {
    try {
      await usuariosAPI.patch(u.id, { activo: !u.activo });
      notificar(u.activo ? `${u.nombre} desactivado` : `${u.nombre} activado`);
      cargar();
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  const reactivar = async (u: Usuario) => {
    try {
      await usuariosAPI.patch(u.id, { activo: true });
      notificar(`${u.nombre} reactivado`);
      cargar();
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  const resetPass = async (u: Usuario) => {
    const nueva = window.prompt(`Nueva contraseña para ${u.nombre} (mín. 6 caracteres):`);
    if (!nueva) return;
    try {
      await usuariosAPI.patch(u.id, { password: nueva });
      notificar('Contraseña cambiada');
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto flex items-center gap-2 text-2xl font-extrabold text-slate-100">
          <Users className="h-6 w-6 text-accent-500" /> Usuarios
        </h1>
        <button className="btn-primary" onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Nuevo usuario</button>
      </div>

      {cargando ? (
        <Spinner texto="Cargando usuarios..." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5">Usuario</th>
                <th className="px-4 py-2.5">Correo</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Permisos</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {usuarios.map((u) => (
                <tr key={u.id} className={u.activo ? '' : 'opacity-50'}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500/15 text-xs font-extrabold text-accent-500">
                        {u.nombre.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-semibold text-slate-100">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{u.email}</td>
                  <td className="px-4 py-2.5">
                    {!u.activo ? (
                      <span className="badge bg-red-500/15 text-red-400">inactivo</span>
                    ) : !u.confirmado ? (
                      <span className="badge bg-amber-500/15 text-amber-400">sin verificar</span>
                    ) : (
                      <span className="badge bg-emerald-500/15 text-emerald-400">activo</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.esAdmin && <span className="badge bg-accent-500/15 text-accent-500">admin</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-ghost" onClick={() => toggleAdmin(u)} title="Dar/quitar admin" disabled={!u.activo}>
                        <Shield className={`h-4 w-4 ${u.esAdmin ? 'text-accent-500' : ''}`} />
                      </button>
                      <button className="btn-ghost" onClick={() => resetPass(u)} title="Cambiar contraseña" disabled={!u.activo}>
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      {u.activo ? (
                        <button className="btn-ghost hover:!bg-red-500/15 hover:!text-red-400" onClick={() => toggleActivo(u)} title="Desactivar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button className="btn-ghost" onClick={() => reactivar(u)} title="Reactivar">
                          <UserCheck className="h-4 w-4 text-emerald-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <ModalNuevo onCerrar={() => setModal(false)} onCreado={() => { setModal(false); cargar(); }} />}
    </div>
  );
}

function ModalNuevo({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: () => void }) {
  const { notificar } = useToast();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [esAdmin, setEsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await usuariosAPI.crear({ nombre, email, password: password || undefined, esAdmin });
      notificar('Usuario creado');
      onCreado();
    } catch (err) {
      setError(await errMsg(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Nuevo usuario" ancho="sm">
      <form onSubmit={crear} className="space-y-4">
        <Campo label="Nombre">
          <input className="input w-full" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo label="Correo electrónico">
          <input className="input w-full" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo label="Contraseña" hint="Si se deja vacío el usuario deberá confirmar su correo">
          <input className="input w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Campo>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={esAdmin} onChange={(e) => setEsAdmin(e.target.checked)} className="h-4 w-4 accent-orange-500" />
          Administrador
        </label>
        {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onCerrar}>Cancelar</button>
          <button className="btn-primary" disabled={enviando}>{enviando ? 'Creando...' : 'Crear'}</button>
        </div>
      </form>
    </Modal>
  );
}