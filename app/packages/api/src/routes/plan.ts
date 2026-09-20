import { Router } from 'express';
import prisma from '../prisma';
import { autenticar } from '../middleware/auth';
import { parseIso, isoDate, diasSemana, addDays, hoy } from '../services/fechas';
import { fotoUrl } from '../services/fotos';

const router = Router();
router.use(autenticar);

const DIAS_NOMBRE = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
type MomentoDia = 'COMIDA' | 'CENA' | 'AMBAS' | 'POSTRE';

function mapRecetaMini(r: any) {
  return {
    id: r.id,
    titulo: r.titulo,
    momento: r.momento,
    foto: r.foto ? fotoUrl(r.foto) : null,
    tiempo: r.tiempo,
    personas: r.personas,
  };
}

// Lee o devuelve la semana dada (semana = cualquier dia; se normaliza a su lunes)
async function semanaData(usuarioId: number, semana: string) {
  const lunes = mondayParam(semana);
  const dias = diasSemana(lunes);
  const desde = dias[0];
  const hasta = addDays(dias[6], 1);
  const planes = await prisma.planMenu.findMany({
    where: { usuarioId, fecha: { gte: desde, lt: hasta } },
    include: { comida: true, cena: true },
  });
  const porFecha: Record<string, any> = {};
  for (const p of planes) porFecha[isoDate(p.fecha)] = p;
  return {
    semana: isoDate(lunes),
    dias: dias.map((d) => {
      const p = porFecha[isoDate(d)] || null;
      return {
        fecha: isoDate(d),
        nombre: DIAS_NOMBRE[(d.getUTCDay() + 6) % 7],
        comida: p?.comidaId ? mapRecetaMini(p.comida) : null,
        cena: p?.cenaId ? mapRecetaMini(p.cena) : null,
        generado: p?.generado ?? false,
      };
    }),
  };
}

function mondayParam(semana?: string): Date {
  const d = semana ? parseIso(String(semana)) : hoy();
  return d;
}

