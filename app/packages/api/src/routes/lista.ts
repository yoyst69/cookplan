import { Router } from 'express';
import prisma from '../prisma';
import { autenticar } from '../middleware/auth';
import { parseIso, isoDate, mondayOf, addDays, diasSemana } from '../services/fechas';

const router = Router();
router.use(autenticar);

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function semanaParam(semana?: string): Promise<string> {
  const d = semana ? parseIso(String(semana)) : new Date();
  return isoDate(mondayOf(d));
}

// GET /lista-compra?semana=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const semana = await semanaParam(typeof req.query.semana === 'string' ? req.query.semana : undefined);
    const items = await prisma.listaCompraItem.findMany({
      where: { usuarioId: req.usuario!.id, semana: parseIso(semana) },
      orderBy: [{ checked: 'asc' }, { orden: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ semana, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /lista-compra/generar — reconstruye los items del menu (origen MENU) de la semana
// a partir de los ingredientes de las recetas del plan. Los items manuales se conservan.
router.post('/generar', async (req, res) => {
  try {
    const usuarioId = req.usuario!.id;
    const semana = await semanaParam(req.body?.semana);
    const lunes = parseIso(semana);
    const dias = diasSemana(lunes);
    const hastaLunes = addDays(lunes, 7);

    const planes = await prisma.planMenu.findMany({
      where: { usuarioId, fecha: { gte: lunes, lt: hastaLunes } },
      include: { comida: true, cena: true },
    });

    // elimina los items MENU anteriores de esa semana
    await prisma.listaCompraItem.deleteMany({ where: { usuarioId, semana: lunes, origen: 'MENU' } });

    // agrega ingredientes por plato
    const conteo: Record<string, { nombre: string; veces: number }> = {};
    for (const p of planes) {
      const recetas = [p.comida, p.cena].filter((r) => r && r.ingredientes && r.ingredientes.length > 0);
      for (const r of recetas) {
        for (const ing of (r as any).ingredientes) {
          const clave = norm(String(ing));
          if (!clave) continue;
          if (!conteo[clave]) conteo[clave] = { nombre: String(ing).trim(), veces: 0 };
          conteo[clave].veces++;
        }
      }
    }

    const productos = Object.values(conteo);
    let orden = 0;
    await prisma.$transaction(
      productos.map((p) =>
        prisma.listaCompraItem.create({
          data: {
            usuarioId,
            semana: lunes,
            producto: p.nombre,
            cantidad: p.veces > 1 ? `x${p.veces}` : null,
            origen: 'MENU',
            orden: orden++,
          },
        })
      )
    );

    const items = await prisma.listaCompraItem.findMany({
      where: { usuarioId, semana: lunes },
      orderBy: [{ checked: 'asc' }, { orden: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ semana, items, generados: productos.length });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// POST /lista-compra/item — anade un item manual
router.post('/item', async (req, res) => {
  try {
    const usuarioId = req.usuario!.id;
    const { producto, cantidad, semana } = req.body ?? {};
    const nombre = (producto || '').trim();
    if (!nombre) return res.status(400).json({ error: 'El producto es obligatorio' });
    const semanaLunes = await semanaParam(semana);
    const lunes = parseIso(semanaLunes);
    const ultima = await prisma.listaCompraItem.findMany({
      where: { usuarioId, semana: lunes, origen: 'MANUAL' },
      orderBy: { orden: 'desc' },
      take: 1,
    });
    const item = await prisma.listaCompraItem.create({
      data: {
        usuarioId,
        semana: lunes,
        producto: nombre,
        cantidad: cantidad ? String(cantidad) : null,
        origen: 'MANUAL',
        orden: (ultima[0]?.orden ?? 0) + 1,
      },
    });
    res.status(201).json({ item });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// PATCH /lista-compra/:id — marcar/desmarcar (check, tacha) o editar
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const data: any = {};
    if (typeof body.checked === 'boolean') data.checked = body.checked;
    if (typeof body.producto === 'string' && body.producto.trim()) data.producto = body.producto.trim();
    if (typeof body.cantidad === 'string') data.cantidad = body.cantidad || null;
    const item = await prisma.listaCompraItem.updateMany({ where: { id, usuarioId: req.usuario!.id }, data });
    if (item.count === 0) return res.status(404).json({ error: 'Item no encontrado' });
    const updated = await prisma.listaCompraItem.findUnique({ where: { id } });
    res.json({ item: updated });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// DELETE /lista-compra — vacía la lista (toda la lista del usuario, o una semana concreta si se pasa ?semana=)
router.delete('/', async (req, res) => {
  try {
    const usuarioId = req.usuario!.id;
    const where: any = { usuarioId };
    if (typeof req.query.semana === 'string' && req.query.semana) {
      const lunes = await semanaParam(req.query.semana);
      where.semana = parseIso(lunes);
    }
    const { count } = await prisma.listaCompraItem.deleteMany({ where });
    res.json({ ok: true, borrados: count });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// DELETE /lista-compra/:id — quita un item de la lista
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const del = await prisma.listaCompraItem.deleteMany({ where: { id, usuarioId: req.usuario!.id } });
    if (del.count === 0) return res.status(404).json({ error: 'Item no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;