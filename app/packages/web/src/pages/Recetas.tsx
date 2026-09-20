import React, { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Eye, Clock, Users, ImagePlus, X, UtensilsCrossed, Utensils, FileText } from 'lucide-react';
import { recetasAPI, errMsg, Receta, MomentoDia } from '../lib/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Campo, Spinner, EmptyState, MomentoBadge, MOMENTO_LABEL } from '../components/ui';

const MOMENTOS: MomentoDia[] = ['COMIDA', 'CENA', 'AMBAS', 'POSTRE'];

interface FormReceta {
  titulo: string;
  momento: MomentoDia;
  descripcion: string;
  tiempo: string;
  personas: string;
  ingredientes: string;
  pasos: string;
}

const vacio: FormReceta = { titulo: '', momento: 'AMBAS', descripcion: '', tiempo: '', personas: '', ingredientes: '', pasos: '' };

export default function Recetas() {
  const { notificar } = useToast();
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState('');
  const [momento, setMomento] = useState('');
  const [buscando, setBuscando] = useState('');
  const [filtroMomento, setFiltroMomento] = useState('');

  const [modal, setModal] = useState<null | { tipo: 'crear' } | { tipo: 'editar'; receta: Receta }>(null);
  const [viendo, setViendo] = useState<Receta | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await recetasAPI.list({ q: buscando || undefined, momento: (filtroMomento as MomentoDia) || undefined });
      setRecetas(r.data.recetas);
    } catch (e) {
      notificar(await errMsg(e), 'error');
    } finally {
      setCargando(false);
    }
  }, [buscando, filtroMomento, notificar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => setBuscando(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const pdf = () => {
    const lista = [...recetas].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { numeric: true }));
    const w = window.open('', '_blank', 'width=900,height=650');
    if (!w) return;
    const limpiar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" /><title>CookPlan · Recetas (A–Z)</title>
    <style>
      body{font-family:Georgia,'Times New Roman',serif;color:#1e293b;margin:2cm;line-height:1.45}
      h1{font-size:24pt;border-bottom:3px double #f97316;padding-bottom:6px;margin-bottom:18px}
      h2{font-size:13pt;color:#9a3412;margin:14px 0 2px;page-break-inside:avoid}
      p{font-size:10pt;margin:2px 0}
      .meta{color:#64748b;font-size:9pt;font-style:italic}
      ol,ul{margin:2px 0 6px;padding-left:20px}
      li{font-size:10pt}
      @media print{body{margin:0}}
      /* cada página = exactamente 2 recetas, y el par queda CENTRADO (vertical y horizontal) en su A4 */
      .par{break-after:page;page-break-after:always;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:100vh;padding:1.2cm 2cm;box-sizing:border-box}
      .par:last-of-type{break-after:auto;page-break-after:auto}
      h2,ol,ul,p{margin-bottom:4px}
      ol,ul{break-inside:avoid;page-break-inside:avoid;width:fit-content;text-align:left;padding-left:22px}
    </style></head><body>
    <h1 style="text-align:center">Recetas de cocina</h1>
    ${lista.reduce<string[]>((grupos, r, i) => {
      const ficha = `\n<h2>${limpiar(r.titulo)}</h2>
        <p class="meta">${limpiar(r.momento)}${r.tiempo ? ` · ${r.tiempo} min` : ''}${r.personas ? ` · ${r.personas} pers.` : ''}</p>
        ${r.descripcion ? `<p>${limpiar(r.descripcion)}</p>` : ''}
        ${r.ingredientes?.length ? `<p><b>Ingredientes:</b> ${r.ingredientes.map(limpiar).join(', ')}</p>` : ''}
        ${r.pasos?.length ? `<ol>${r.pasos.map((p) => `<li>${limpiar(p)}</li>`).join('')}</ol>` : ''}`;
      grupos[i >> 1] = (grupos[i >> 1] || '') + ficha;
      return grupos;
    }, []).map((grupo, i) => `<div class="par">${grupo}</div>`).join('')}
    </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const borrar = async (r: Receta) => {
    if (!window.confirm(`¿Eliminar la receta "${r.titulo}"?`)) return;
    try {
      await recetasAPI.borrar(r.id);
      notificar('Receta eliminada');
      cargar();
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-extrabold text-slate-100">Recetas</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" value={filtroMomento} onChange={(e) => setFiltroMomento(e.target.value)}>
          <option value="">Todas</option>
          {MOMENTOS.map((m) => <option key={m} value={m}>{MOMENTO_LABEL[m]}</option>)}
        </select>
        <button className="btn-primary" onClick={() => setModal({ tipo: 'crear' })}>
          <Plus className="h-4 w-4" /> Nueva receta
        </button>
        <button className="btn-outline" onClick={pdf} title="Todas las recetas ordenadas alfabéticamente">
          <FileText className="h-4 w-4" /> PDF
        </button>
      </div>

      {cargando ? (
        <Spinner texto="Cargando recetas..." />
      ) : recetas.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} texto="No hay recetas. Crea la primera o añade las del libro de casa." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">
              📖 <b className="text-slate-100">{recetas.length}</b> recetas
            </span>
            <span className="chip">
              🖼️ <b className="text-slate-100">{recetas.filter((r) => r.foto).length}</b> con foto
            </span>
            <span className="chip">
              ⏱️ media <b className="text-slate-100">{Math.round(recetas.filter((r) => r.tiempo).reduce((n, r) => n + (r.tiempo || 0), 0) / Math.max(1, recetas.filter((r) => r.tiempo).length))}</b> min
            </span>
            <span className="ml-auto hidden text-xs text-slate-500 sm:inline">{recetas.filter((r) => r.momento === 'COMIDA' || r.momento === 'AMBAS').length} comidas · {recetas.filter((r) => r.momento === 'CENA' || r.momento === 'AMBAS').length} cenas</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recetas.map((r) => (
              <article key={r.id} className="card card-hover group flex flex-col overflow-hidden">
                <div className="relative h-40 cursor-pointer overflow-hidden bg-panel-2" onClick={() => setViendo(r)}>
                  {r.foto ? (
                    <img src={r.foto} alt={r.titulo} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-600">
                      <Utensils className="h-10 w-10 opacity-40" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                  <div className="absolute right-2 top-2"><MomentoBadge momento={r.momento} /></div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="cursor-pointer font-bold text-slate-100 hover:text-accent-400" onClick={() => setViendo(r)}>{r.titulo}</h3>
                  {r.descripcion && <p className="line-clamp-2 text-sm text-slate-400">{r.descripcion}</p>}
                  <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-slate-400">
                    {r.tiempo && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.tiempo} min</span>}
                    {r.personas && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {r.personas} pers.</span>}
                  </div>
                  <div className="divider my-1" />
                  <div className="flex items-center gap-1 pt-1">
                    <button className="btn-ghost" onClick={() => setViendo(r)}><Eye className="h-4 w-4" /> Ver</button>
                    <button className="btn-ghost" onClick={() => setModal({ tipo: 'editar', receta: r })}><Pencil className="h-4 w-4" /> Editar</button>
                    <button className="btn-ghost hover:!bg-red-500/15 hover:!text-red-400" onClick={() => borrar(r)}><Trash2 className="h-4 w-4" /> Borrar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {modal && (
        <FormReceta
          receta={modal.tipo === 'editar' ? modal.receta : null}
          onCerrar={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar(); }}
        />
      )}

      {viendo && <VerReceta receta={viendo} onCerrar={() => setViendo(null)} onEditar={() => { setModal({ tipo: 'editar', receta: viendo }); setViendo(null); }} />}
    </div>
  );
}

function FormReceta({ receta, onCerrar, onGuardado }: { receta: Receta | null; onCerrar: () => void; onGuardado: () => void }) {
  const { notificar } = useToast();
  const [form, setForm] = useState<FormReceta>(
    receta
      ? {
          titulo: receta.titulo,
          momento: receta.momento,
          descripcion: receta.descripcion || '',
          tiempo: receta.tiempo ? String(receta.tiempo) : '',
          personas: receta.personas ? String(receta.personas) : '',
          ingredientes: (receta.ingredientes || []).join('\n'),
          pasos: (receta.pasos || []).join('\n'),
        }
      : vacio
  );
  const [foto, setFoto] = useState<string | null>(receta?.foto || null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof FormReceta) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.titulo.trim()) return setError('El título es obligatorio');
    setEnviando(true);
    try {
      const data = {
        titulo: form.titulo.trim(),
        momento: form.momento,
        descripcion: form.descripcion.trim() || undefined,
        tiempo: form.tiempo ? Number(form.tiempo) : undefined,
        personas: form.personas ? Number(form.personas) : undefined,
        ingredientes: form.ingredientes.split('\n').map((s) => s.trim()).filter(Boolean),
        pasos: form.pasos.split('\n').map((s) => s.trim()).filter(Boolean),
      };
      let guardada = receta;
      if (receta) {
        const r = await recetasAPI.actualizar(receta.id, data);
        guardada = r.data.receta;
      } else {
        const r = await recetasAPI.crear({ ...data, titulo: data.titulo });
        guardada = r.data.receta;
      }
      if (archivo && guardada) {
        const r = await recetasAPI.subirFoto(guardada.id, archivo);
        setFoto(r.data.foto);
      }
      notificar(receta ? 'Receta actualizada' : 'Receta creada');
      onGuardado();
    } catch (err) {
      setError(await errMsg(err));
    } finally {
      setEnviando(false);
    }
  };

  const quitarFoto = async () => {
    if (!receta) return;
    try {
      await recetasAPI.quitarFoto(receta.id);
      setFoto(null);
      setArchivo(null);
    } catch (e) {
      notificar(await errMsg(e), 'error');
    }
  };

  return (
    <Modal abierto onCerrar={onCerrar} titulo={receta ? `Editar: ${receta.titulo}` : 'Nueva receta'} ancho="full">
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <Campo label="Título">
              <input className="input w-full" value={form.titulo} onChange={set('titulo')} placeholder="Nombre de la receta" />
            </Campo>
            <div className="grid grid-cols-3 gap-3">
              <Campo label="Momento">
                <select className="input w-full" value={form.momento} onChange={set('momento')}>
                  {MOMENTOS.map((m) => <option key={m} value={m}>{MOMENTO_LABEL[m]}</option>)}
                </select>
              </Campo>
              <Campo label="Minutos">
                <input className="input w-full" type="number" min={1} value={form.tiempo} onChange={set('tiempo')} placeholder="30" />
              </Campo>
              <Campo label="Personas">
                <input className="input w-full" type="number" min={1} value={form.personas} onChange={set('personas')} placeholder="4" />
              </Campo>
            </div>
            <Campo label="Descripción">
              <input className="input w-full" value={form.descripcion} onChange={set('descripcion')} placeholder="Breve presentación" />
            </Campo>
          </div>
          <div>
            <Campo label="Foto">
              <div className="overflow-hidden rounded-xl border border-edge bg-panel-2">
                {foto ? (
                  <div className="relative">
                    <img src={foto} alt="" className="h-40 w-full object-cover" />
                    <button type="button" className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white" onClick={quitarFoto} title="Quitar foto">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200">
                    <ImagePlus className="h-8 w-8 opacity-50" />
                    <span>{archivo ? archivo.name : 'Subir foto (se comprime a webp)'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setArchivo(f); setFoto(URL.createObjectURL(f)); } }} />
                  </label>
                )}
              </div>
            </Campo>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Campo label="Ingredientes" hint="Uno por línea">
            <textarea className="input w-full min-h-40" value={form.ingredientes} onChange={set('ingredientes')} placeholder={'Patatas\nHuevos\nAceite'} />
          </Campo>
          <Campo label="Pasos de elaboración" hint="Uno por línea">
            <textarea className="input w-full min-h-40" value={form.pasos} onChange={set('pasos')} placeholder={'Cocer las patatas\n...'} />
          </Campo>
        </div>

        {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onCerrar}>Cancelar</button>
          <button className="btn-primary" disabled={enviando}>{enviando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

function VerReceta({ receta, onCerrar, onEditar }: { receta: Receta; onCerrar: () => void; onEditar: () => void }) {
  return (
    <Modal abierto onCerrar={onCerrar} titulo={receta.titulo} ancho="xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <MomentoBadge momento={receta.momento} />
          {receta.tiempo && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {receta.tiempo} min</span>}
          {receta.personas && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {receta.personas} personas</span>}
        </div>
        {receta.descripcion && <p className="text-slate-300">{receta.descripcion}</p>}
        {receta.foto && <img src={receta.foto} alt={receta.titulo} className="h-56 w-full rounded-xl object-cover" />}

        <div>
          <h3 className="mb-2 font-bold text-slate-100">Ingredientes</h3>
          <ul className="space-y-1 text-sm text-slate-300">
            {receta.ingredientes.map((ing, i) => (
              <li key={i} className="flex gap-2"><span className="text-accent-500">•</span>{ing}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 font-bold text-slate-100">Elaboración</h3>
          <ol className="space-y-2 text-sm text-slate-300">
            {receta.pasos.map((paso, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-xs font-bold text-accent-500">{i + 1}</span>
                <span>{paso}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex justify-end gap-2 border-t border-edge pt-4">
          <button className="btn-outline" onClick={onCerrar}>Cerrar</button>
          <button className="btn-primary" onClick={onEditar}><Pencil className="h-4 w-4" /> Editar</button>
        </div>
      </div>
    </Modal>
  );
}