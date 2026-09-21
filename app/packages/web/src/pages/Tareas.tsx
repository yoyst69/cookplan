import React, { useCallback, useEffect, useState } from 'react';
import { ListChecks, Sparkles, Plus, Trash2, ChevronLeft, ChevronRight, ArrowLeftRight, UserPlus } from 'lucide-react';
import { tareasAPI, errMsg, RepartoTareas, AsignacionTarea, TareaCatalogo } from '../lib/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Spinner, EmptyState, Campo, Esfuerzo } from '../components/ui';
import { mondayOf, isoToday, addDaysIso, formatearFechaLarga, nombreDia, parseIso } from '../lib/fechas';

type Dia = 'SABADO' | 'DOMINGO';

export default function Tareas() {
  const { notificar } = useToast();
  const [semana, setSemana] = useState<string>(mondayOf(isoToday()));
  const [reparto, setReparto] = useState<RepartoTareas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [modalCatalogo, setModalCatalogo] = useState(false);
  const [distribuyendo, setDistribuyendo] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverPersona, setDragOverPersona] = useState<number | null>(null);

  const cargar = useCallback(async (s: string) => {
    setCargando(true);
    try {
      const r = await tareasAPI.get(s);
      setReparto(r.data);
    } catch (e) {
      notificar(await errMsg(e), 'error');
    } finally {
      setCargando(false);
    }
  }, [notificar]);

  useEffect(() => {
    cargar(semana);
  }, [semana, cargar]);

  const generar = async () => {
    setGenerando(true);
    try {
      const r = await tareasAPI.generar(semana);
      setReparto(r.data);
      notificar('Reparto generado y equilibrado');
    } catch (e) {
      notificar(await errMsg(e), 'error');
    } finally {
      setGenerando(false);
    }
  };

  const toggleCheck = async (a: AsignacionTarea) => {
    setReparto((p) => p && { ...p, asignaciones: p.asignaciones.map((x) => (x.id === a.id ? { ...x, checked: !x.checked } : x)) });
    try {
      await tareasAPI.patchAsignacion(a.id, { checked: !a.checked });
    } catch (e) {
      notificar(await errMsg(e), 'error');
      cargar(semana);
    }
  };

  const cambiarDia = async (a: AsignacionTarea) => {
    const nuevo: Dia = a.dia === 'SABADO' ? 'DOMINGO' : 'SABADO';
    try {
      await tareasAPI.patchAsignacion(a.id, { dia: nuevo });
      setReparto((p) => p && { ...p, asignaciones: p.asignaciones.map((x) => (x.id === a.id ? { ...x, dia: nuevo } : x)) });
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  const borrar = async (id: number) => {
    if (!window.confirm('¿Quitar esta tarea del plan?')) return;
    try {
      await tareasAPI.delAsignacion(id);
      setReparto((p) => p && { ...p, asignaciones: p.asignaciones.filter((x) => x.id !== id) });
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  const borrarTodas = async () => {
    if (!window.confirm('¿Borrar todas las tareas asignadas este finde?')) return;
    try {
      const r = await tareasAPI.delTodas(semana);
      setReparto((p) => p && { ...p, asignaciones: [] });
      notificar(`Eliminadas ${r.data.borradas} tareas del finde`);
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  const distribuir = async () => {
    setDistribuyendo(true);
    try {
      const r = await tareasAPI.distribuir(semana);
      setReparto(r.data.semana);
      notificar(r.data.mensaje || 'Tareas distribuidas entre sabado y domingo');
    } catch (e) {
      notificar(await errMsg(e), 'error');
    } finally {
      setDistribuyendo(false);
    }
  };

  const onDragStart = (id: number) => setDragId(id);
  const onDragEnd = () => { setDragId(null); setDragOverPersona(null); };
  const onDragOverPersona = (e: React.DragEvent, personaId: number) => {
    e.preventDefault();
    setDragOverPersona(personaId);
  };
  const onDropPersona = async (personaId: number, dia: Dia) => {
    if (dragId == null) return;
    setDragId(null);
    setDragOverPersona(null);
    try {
      await tareasAPI.patchAsignacion(dragId, { usuarioId: personaId, dia });
      setReparto((p) => p && {
        ...p,
        asignaciones: p.asignaciones.map((a) =>
          a.id === dragId ? { ...a, usuarioId: personaId, persona: p.personas.find((x) => x.id === personaId)?.nombre || null, dia } : a
        ),
      });
      notificar('Tarea asignada por arrastre');
    } catch (e) {
      notificar(await errMsg(e), 'error');
      cargar(semana);
    }
  };

  const hayReparto = (reparto?.asignaciones.length || 0) > 0;
  const totales = reparto?.asignaciones.reduce((acc, a) => {
    acc.total += a.peso;
    if (a.checked) acc.hecho += a.peso;
    return acc;
  }, { total: 0, hecho: 0 }) || { total: 0, hecho: 0 };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto flex items-center gap-2 text-2xl font-extrabold text-slate-100">
          <ListChecks className="h-6 w-6 text-accent-500" /> Tareas domésticas
        </h1>
        <div className="flex items-center gap-1 rounded-xl border border-edge bg-panel p-1">
          <button className="btn-ghost" onClick={() => setSemana((s) => addDaysIso(s, -7))}><ChevronLeft className="h-4 w-4" /></button>
          <button className="px-2 text-sm font-semibold text-slate-200" onClick={() => setSemana(mondayOf(isoToday()))}>{formatearFechaLarga(semana)}</button>
          <button className="btn-ghost" onClick={() => setSemana((s) => addDaysIso(s, 7))}><ChevronRight className="h-4 w-4" /></button>
        </div>
        <button className="btn-outline" onClick={() => setModalCatalogo(true)}><Plus className="h-4 w-4" /> Catálogo</button>
        <button className="btn-outline" onClick={() => setModalAsignar(true)}><UserPlus className="h-4 w-4" /> Asignar tarea</button>
        <button className="btn-outline" onClick={borrarTodas}><Trash2 className="h-4 w-4" /> Borrar todas del finde</button>
        <button className="btn-outline" onClick={distribuir} disabled={distribuyendo}><ListChecks className="h-4 w-4" /> {distribuyendo ? 'Distribuyendo...' : 'Distribuir sin asignar'}</button>
        <button className="btn-primary" onClick={generar} disabled={generando}>
          <Sparkles className="h-4 w-4" /> {generando ? 'Repartiendo...' : 'Generar reparto'}
        </button>
      </div>

      <p className="text-sm text-slate-400">
        El reparto equilibra las tareas activas entre <b className="text-slate-200">Fiti, Mar y Jose</b> durante el
        <b className="text-slate-200"> {nombreDia(reparto?.sabado || semana)} {formatearFechaLarga(reparto?.sabado || semana)}</b> y el
        <b className="text-slate-200"> {nombreDia(reparto?.domingo || semana)} {formatearFechaLarga(reparto?.domingo || semana)}</b>.
      </p>

      {cargando ? (
        <Spinner texto="Cargando reparto..." />
      ) : !hayReparto ? (
        <EmptyState icon={ListChecks} texto="Todavía no hay reparto. Pulsa «Generar reparto» para repartir las tareas del catálogo entre Fiti, Mar y Jose." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="rounded-xl border border-edge bg-panel px-3 py-2">
              {totales.total} tareas · {totales.hecho} hechas ({Math.round((totales.hecho / totales.total) * 100)}%)
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-accent-500 transition-all duration-500"
                style={{ width: `${(totales.hecho / totales.total) * 100}%` }}
              />
            </div>
            <button className="btn-primary btn-sm" onClick={() => setModalAsignar(true)}><UserPlus className="h-4 w-4" /> Asignar tarea</button>
          </div>

          {(() => {
            const sinAsignar: Record<string, AsignacionTarea[]> = {};
            if (reparto) {
              for (const a of reparto.asignaciones) {
                if (a.usuarioId === null) {
                  (sinAsignar[a.dia] ??= []).push(a);
                }
              }
            }
            return (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(['SABADO', 'DOMINGO'] as Dia[]).map((dia) => (
              <section key={dia} className="card p-4">
                <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-100">
                  <span className={`h-2.5 w-2.5 rounded-full ${dia === 'SABADO' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                  {dia === 'SABADO' ? 'Sábado' : 'Domingo'} · {formatearFechaLarga(dia === 'SABADO' ? reparto?.sabado || semana : reparto?.domingo || semana)}
                </h2>
                <div className="space-y-3">
                  {reparto?.personas.map((persona) => {
                    const dePersona = reparto.asignaciones.filter((a) => a.usuarioId === persona.id && a.dia === dia).sort((a, b) => a.orden - b.orden);
                    const esfuerzo = dePersona.reduce((n, a) => n + a.peso, 0);
                    const iniciales = persona.nombre.slice(0, 2).toUpperCase();
                    return (
                      <div key={`${dia}-${persona.id}`} className={`rounded-xl border bg-panel-2 p-3 transition-colors ${dragOverPersona === persona.id ? 'border-accent-500 bg-accent-500/10' : 'border-edge'}`}
                    onDragOver={(e) => onDragOverPersona(e, persona.id)}
                    onDragLeave={() => setDragOverPersona(null)}
                    onDrop={() => onDropPersona(persona.id, dia)}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-500/15 text-xs font-extrabold text-accent-500">{iniciales}</span>
                          <span className="text-sm font-bold text-slate-100">{persona.nombre}</span>
                          <span className="ml-auto text-xs text-slate-500">{dePersona.length} tareas · esfuerzo {esfuerzo}</span>
                        </div>
                        {dePersona.length === 0 ? (
                          <p className="py-1 text-xs italic text-slate-500">Sin tareas asignadas</p>
                        ) : (
                          <ul className="space-y-1">
                            {dePersona.map((a) => (
                              <li key={a.id} className="group flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={a.checked} onChange={() => toggleCheck(a)} className="h-4 w-4 shrink-0 cursor-pointer accent-orange-500" />
                                <span className={`flex-1 ${a.checked ? 'line-through text-slate-500' : 'text-slate-200'}`}>{a.tarea}</span>
                                <span className="hidden text-[10px] text-slate-500 sm:inline"><Esfuerzo peso={a.peso} /></span>
                                <button className="btn-ghost !p-1 opacity-0 transition group-hover:opacity-100" title="Cambiar de día" onClick={() => cambiarDia(a)}>
                                  <ArrowLeftRight className="h-3.5 w-3.5" />
                                </button>
                                <button className="btn-ghost !p-1 opacity-0 transition hover:!bg-red-500/15 hover:!text-red-400 group-hover:opacity-100" title="Quitar" onClick={() => borrar(a.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                  {sinAsignar[dia]?.length > 0 && (
                    <div className="rounded-xl border border-dashed border-slate-600 bg-panel-2/50 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-600/30 text-xs font-extrabold text-slate-400">??</span>
                        <span className="text-sm font-bold text-slate-300">Sin asignar</span>
                        <span className="ml-auto text-xs text-slate-500">{sinAsignar[dia].length} tareas · elige cual hacer</span>
                      </div>
                      <ul className="space-y-1">
                        {sinAsignar[dia].sort((a, b) => a.orden - b.orden).map((a) => (
                          <li key={a.id} draggable onDragStart={() => onDragStart(a.id)} onDragEnd={onDragEnd} className={`group flex items-center gap-2 rounded-lg p-1 text-sm cursor-grab transition-opacity ${dragId === a.id ? 'opacity-40' : 'hover:bg-slate-700/30'}`}>
                            <input type="checkbox" checked={a.checked} onChange={() => toggleCheck(a)} className="h-4 w-4 shrink-0 cursor-pointer accent-orange-500" />
                            <span className={`flex-1 ${a.checked ? 'line-through text-slate-500' : 'text-slate-200'}`}>{a.tarea}</span>
                            <span className="hidden text-[10px] text-slate-500 sm:inline"><Esfuerzo peso={a.peso} /></span>
                            <button className="btn-ghost !p-1 opacity-0 transition group-hover:opacity-100" title="Cambiar de día" onClick={() => cambiarDia(a)}>
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                            </button>
                            <button className="btn-ghost !p-1 opacity-0 transition hover:!bg-red-500/15 hover:!text-red-400 group-hover:opacity-100" title="Quitar" onClick={() => borrar(a.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
          );
          })()}
        </>
      )}

      {modalAsignar && reparto && (
        <ModalAsignar
          reparto={reparto}
          onCerrar={() => setModalAsignar(false)}
          onGuardado={() => { setModalAsignar(false); cargar(semana); }}
        />
      )}
      {modalCatalogo && reparto && (
        <ModalCatalogo
          reparto={reparto}
          onCerrar={() => setModalCatalogo(false)}
          onCambio={() => cargar(semana)}
        />
      )}
    </div>
  );
}

function ModalAsignar({ reparto, onCerrar, onGuardado }: { reparto: RepartoTareas; onCerrar: () => void; onGuardado: () => void }) {
  const { notificar } = useToast();
  const [usuarioId, setUsuarioId] = useState<number>(reparto.personas[0]?.id || 0);
  const [dia, setDia] = useState<Dia>('SABADO');
  const [tareaId, setTareaId] = useState<number>(reparto.catalogo.find((t) => t.activa)?.id || 0);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const asignar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!usuarioId || !tareaId) return setError('Elige persona y tarea');
    setEnviando(true);
    try {
      await tareasAPI.addAsignacion({ semana: reparto.semana, usuarioId, tareaId, dia });
      notificar('Tarea asignada');
      onGuardado();
    } catch (err) {
      setError(await errMsg(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Asignar tarea a mano" ancho="sm">
      <form onSubmit={asignar} className="space-y-4">
        <Campo label="Persona">
          <select className="input w-full" value={usuarioId} onChange={(e) => setUsuarioId(Number(e.target.value))}>
            {reparto.personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Campo>
        <Campo label="Tarea">
          <select className="input w-full" value={tareaId} onChange={(e) => setTareaId(Number(e.target.value))}>
            {reparto.catalogo.filter((t) => t.activa).map((t) => <option key={t.id} value={t.id}>{t.nombre} (esfuerzo {t.peso})</option>)}
          </select>
        </Campo>
        <Campo label="Día">
          <select className="input w-full" value={dia} onChange={(e) => setDia(e.target.value as Dia)}>
            <option value="SABADO">Sábado {reparto.sabado.split('-').slice(1).join('/')}</option>
            <option value="DOMINGO">Domingo {reparto.domingo.split('-').slice(1).join('/')}</option>
          </select>
        </Campo>
        {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onCerrar}>Cancelar</button>
          <button className="btn-primary" disabled={enviando}>{enviando ? 'Asignando...' : 'Asignar'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ModalCatalogo({ reparto, onCerrar, onCambio }: { reparto: RepartoTareas; onCerrar: () => void; onCambio: () => void }) {
  const { notificar } = useToast();
  const [nombre, setNombre] = useState('');
  const [peso, setPeso] = useState(1);
  const [error, setError] = useState('');

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) return setError('El nombre es obligatorio');
    try {
      await tareasAPI.addCatalogo(nombre.trim(), peso);
      notificar('Tarea añadida al catálogo');
      setNombre('');
      setPeso(1);
      onCambio();
    } catch (err) {
      setError(await errMsg(err));
    }
  };

  const toggleActiva = async (t: TareaCatalogo) => {
    try {
      await tareasAPI.patchCatalogo(t.id, { activa: !t.activa });
      notificar(t.activa ? 'Tarea desactivada del reparto' : 'Tarea activada');
      onCambio();
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  const borrar = async (t: TareaCatalogo) => {
    if (!window.confirm(`¿Eliminar la tarea "${t.nombre}" del catálogo?`)) return;
    try {
      await tareasAPI.delCatalogo(t.id);
      notificar('Tarea eliminada');
      onCambio();
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Catálogo de tareas domésticas" ancho="lg">
      <div className="space-y-4">
        <form onSubmit={crear} className="space-y-3 rounded-xl border border-edge bg-panel-2 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <Campo label="Nueva tarea">
                <input className="input w-full" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Limpiar el horno" />
              </Campo>
            </div>
            <div>
              <Campo label="Esfuerzo">
                <select className="input" value={peso} onChange={(e) => setPeso(Number(e.target.value))}>
                  <option value={1}>Bajo</option>
                  <option value={2}>Medio</option>
                  <option value={3}>Alto</option>
                </select>
              </Campo>
            </div>
            <button className="btn-primary" disabled={!nombre.trim()}><Plus className="h-4 w-4" /> Añadir</button>
          </div>
          {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">{error}</p>}
        </form>

        <div className="max-h-96 divide-y divide-edge overflow-y-auto rounded-xl border border-edge">
          {reparto.catalogo.map((t) => (
            <div key={t.id} className={`flex items-center gap-3 px-4 py-2.5 ${t.activa ? '' : 'opacity-50'}`}>
              <input type="checkbox" checked={t.activa} onChange={() => toggleActiva(t)} className="h-4 w-4 cursor-pointer accent-orange-500" title="Incluir en el reparto" />
              <span className="flex-1 text-sm text-slate-200">{t.nombre}</span>
              <Esfuerzo peso={t.peso} />
              <button className="btn-ghost !p-1.5 hover:!bg-red-500/15 hover:!text-red-400" onClick={() => borrar(t)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500">Cualquier usuario puede añadir tareas. Al generar el reparto solo se usan las tareas activas ({reparto.catalogo.filter((t) => t.activa).length}).</p>

        <div className="flex justify-end">
          <button className="btn-outline" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </Modal>
  );
}