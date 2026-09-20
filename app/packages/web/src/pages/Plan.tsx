import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, CalendarDays, Trash2, Clock, Search } from 'lucide-react';
import { planAPI, recetasAPI, errMsg, PlanSemana, Sugerencia, RecetaMini } from '../lib/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Spinner, MomentoBadge } from '../components/ui';
import { mondayOf, isoToday, addDaysIso, formatearFechaLarga } from '../lib/fechas';

type Slot = 'comida' | 'cena';

export default function Plan() {
  const { notificar } = useToast();
  const [semana, setSemana] = useState<string>(mondayOf(isoToday()));
  const [plan, setPlan] = useState<PlanSemana | null>(null);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [picker, setPicker] = useState<null | { dia: number; slot: Slot }>(null);

  const cargar = useCallback(async (s: string) => {
    setCargando(true);
    try {
      const r = await planAPI.get(s);
      setPlan(r.data);
    } catch (e) {
      notificar(await errMsg(e), 'error');
    } finally {
      setCargando(false);
    }
  }, [notificar]);

  useEffect(() => {
    cargar(semana);
  }, [semana, cargar]);

  const anterior = () => setSemana((s) => addDaysIso(s, -7));
  const siguiente = () => setSemana((s) => addDaysIso(s, 7));
  const hoy = () => setSemana(mondayOf(isoToday()));

  const generar = async () => {
    setGenerando(true);
    try {
      const r = await planAPI.generar(semana);
      setPlan(r.data.semana);
      notificar(r.data.mensaje || 'Plan generado');
    } catch (e) {
      notificar(await errMsg(e), 'error');
    } finally {
      setGenerando(false);
    }
  };

  const guardarSlot = async (dia: number, datos: { comidaId: number | null; cenaId: number | null }) => {
    try {
      const r = await planAPI.guardar(semana, [{ dia, comidaId: datos.comidaId, cenaId: datos.cenaId, generado: false }]);
      setPlan(r.data);
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  const elegir = async (recetaId: number | null) => {
    if (!picker || !plan) return;
    const dia = plan.dias[picker.dia];
    const act = { comidaId: picker.slot === 'comida' ? recetaId : dia.comida?.id ?? null, cenaId: picker.slot === 'cena' ? recetaId : dia.cena?.id ?? null };
    await guardarSlot(picker.dia, act);
    setPicker(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto flex items-center gap-2 text-2xl font-extrabold text-slate-100">
          <CalendarDays className="h-6 w-6 text-accent-500" /> Plan semanal
        </h1>
        <div className="flex items-center gap-1 rounded-xl border border-edge bg-panel p-1">
          <button className="btn-ghost" onClick={anterior}><ChevronLeft className="h-4 w-4" /></button>
          <button className="px-2 text-sm font-semibold text-slate-200" onClick={hoy}>{formatearFechaLarga(semana)}</button>
          <button className="btn-ghost" onClick={siguiente}><ChevronRight className="h-4 w-4" /></button>
        </div>
        <button className="btn-primary" onClick={generar} disabled={generando}>
          <Sparkles className="h-4 w-4" /> {generando ? 'Generando...' : 'Generar semana'}
        </button>
      </div>

      <p className="text-sm text-slate-400">
        El generador rellena <b className="text-slate-200">los 7 días</b> evitando repetir platos recientes. Pulsa en una casilla para cambiar la comida o cena a mano.
      </p>

      {cargando ? (
        <Spinner texto="Cargando plan..." />
      ) : (
        <div className="card overflow-x-auto">
          <div className="min-w-[1000px] grid grid-cols-[72px_repeat(7,1fr)]">
            <div className="sticky left-0 z-10 bg-panel" />
            {plan?.dias.map((d, i) => (
              <div key={d.fecha} className={`border-l border-t-2 border-edge pb-2 pt-1.5 text-center ${formatearFechaLarga(d.fecha) === formatearFechaLarga(isoToday()) ? 'border-t-accent-500' : ''}`}>
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-300">{d.nombre}</div>
                <div className="text-[11px] text-slate-500">{d.fecha.split('-').slice(1).join('/')}</div>
              </div>
            ))}

            {(['comida', 'cena'] as Slot[]).map((slot) => (
              <React.Fragment key={slot}>
                <div className="sticky left-0 z-10 flex items-center bg-panel px-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  {slot === 'comida' ? 'Comida' : 'Cena'}
                </div>
                {plan?.dias.map((d, i) => {
                  const r = slot === 'comida' ? d.comida : d.cena;
                  return (
                    <button
                      key={d.fecha}
                      onClick={() => setPicker({ dia: i, slot })}
                      className={`flex min-h-20 flex-col items-start gap-1 border-l border-edge p-1.5 text-left transition hover:bg-panel-3 ${r ? '' : 'bg-panel-2/40'}`}
                    >
                      {r ? <SlotChip r={r} /> : <span className="text-xs italic text-slate-500">vacío</span>}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {picker && plan && (
        <PickerReceta
          semana={semana}
          dia={picker.dia}
          slot={picker.slot}
          actual={(picker.slot === 'comida' ? plan.dias[picker.dia].comida : plan.dias[picker.dia].cena) || null}
          onCerrar={() => setPicker(null)}
          onElegir={elegir}
          onVaciar={() => elegir(null)}
        />
      )}
    </div>
  );
}

function SlotChip({ r }: { r: RecetaMini }) {
  return (
    <div className="w-full">
      {r.foto && <img src={r.foto} alt="" className="mb-1 h-14 w-full rounded-lg object-cover" loading="lazy" />}
      <div className="text-[13px] font-semibold leading-tight text-slate-100">{r.titulo}</div>
      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
        {r.tiempo && <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />{r.tiempo}′</span>}
      </div>
    </div>
  );
}

function PickerReceta({
  semana,
  dia,
  slot,
  actual,
  onCerrar,
  onElegir,
  onVaciar,
}: {
  semana: string;
  dia: number;
  slot: Slot;
  actual: RecetaMini | null;
  onCerrar: () => void;
  onElegir: (id: number) => void;
  onVaciar: () => void;
}) {
  const { notificar } = useToast();
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [todas, setTodas] = useState<RecetaMini[]>([]);
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(true);
  const diaNombre = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][dia];

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const [sug, recs] = await Promise.all([
          planAPI.sugerencias(semana, dia, slot === 'comida' ? 'COMIDA' : 'CENA', actual?.id),
          recetasAPI.list({}),
        ]);
        setSugerencias(sug.data.sugerencias);
        setTodas(recs.data.recetas.map((r) => ({ id: r.id, titulo: r.titulo, momento: r.momento, foto: r.foto, tiempo: r.tiempo, personas: r.personas })));
      } catch (e) {
        notificar(await errMsg(e), 'error');
      } finally {
        setCargando(false);
      }
    })();
  }, [semana, dia, slot, actual?.id, notificar]);

  const texto = q.trim().toLowerCase();
  const coinciden: RecetaMini[] = todas.filter((r) => !texto || r.titulo.toLowerCase().includes(texto));
  const sugerenciasFiltradas: Sugerencia[] = sugerencias.filter((r) => !texto || r.titulo.toLowerCase().includes(texto));

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Elegir ${slot === 'comida' ? 'comida' : 'cena'} del ${diaNombre}`} ancho="xl">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input className="input w-full pl-9" placeholder="Buscar receta..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {cargando ? (
          <Spinner texto="Buscando sugerencias..." />
        ) : (
          <>
            {sugerenciasFiltradas.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  <Sparkles className="h-3.5 w-3.5 text-accent-500" /> Sugerencias (las que hace más que no se preparan)
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {sugerenciasFiltradas.map((r) => (
                    <button key={r.id} onClick={() => onElegir(r.id)} className="card flex items-center gap-3 p-2.5 text-left transition hover:border-accent-500">
                      {r.foto ? <img src={r.foto} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-panel-3" />}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100">{r.titulo}</div>
                        <div className="text-[11px] text-slate-400">{r.diasSinUsar >= 999 ? 'nueva' : `sin preparar hace ${r.diasSinUsar} días`}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Todas las recetas</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {coinciden.map((r) => (
                  <button key={r.id} onClick={() => onElegir(r.id)} className={`card flex items-center gap-3 p-2.5 text-left transition hover:border-accent-500 ${actual?.id === r.id ? 'border-accent-500' : ''}`}>
                    {r.foto ? <img src={r.foto} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-panel-3" />}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-100">{r.titulo}</div>
                      <MomentoBadge momento={r.momento} />
                    </div>
                  </button>
                ))}
                {coinciden.length === 0 && <p className="col-span-full py-4 text-center text-sm text-slate-500">Sin resultados</p>}
              </div>
            </div>
          </>
        )}

        {actual && (
          <div className="flex items-center justify-between border-t border-edge pt-4">
            <span className="text-xs text-slate-500">Asignado ahora: <b className="text-slate-300">{actual.titulo}</b></span>
            <button className="btn-danger-soft btn-sm" onClick={onVaciar}><Trash2 className="h-4 w-4" /> Vaciar</button>
          </div>
        )}
      </div>
    </Modal>
  );
}