// GET /plan?semana=YYYY-MM-DD -> la semana (lunes a domingo)
router.get('/', async (req, res) => {
  try {
    const semana = typeof req.query.semana === 'string' ? req.query.semana : isoDate(hoy());
    res.json(await semanaData(req.usuario!.id, semana));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /plan/ultimos-uso?limite=date -> cuantos dias hace que se uso cada receta (para mostrar avisos)
router.get('/ultimos-uso', async (req, res) => {
  try {
    const usuarioId = req.usuario!.id;
    const rows = await prisma.planMenu.findMany({
      where: { usuarioId, comidaId: { not: null } },
      select: { fecha: true, comidaId: true },
    });
    const rows2 = await prisma.planMenu.findMany({
      where: { usuarioId, cenaId: { not: null } },
      select: { fecha: true, cenaId: true },
    });
    const ultimo: Record<number, string> = {};
    for (const r of rows) {
      if (r.comidaId && (!ultimo[r.comidaId] || r.fecha > parseIso(ultimo[r.comidaId])))
        ultimo[r.comidaId] = isoDate(r.fecha);
    }
    for (const r of rows2) {
      if (r.cenaId && (!ultimo[r.cenaId] || r.fecha > parseIso(ultimo[r.cenaId]))) ultimo[r.cenaId] = isoDate(r.fecha);
    }
    res.json({ ultimosUso: ultimo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const LIMITE_SUGERENCIAS = 18;

// GET /plan/sugerencias?semana=YYYY-MM-DD&dia=0..6&momento=COMIDA|CENA
// Devuelve recetas candidatas ordenadas por la que hace mas tiempo que no se usa.
router.get('/sugerencias', async (req, res) => {
  try {
    const usuarioId = req.usuario!.id;
    const semana = typeof req.query.semana === 'string' ? req.query.semana : isoDate(hoy());
    const dia = Math.max(0, Math.min(6, Number(req.query.dia) || 0));
    const momento = String(req.query.momento || 'COMIDA');
    if (momento !== 'COMIDA' && momento !== 'CENA') return res.status(400).json({ error: 'momento debe ser COMIDA o CENA' });

    const lunes = mondayParam(semana);
    const dias = diasSemana(lunes);
    const fechaDia = dias[dia];

    const recetas = await prisma.receta.findMany({
      where: momento === 'COMIDA' ? { momento: { in: ['COMIDA', 'AMBAS'] } } : { momento: { in: ['CENA', 'AMBAS'] } },
      include: { creador: { select: { nombre: true } } },
    });

    // fecha maxima de uso por receta (incluyendo dias ya planificados de esta semana)
    const planes = await prisma.planMenu.findMany({
      where: { usuarioId, fecha: { lt: addDays(fechaDia, 1) } },
    });
    const ultimoUso: Record<number, Date> = {};
    for (const p of planes) {
      if (p.comidaId && (!ultimoUso[p.comidaId] || p.fecha > ultimoUso[p.comidaId])) ultimoUso[p.comidaId] = p.fecha;
      if (p.cenaId && (!ultimoUso[p.cenaId] || p.fecha > ultimoUso[p.cenaId])) ultimoUso[p.cenaId] = p.fecha;
    }
    // recetas ya ocupadas esta semana (un plato no se repite la misma semana)
    const ocupadas = new Set<number>();
    for (const p of planes) {
      if (p.comidaId) ocupadas.add(p.comidaId);
      if (p.cenaId) ocupadas.add(p.cenaId);
    }

    const ahora = new Date();
    const candidatas = recetas
      .map((r) => {
        const ultima = ultimoUso[r.id];
        const diasSinUsar = ultima ? Math.floor((ahora.getTime() - ultima.getTime()) / 86400000) : 999;
        return { receta: r, diasSinUsar, ultima: ultima ? isoDate(ultima) : null };
      })
      .filter((c) => !ocupadas.has(c.receta.id) || c.receta.id === (req.query.actual ? Number(req.query.actual) : -1))
      .sort((a, b) => {
        if (a.diasSinUsar === b.diasSinUsar) return a.receta.titulo.localeCompare(b.receta.titulo);
        return b.diasSinUsar - a.diasSinUsar;
      })
      .slice(0, LIMITE_SUGERENCIAS);

    res.json({ sugerencias: candidatas.map((c) => ({ ...mapRecetaMini(c.receta), diasSinUsar: c.diasSinUsar, ultima: c.ultima })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /plan — guarda cambios de la semana (per-slot)
// body: { semana: 'YYYY-MM-DD', cambios: [{ dia: 0..6, comidaId?, cenaId? }] }
router.put('/', async (req, res) => {
  try {
    const usuarioId = req.usuario!.id;
    const { semana, cambios } = req.body ?? {};
    if (!semana || !Array.isArray(cambios)) return res.status(400).json({ error: 'Faltan semana o cambios' });
    const lunes = mondayParam(semana);
    const dias = diasSemana(lunes);
    const tx = prisma.$transaction(
      cambios.map((c: any) => {
        const idx = Number(c.dia);
        if (idx < 0 || idx > 6) return Promise.resolve(null) as any;
        const fecha = dias[idx];
        return prisma.planMenu.upsert({
          where: { usuarioId_fecha: { usuarioId, fecha } },
          create: {
            usuarioId,
            fecha,
            comidaId: c.comidaId ? Number(c.comidaId) : null,
            cenaId: c.cenaId ? Number(c.cenaId) : null,
            generado: c.generado ?? false,
          },
          update: {
            comidaId: c.comidaId ? Number(c.comidaId) : null,
            cenaId: c.cenaId ? Number(c.cenaId) : null,
            generado: c.generado ?? false,
          },
          include: { comida: true, cena: true },
        });
      })
    );
    await tx;
    res.json(await semanaData(usuarioId, isoDate(lunes)));
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// POST /plan/generar — rellena los huecos vacios de la semana evitando repetir platos muy seguidos.
// La sugerencia respeta el historial: no repite un plato que se ha hecho recientemente
// (dias_sin_repetir, por defecto 21) y no repite platos dentro de la misma semana.
router.post('/generar', async (req, res) => {
  try {
    const usuarioId = req.usuario!.id;
    const semana = req.body?.semana || isoDate(hoy());
    const lunes = mondayParam(String(semana));
    const dias = diasSemana(lunes);
    const desde = dias[0];
    const hasta = addDays(dias[6], 1);
    const config = await prisma.configuracion.findUnique({ where: { clave: 'dias_sin_repetir' } });
    const diasSinRepetir = Number(config?.valor || 21);

    const recetasAll = await prisma.receta.findMany();
    const porMomento: Record<string, any[]> = {
      COMIDA: recetasAll.filter((r) => r.momento === 'COMIDA' || r.momento === 'AMBAS'),
      CENA: recetasAll.filter((r) => r.momento === 'CENA' || r.momento === 'AMBAS'),
    };

    const historial = await prisma.planMenu.findMany({ where: { usuarioId } });
    const ultimoUso: Record<number, Date> = {};
    for (const p of historial) {
      if (p.comidaId && (!ultimoUso[p.comidaId] || p.fecha > ultimoUso[p.comidaId])) ultimoUso[p.comidaId] = p.fecha;
      if (p.cenaId && (!ultimoUso[p.cenaId] || p.fecha > ultimoUso[p.cenaId])) ultimoUso[p.cenaId] = p.fecha;
    }

    const ocupadas = new Set<number>();
    const hoyD = new Date();
    const encuentra = (momento: 'COMIDA' | 'CENA'): any | null => {
      let pool = porMomento[momento].filter((r) => !ocupadas.has(r.id));
      // elimina las usadas dentro de la ventana dias_sin_repetir, pero solo si quedan alternativas
      const frescas = pool.filter((r) => !recientes().has(r.id));
      if (frescas.length > 0) pool = frescas;
      // Ultimo recurso: si se acaban las recetas de ese momento (p.ej. solo 6 cenas para 7 dias),
      // permite repetir una de las ya asignadas esta semana para no dejar ningun dia vacio.
      if (pool.length === 0) pool = porMomento[momento];
      // Último recurso: si ni así hay candidatas (pocas recetas de ese momento: ej. solo 6 cenas
      // para 7 días), repite un plato ya usado esta semana, prefiriendo el que hace más tiempo que no se usó.
      if (pool.length === 0) {
        const conRepeticion = porMomento[momento].filter((r) => !recientes().has(r.id));
        pool = conRepeticion.length > 0 ? conRepeticion : porMomento[momento];
      }
      const sorted = [...pool].sort((a, b) => {
        const ua = ultimoUso[a.id]?.getTime() || 0;
        const ub = ultimoUso[b.id]?.getTime() || 0;
        if (ua === ub) return a.titulo.localeCompare(b.titulo);
        return ua - ub;
      });
      const elegida = sorted[Math.floor(Math.random() * Math.min(sorted.length, 3))] || sorted[0];
      if (!elegida) return null;
      ocupadas.add(elegida.id);
      return elegida;
    };
    const recientes = () => {
      const s = new Set<number>();
      for (const r of recetasAll) {
        const ult = ultimoUso[r.id];
        if (ult && Math.floor((hoyD.getTime() - ult.getTime()) / 86400000) < diasSinRepetir) s.add(r.id);
      }
      return s;
    };

    const existentes = await prisma.planMenu.findMany({ where: { usuarioId, fecha: { gte: desde, lt: hasta } } });
    const planDeDia: Record<string, any> = {};
    for (const p of existentes) planDeDia[isoDate(p.fecha)] = p;

    let asignadas = 0;
    for (const fecha of dias) {
      const clave = isoDate(fecha);
      const ext = planDeDia[clave];
      const data: any = { usuarioId, fecha };
      if (ext?.comidaId) data.comidaId = ext.comidaId;
      else {
        const c = encuentra('COMIDA');
        if (c) {
          data.comidaId = c.id;
          ultimoUso[c.id] = fecha;
          asignadas++;
        } else data.comidaId = null;
      }
      if (!data.comidaId && ext) data.comidaId = ext.comidaId ?? null;
      if (ext?.cenaId) data.cenaId = ext.cenaId;
      else {
        const ce = encuentra('CENA');
        if (ce) {
          data.cenaId = ce.id;
          ultimoUso[ce.id] = fecha;
          asignadas++;
        } else data.cenaId = null;
      }
      if (!data.cenaId && ext) data.cenaId = ext.cenaId ?? null;
      data.generado = true;
      await prisma.planMenu.upsert({
        where: { usuarioId_fecha: { usuarioId, fecha } },
        create: data,
        update: { comidaId: data.comidaId, cenaId: data.cenaId, generado: true },
      });
    }

    res.json({
      ok: true,
      mensaje: `Plan generado: ${asignadas} platos asignados en los 7 días, sin repetir platos en menos de ${diasSinRepetir} días`,
      semana: await semanaData(usuarioId, isoDate(lunes)),
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

export default router;