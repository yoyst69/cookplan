require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// argv: 1 = txt NEW, 2 = txt ULT, 3 = DB local (default env), 4 = nube (opcional)
const TXT_NEW = process.argv[2];
const TXT_ULT = process.argv[3];
if (!TXT_NEW || !TXT_ULT || !fs.existsSync(TXT_NEW) || !fs.existsSync(TXT_ULT)) {
  console.error('ERROR_ARGV_TXT');
  process.exit(1);
}

function limpia(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function leer(ruta) {
  return fs
    .readFileSync(ruta, 'latin1')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

const cotas = {
  nube: process.argv[4] || '',
  local: process.env.DATABASE_URL_LOCAL || '',
};

async function existentesEn(prisma2) {
  const s = new Set();
  const filas = await prisma2.receta.findMany({ select: { titulo: true } });
  filas.forEach((r) => s.add(limpia(r.titulo)));
  return s;
}

async function insertarFaltantes(prisma2, titulos, enBBDD, origen) {
  let creadas = 0;
  let duplicadas = 0;
  const vistos = new Set();
  for (const t of titulos) {
    const k = limpia(t);
    if (!k) continue;
    if (enBBDD.has(k) || vistos.has(k)) {
      if (enBBDD.has(k)) duplicadas++;
      continue;
    }
    vistos.add(k);
    await prisma2.receta.create({
      data: {
        titulo: t,
        momento: 'AMBAS',
        descripcion: 'Receta importada de Recetas.Mar. Elaboracion pendiente de completar.',
        ingredientes: [],
        pasos: [],
      },
    });
    creadas++;
    enBBDD.add(k);
  }
  console.log(origen + '_CREADAS=' + creadas + '|_DUPLICADAS=' + duplicadas);
}

const titNew = leer(TXT_NEW);
const titUlt = leer(TXT_ULT(e));
const vistos = new Set();
const union = [];
for (const t of [...titNew, ...titUlt]) {
  const k = limpia(t);
  if (!k || vistos.has(k)) continue;
  vistos.add(k);
  union.push(t);
}
console.log('UNION_TITULOS=' + union.length);

(async () => {
  const enLocal = await existentesEn(prisma);
  console.log('LOCAL_EN_BBDD_ANTES=' + enLocal.size);
  await insertarFaltantes(prisma, union, enLocal, 'LOCAL');

  if (cotas.nube) {
    const { PrismaClient: PC } = require('@prisma/client');
    const p2 = new PC({ datasources: { db: { url: cotas.nube } } });
    const enNube = await existentesEn(p2);
    console.log('NUBE_EN_BBDD_ANTES=' + enNube.size);
    await insertarFaltantes(p2, union, enNube, 'NUBE');
    await p2.$disconnect();
  } else {
    console.log('NUBE_SIN_URL_SALTADA');
  }
  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR_FINAL=' + e.message.split('\n')[0]);
  process.exit(1);
});
