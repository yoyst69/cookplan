import { Router } from 'express';
import prisma from '../prisma';
import { autenticar } from '../middleware/auth';
import upload from '../middleware/upload';
import { guardarFotoWebp, borrarFoto, fotoUrl } from '../services/fotos';

const router = Router();

router.use(autenticar);

type MomentoDia = 'COMIDA' | 'CENA' | 'AMBAS' | 'POSTRE';
const MOMENTOS: MomentoDia[] = ['COMIDA', 'CENA', 'AMBAS', 'POSTRE'];

function mapReceta(r: any) {
  return {
    id: r.id,
    titulo: r.titulo,
    momento: r.momento,
    descripcion: r.descripcion,
    foto: r.foto ? fotoUrl(r.foto) : null,
    fotoNombre: r.foto || null,
    ingredientes: r.ingredientes || [],
    pasos: r.pasos || [],
    tiempo: r.tiempo,
    personas: r.personas,
    excluirDelPlan: r.excluirDelPlan ?? false,
    creadorId: r.creadorId,
    creadorNombre: r.creador ? r.creador.nombre : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}



// LISTADO de recetas (filtros: q = busqueda, momento)
router.get('/', async (req, res) => {
  try {
    const { q, momento } = req.query;
    const where: any = {};
    if (typeof q === 'string' && q.trim()) {
      where.OR = [
        { titulo: { contains: q.trim(), mode: 'insensitive' } },
        { descripcion: { contains: q.trim(), mode: 'insensitive' } },
        { ingredientes: { has: q.trim() } },
      ];
    }
    if (typeof momento === 'string' && MOMENTOS.includes(momento as MomentoDia)) {
      if (momento === 'AMBAS') where.momento = { in: ['COMIDA', 'CENA', 'AMBAS'] };
      else where.momento = momento;
    }
    const recetas = await prisma.receta.findMany({
      where,
      include: { creador: { select: { nombre: true } } },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json({ recetas: recetas.map(mapReceta) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DETALLE
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const receta = await prisma.receta.findUnique({ where: { id }, include: { creador: { select: { nombre: true } } } });
    if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });
    res.json({ receta: mapReceta(receta) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// CREAR
router.post('/', async (req, res) => {
  try {
    const body = req.body ?? {};
    const titulo = (body.titulo || '').trim();
    if (!titulo) return res.status(400).json({ error: 'El título es obligatorio' });
    const momento = MOMENTOS.includes(body.momento) ? body.momento : 'AMBAS';
    const receta = await prisma.receta.create({
      data: {
        titulo,
        momento: momento as MomentoDia,
        descripcion: body.descripcion ? String(body.descripcion) : null,
        tiempo: body.tiempo ? Number(body.tiempo) : null,
        personas: body.personas ? Number(body.personas) : null,
        ingredientes: Array.isArray(body.ingredientes) ? body.ingredientes.map((i: any) => String(i)).filter(Boolean) : [],
        pasos: Array.isArray(body.pasos) ? body.pasos.map((p: any) => String(p)).filter(Boolean) : [],
        excluirDelPlan: Boolean(body.excluirDelPlan),
        creadorId: req.usuario!.id,
      },
      include: { creador: { select: { nombre: true } } },
    });
    res.status(201).json({ receta: mapReceta(receta) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// EDITAR (cualquier usuario puede editar recetas compartidas)
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const data: any = {};
    if (typeof body.titulo === 'string' && body.titulo.trim()) data.titulo = body.titulo.trim();
    if (body.momento !== undefined) {
      if (!MOMENTOS.includes(body.momento)) return res.status(400).json({ error: 'Momento no válido' });
      data.momento = body.momento;
    }
    if (body.descripcion !== undefined) data.descripcion = body.descripcion ? String(body.descripcion) : null;
    if (body.tiempo !== undefined) data.tiempo = body.tiempo ? Number(body.tiempo) : null;
    if (body.personas !== undefined) data.personas = body.personas ? Number(body.personas) : null;
    if (Array.isArray(body.ingredientes)) data.ingredientes = body.ingredientes.map((i: any) => String(i)).filter(Boolean);
    if (Array.isArray(body.pasos)) data.pasos = body.pasos.map((p: any) => String(p)).filter(Boolean);
    if (body.excluirDelPlan !== undefined) data.excluirDelPlan = Boolean(body.excluirDelPlan);
    const receta = await prisma.receta.update({ where: { id }, data, include: { creador: { select: { nombre: true } } } });
    res.json({ receta: mapReceta(receta) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// BORRAR
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const receta = await prisma.receta.findUnique({ where: { id } });
    if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });
    borrarFoto(receta.foto);
    await prisma.receta.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// SUBIR / REEMPLAZAR foto (se convierte a webp comprimido)
router.post('/:id/foto', upload.single('foto'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const receta = await prisma.receta.findUnique({ where: { id } });
    if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });
    if (!req.file) return res.status(400).json({ error: 'Falta el fichero de foto' });
    const nombre = await guardarFotoWebp(req.file.buffer, req.file.originalname, 'receta');
    borrarFoto(receta.foto);
    await prisma.receta.update({ where: { id }, data: { foto: nombre } });
    res.json({ foto: fotoUrl(nombre), fotoNombre: nombre });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error procesando la foto' });
  }
});

// QUITAR foto
router.delete('/:id/foto', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const receta = await prisma.receta.findUnique({ where: { id } });
    if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });
    borrarFoto(receta.foto);
    await prisma.receta.update({ where: { id }, data: { foto: null } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;