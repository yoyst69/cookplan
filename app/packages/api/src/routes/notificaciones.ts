// Notificaciones de la app: se crean al repartir/asignar tareas y al finalizarlas.
import { Router } from 'express';
import prisma from '../prisma';
import { autenticar } from '../middleware/auth';

const router = Router();
router.use(autenticar);

// GET /api/notificaciones — historial reciente + contador de no leidas
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const [notificaciones, noLeidas] = await Promise.all([
      prisma.notificacion.findMany({
        where: { usuarioId: req.usuario!.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notificacion.count({ where: { usuarioId: req.usuario!.id, leida: false } }),
    ]);
    res.json({ notificaciones, noLeidas });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// GET /api/notificaciones/no-leidas — solo el contador (para el badge)
router.get('/no-leidas', async (req, res) => {
  try {
    const noLeidas = await prisma.notificacion.count({ where: { usuarioId: req.usuario!.id, leida: false } });
    res.json({ noLeidas });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// PATCH /api/notificaciones/:id — marcar leida
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const leida = typeof req.body?.leida === 'boolean' ? req.body.leida : true;
    await prisma.notificacion.update({ where: { id }, data: { leida } });
    res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// POST /api/notificaciones/leer-todas — marca todas las del usuario como leidas
router.post('/leer-todas', async (req, res) => {
  try {
    await prisma.notificacion.updateMany({ where: { usuarioId: req.usuario!.id, leida: false }, data: { leida: true } });
    res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

export default router;