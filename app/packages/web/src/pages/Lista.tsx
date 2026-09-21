import React, { useCallback, useEffect, useState } from 'react';
import { ShoppingCart, Plus, Trash2, RefreshCw, ChevronLeft, ChevronRight, Store, Wallet } from 'lucide-react';
import { listaAPI, errMsg, ListaItem } from '../lib/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Spinner, EmptyState, Campo } from '../components/ui';
import { mondayOf, isoToday, addDaysIso, formatearFechaLarga, nombreDia } from '../lib/fechas';

export default function Lista() {
  const { notificar } = useToast();
  const [semana, setSemana] = useState<string>(mondayOf(isoToday()));
  const [items, setItems] = useState<ListaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);

  const cargar = useCallback(async (s: string) => {
    setCargando(true);
    try {
      const r = await listaAPI.get(s);
      setItems(r.data.items);
    } catch (e) {
      notificar(await errMsg(e), 'error');
    } finally {
      setCargando(false);
    }
  }, [notificar]);

  useEffect(() => {
    cargar(semana);
  }, [semana, cargar]);

  const pendientes = items.filter((i) => !i.checked);
  const comprados = items.filter((i) => i.checked);

  const marcar = async (item: ListaItem, checked: boolean) => {
    setItems((p) => p.map((i) => (i.id === item.id ? { ...i, checked } : i)));
    try {
      await listaAPI.patch(item.id, { checked });
    } catch (e) {
      notificar(await errMsg(e), 'error');
      cargar(semana);
    }
  };

  const toggleLoPagaYo = async (item: ListaItem) => {
    const nuevo = item.loPagaYo === true ? null : true;
    setItems((p) => p.map((i) => (i.id === item.id ? { ...i, loPagaYo: nuevo } : i)));
    try {
      await listaAPI.patch(item.id, { loPagaYo: nuevo });
    } catch (e) {
      notificar(await errMsg(e), 'error');
      cargar(semana);
    }
  };

  const borrar = async (id: number) => {
    try {
      await listaAPI.del(id);
      setItems((p) => p.filter((i) => i.id !== id));
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  const generar = async () => {
    try {
      const r = await listaAPI.generar(semana);
      setItems(r.data.items);
      notificar(`Lista regenerada (${r.data.generados} productos del menu)`);
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  const vaciar = async () => {
    if (!window.confirm('Vaciar TODA la lista de la compra de esta semana? Esta accion no se puede deshacer.')) return;
    try {
      const r = await listaAPI.vaciar(semana);
      setItems([]);
      notificar(`Lista vaciada (${r.data.borrados} elementos eliminados)`);
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto flex items-center gap-2 text-2xl font-extrabold text-slate-100">
          <ShoppingCart className="h-6 w-6 text-accent-500" /> Lista de la compra
        </h1>
        <div className="flex items-center gap-1 rounded-xl border border-edge bg-panel p-1">
          <button className="btn-ghost" onClick={() => setSemana((s) => addDaysIso(s, -7))}><ChevronLeft className="h-4 w-4" /></button>
          <button className="px-2 text-sm font-semibold text-slate-200" onClick={() => setSemana(mondayOf(isoToday()))}>{formatearFechaLarga(semana)}</button>
          <button className="btn-ghost" onClick={() => setSemana((s) => addDaysIso(s, 7))}><ChevronRight className="h-4 w-4" /></button>
        </div>
        <button className="btn-outline" onClick={generar}><RefreshCw className="h-4 w-4" /> Del menu</button>
        <button className="btn-danger-soft" onClick={vaciar} disabled={items.length === 0}><Trash2 className="h-4 w-4" /> Vaciar</button>
        <button className="btn-primary" onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Anadir</button>
      </div>

      {!cargando && items.length > 0 && (
        <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Progreso</span>
          <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-panel-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-accent-500 transition-all duration-500"
              style={{ width: `${Math.round((comprados.length / items.length) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">
            <b className="text-slate-100">{comprados.length}</b> comprados - <b className="text-amber-400">{pendientes.length}</b> pendientes
          </span>
        </div>
      )}
      {cargando ? (
        <Spinner texto="Cargando lista..." />
      ) : items.length === 0 ? (
        <EmptyState icon={Store} texto="Todavia no hay nada en la lista. Anade productos o genera la lista desde el menu de la semana." />
      ) : (
        <div className="space-y-3">
          {pendientes.length > 0 && (
            <div className="card divide-y divide-edge overflow-hidden">
              {pendientes.map((i) => (
                <Row key={i.id} item={i} onToggle={marcar} onBorrar={borrar} onLoPagaYo={toggleLoPagaYo} />
              ))}
            </div>
          )}
          {comprados.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">Comprados ({comprados.length})</h3>
              <div className="card divide-y divide-edge overflow-hidden opacity-70">
                {comprados.map((i) => (
                  <Row key={i.id} item={i} onToggle={marcar} onBorrar={borrar} onLoPagaYo={toggleLoPagaYo} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {modal && <ModalNuevoItem semana={semana} onCerrar={() => setModal(false)} onCrear={() => { setModal(false); cargar(semana); }} />}
    </div>
  );
}

function Row({ item, onToggle, onBorrar, onLoPagaYo }: { item: ListaItem; onToggle: (i: ListaItem, c: boolean) => void; onBorrar: (id: number) => void; onLoPagaYo: (i: ListaItem) => void }) {
  const iniciales = item.usuario?.nombre?.slice(0, 2).toUpperCase() || '??';
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <input
        type="checkbox"
        checked={item.checked}
        onChange={(e) => onToggle(item, e.target.checked)}
        className="h-5 w-5 shrink-0 cursor-pointer accent-orange-500"
      />
      <span className={`flex-1 text-sm ${item.checked ? 'line-through text-slate-500' : 'text-slate-100'}`}>{item.producto}</span>
      {item.cantidad && <span className="badge bg-slate-500/15 text-slate-300">{item.cantidad}</span>}
      {item.usuario && (
        <span className="badge bg-slate-500/15 text-slate-300" title={`Anadido por ${item.usuario.nombre}`}>{iniciales}</span>
      )}
      {item.origen === 'MENU' && <span className="badge bg-accent-500/15 text-accent-500">menu</span>}
      <button
        className={`btn-ghost !p-1.5 transition ${item.loPagaYo === true ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`}
        title={item.loPagaYo === true ? 'Lo pago yo (pulsa para quitar)' : 'Marcar como "lo pago yo"'}
        onClick={() => onLoPagaYo(item)}
      >
        <Wallet className="h-4 w-4" />
      </button>
      <button className="btn-ghost !p-1.5 hover:!bg-red-500/15 hover:!text-red-400" onClick={() => onBorrar(item.id)}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function ModalNuevoItem({ semana, onCerrar, onCrear }: { semana: string; onCerrar: () => void; onCrear: () => void }) {
  const { notificar } = useToast();
  const [producto, setProducto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [loPagaYo, setLoPagaYo] = useState<boolean | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!producto.trim()) return setError('El producto es obligatorio');
    setEnviando(true);
    try {
      await listaAPI.add(producto.trim(), cantidad.trim() || undefined, semana, loPagaYo);
      notificar('Producto anadido');
      onCrear();
    } catch (err) {
      setError(await errMsg(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Anadir a la lista" ancho="sm">
      <form onSubmit={crear} className="space-y-4">
        <Campo label="Producto">
          <input className="input w-full" value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Ej. leche" autoFocus />
        </Campo>
        <Campo label="Cantidad (opcional)">
          <input className="input w-full" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="Ej. 1 L, 2 uds" />
        </Campo>
        <div className="flex items-center gap-2">
          <button type="button" className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${loPagaYo === true ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400' : 'border-edge text-slate-400 hover:border-emerald-500/50'}`} onClick={() => setLoPagaYo(loPagaYo === true ? null : true)}>
            <Wallet className="h-4 w-4" /> Lo pago yo
          </button>
          {loPagaYo === true && <span className="text-xs text-emerald-400">Indicareis que lo pagais vos</span>}
        </div>
        <p className="text-xs text-slate-500">Semana del {nombreDia(semana)}, {formatearFechaLarga(semana)}</p>
        {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onCerrar}>Cancelar</button>
          <button className="btn-primary" disabled={enviando}>{enviando ? 'Anadiendo...' : 'Anadir'}</button>
        </div>
      </form>
    </Modal>
  );
}
