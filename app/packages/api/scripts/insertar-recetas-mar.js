require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TXT_NEW = process.argv[2];
const TXT_ULT = process.argv[3];
const URL_NUBE = process.argv[4] || '';

function norm(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function leer(ruta) {
  if (!fs.existsSync(ruta)) return [];
  return fs
    .readFileSync(ruta, 'latin1')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

async function importar(prisma, titulos, origen) {
  const existentes = new Set(
    (await prisma.receta.findMany({ select: { titulo: true } })).map((r) => norm(r.titulo))
  );
  let insertadas = 0;
  let omitidas = 0;
  let duplicados = 0;
  const vistos = new Set();
  for (const t of titulos) {
    const k = norm(t);
    if (!k) continue;
    if (existentes.has(k) || vistos.has(k)) {
      if (vistos.has(k)) duplicados++;
      else omitidas++;
      continue;
    }
    vistos.add(k);
    try {
      await prisma.receta.create({
        data: {
          titulo: t,
          momento: 'AMBAS',
          descripcion: 'Importada de ' + origen + ' (elaboracion pendiente de completar).',
          ingredientes: [],
          pasos: [],
        },
      });
      insertadas++;
    } catch (e) {
      console.log('ERROR_INSERT|' + t + '|' + e.message.split('\n')[0]);
    }
  }
  return { insertadas, omitidas, duplicados };
}

(async () => {
  const titNew = leer(TXT_NEW);
  const titUlt = leer(TXT_ULT);
  const union = [];
  const visto = new Set();
  for (const t of [...titNew, ...titUlt]) {
    const k = norm(t);
    if (!k || visto.has(k)) continue;
    visto.add(k);
    union.push(t);
  }
  console.log('UNION_TITULOS=' + union.length);

  const r1 = await importar(prisma, union, 'Recetas.Mar');
  console.log('LOCAL_insertadas=' + r1.insertadas + '|omitidas_dup=' + r1.omitidas + '|duplicados_en_lista=' + r1.duplicados);

  if (URL_NUBE) {
    process.env.DATABASE_URL_ANTERIOR = process.env.DATABASE_URL;
    process.env.DATABASE_URL = URL_NUBE;
    const prisma2 = new PrismaClient();
    const r2 = await importar(prisma2, union, 'Recetas.Mar');
    console.log('NUBE_insertadas=' + r2.insertadas + '|omitidas_dup=' + r2.omitidas);
    await prisma2.$disconnect();
  } else {
    console.log('NUBE_no_configurada');
  }

  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR_GLOBAL=' + e.message.split('\n')[0]);
  process.exit(1);
});
