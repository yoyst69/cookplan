// Plan de tareas domesticas del fin de semana: reparto balanceado entre
// Fiti, Mar y Jose. El catalogo lo puede ampliar cualquier usuario.
import { Router } from 'express';
import prisma from '../prisma';
import { autenticar } from '../middleware/auth';
import { parseIso, isoDate, mondayOf, addDays } from '../services/fechas';

const router = Router();
router.use(autenticar);

const DIAS = ['SABADO', 'DOMINGO'] as const;
type Dia = (typeof DIAS)[number];

function semanaParam(semana?: unknown): string {
  const d = semana ? parseIso(String(semana)) : new Date();
  return isoDate(mondayOf(d));
}

async function cargarPersonas(): Promise<Array<{ id: number; nombre: string; email: string }>> {
  const cfg = await prisma.configuracion.findUnique({ where: { clave: 'tareas_personas' } });
  const ids = ((cfg?.valor || '').split(',').map((s) => Number(s.trim())).filter(Boolean));
  const usuarios = await prisma.usuario.findMany({ where: { activo: true }, select: { id: true, nombre: true, email: true } });
  let seleccion = ids.length >= 2 ? usuarios.filter((u) => ids.includes(u.id)) : usuarios;
  if (seleccion.length < 1) seleccion = usuarios.slice(0, 1);
  return seleccion.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function rotacionSemana(lunes: Date): number {
  const epoch = new Date(2026, 0, 5, 0, 0, 0, 0); // lunes cualquiera de base
  return Math.floor((lunes.getTime() - epoch.getTime()) / (7 * 86400000));
}

async function reparto(lunes: Date) {
  const semana = isoDate(lunes);
  const personas = await cargarPersonas();
  const asignaciones = await prisma.asignacionTarea.findMany({
    where: { semana: lunes },
    orderBy: [{ dia: 'asc' }, { usuarioId: 'asc' }, { orden: 'asc' }, { createdAt: 'asc' }],
    include: { tarea: { select: { id: true, nombre: true, peso: true } }, usuario: { select: { id: true, nombre: true } } },
  });
  const catalogo = await prisma.tareaDomestica.findMany({ orderBy: [{ activa: 'desc' }, { nombre: 'asc' }] });
  return {
    semana,
    sabado: isoDate(addDays(lunes, 5)),
    domingo: isoDate(addDays(lunes, 6)),
    personas,
    asignaciones: asignaciones.map((a) => ({
      id: a.id,
      usuarioId: a.usuarioId,
      persona: a.usuario.nombre,
      tareaId: a.tareaId,
      tarea: a.tarea.nombre,
      peso: a.tarea.peso,
      dia: a.dia,
      checked: a.checked,
      orden: a.orden,
      generado: a.generado,
    })),
    catalogo,
  };
}

// GET /tareas?semana=YYYY-MM-DD — reparto del fin de semana + catalogo
router.get('/', async (req, res) => {
  try {
    const lunes = parseIso(semanaParam(req.query.semana));
    res.json(await reparto(lunes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /tareas/generar — reparte las tareas activas entre Fiti, Mar y Jose
// equilibrando el esfuerzo (peso) en sabado y domingo.
router.post('/generar', async (req, res) => {
  try {
    const lunes = parseIso(semanaParam(req.body?.semana));
    const personas = await cargarPersonas();
    if (personas.length === 0) return res.status(400).json({ error: 'No hay personas a las que repartir tareas' });

    const tareas = await prisma.tareaDomestica.findMany({ where: { activa: true }, orderBy: [{ peso: 'desc' }, { nombre: 'asc' }] });
    if (tareas.length === 0) return res.status(400).json({ error: 'El catalogo de tareas está vacío' });

    // primero se regenera: se quitan solo las asignaciones anteriores generadas por el reparto
    await prisma.asignacionTarea.deleteMany({ where: { semana: lunes, generado: true } });
    const yaAsignadas = await prisma.asignacionTarea.findMany({ where: { semana: lunes }, select: { usuarioId: true, tareaId: true } });
    const ocupado = new Set(yaAsignadas.map((a) => `${a.usuarioId}:${a.tareaId}`));

    const disponibles = tareas.filter((t) => {
      for (const p of personas) if (!ocupado.has(`${p.id}:${t.id}`)) return true;
      return false;
    });

    // reparto equilibrado por esfuerzo acumulado, con rotacion semanal para que no toque siempre lo mismo
    const rot = Math.max(0, rotacionSemana(lunes) % personas.length);
    const esfuerzo = personas.map((p) => ({ id: p.id, total: 0, tareas: [] as number[] }));
    for (const t of disponibles.sort((a, b) => b.peso - a.peso || a.id - b.id)) {
      const candidatos = esfuerzo.map((e, i) => ({ e, i }));
      candidatos.sort((x, y) => (x.e.total - y.e.total) || ((x.i + rot) % personas.length) - ((y.i + rot) % personas.length));
      const mejor = candidatos[0].e;
      mejor.total += t.peso;
      mejor.tareas.push(t.id);
    }

    // de cada persona, reparte sus tareas entre sabado y domingo equilibrando el peso
    const filas: Array<{
      usuarioId: number;
      tareaId: number;
      dia: Dia;
      orden: number;
    }> = [];
    for (const p of esfuerzo) {
      const asignar = disponibles.filter((t) => p.tareas.includes(t.id)).sort((a, b) => b.peso - a.peso || a.id - b.id);
      const dias = [
        { dia: 'SABADO' as Dia, total: 0, orden: 0 },
        { dia: 'DOMINGO' as Dia, total: 0, orden: 0 },
      ];
      for (const t of asignar) {
        dias.sort((a, b) => (a.total - b.total) || (a.dia === 'SABADO' ? -1 : 0) - (b.dia === 'SABADO' ? -1 : 0));
        const d = dias[0];
        d.total += t.peso;
        filas.push({ usuarioId: p.id, tareaId: t.id, dia: d.dia, orden: d.orden++ });
      }
    }

    await prisma.$transaction(
      filas.map((f) =>
        prisma.asignacionTarea.create({
          data: { usuarioId: f.usuarioId, tareaId: f.tareaId, semana: lunes, dia: f.dia, orden: f.orden, generado: true },
        })
      )
    );

    res.json(await reparto(lunes));
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// POST /tareas/asignacion — asigna manualmente una tarea a una persona (generado=false)
router.post('/asignacion', async (req, res) => {
  try {
    const lunes = parseIso(semanaParam(req.body?.semana));
    const usuarioId = Number(req.body?.usuarioId);
    const tareaId = Number(req.body?.tareaId);
    const diaRaw = String(req.body?.dia || 'SABADO').toUpperCase();
    const dia: Dia = DIAS.includes(diaRaw as Dia) ? (diaRaw as Dia) : 'SABADO';
    if (!usuarioId || !tareaId) return res.status(400).json({ error: 'Faltan usuarioId y tareaId' });
    const persona = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!persona) return res.status(404).json({ error: 'La persona no existe' });
    const tarea = await prisma.tareaDomestica.findUnique({ where: { id: tareaId } });
    if (!tarea) return res.status(404).json({ error: 'La tarea no existe' });
    const ultimo = await prisma.asignacionTarea.findMany({
      where: { semana: lunes, usuarioId },
      orderBy: { orden: 'desc' },
      take: 1,
    });
    const asignacion = await prisma.asignacionTarea.upsert({
      where: { usuarioId_tareaId_semana: { usuarioId, tareaId, semana: lunes } },
      update: { dia, generado: false },
      create: {
        usuarioId,
        tareaId,
        semana: lunes,
        dia,
        generado: false,
        orden: (ultimo[0]?.orden ?? 0) + 1,
      },
    });
    res.status(201).json({ asignacion });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// PATCH /tareas/asignacion/:id — marcar realizada (checked) o cambiar de dia
router.patch('/asignacion/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const data: any = {};
    if (typeof body.checked === 'boolean') data.checked = body.checked;
    if (body.dia && DIAS.includes(String(body.dia).toUpperCase() as Dia)) data.dia = String(body.dia).toUpperCase();
    const upd = await prisma.asignacionTarea.update({ where: { id }, data });
    res.json({ asignacion: upd });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// DELETE /tareas/asignacion/:id — quita una tarea del plan
router.delete('/asignacion/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.asignacionTarea.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// GET /tareas/catalogo — lista de tareas domesticas (activas y desactivas)
router.get('/catalogo', async (_req, res) => {
  try {
    const catalogo = await prisma.tareaDomestica.findMany({ orderBy: [{ activa: 'desc' }, { nombre: 'asc' }] });
    res.json({ catalogo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /tareas/catalogo — nueva tarea (cualquier usuario)
router.post('/catalogo', async (req, res) => {
  try {
    const { nombre, peso } = req.body ?? {};
    const nom = String(nombre || '').trim();
    if (!nom) return res.status(400).json({ error: 'El nombre de la tarea es obligatorio' });
    const p = Math.min(3, Math.max(1, Number(peso) || 1));
    const existente = await prisma.tareaDomestica.findUnique({ where: { nombre: nom } });
    if (existente) return res.status(409).json({ error: 'Esa tarea ya existe en el catálogo' });
    const tarea = await prisma.tareaDomestica.create({
      data: { nombre: nom, peso: p, activa: true, creadorId: req.usuario!.id },
    });
    res.status(201).json({ tarea });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// PATCH /tareas/catalogo/:id — editar nombre/peso, o activar/desactivar
router.patch('/catalogo/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const data: any = {};
    if (typeof body.nombre === 'string' && body.nombre.trim()) data.nombre = body.nombre.trim();
    if (typeof body.peso === 'number') data.peso = Math.min(3, Math.max(1, body.peso));
    if (typeof body.activa === 'boolean') data.activa = body.activa;
    if (typeof body.nombre === 'string' && !body.nombre.trim()) return res.status(400).json({ error: 'El nombre no puede quedar vacío' });
    const tarea = await prisma.tareaDomestica.update({ where: { id }, data });
    res.json({ tarea });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// DELETE /tareas/catalogo/:id — elimina la tarea (y sus asignaciones)
router.delete('/catalogo/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.tareaDomestica.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

export default router;