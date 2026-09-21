require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TXT_NEW = process.argv[2];
const TXT_ULT = process.argv[3];
if (!fs.existsSync(TXT_NEW) || !fs.existsSync(TXT_ULT)) {
  console.error('FALTAN_TXT_ARGV');
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

function leerTxt(ruta) {
  return fs
    .readFileSync(ruta, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

(async () => {
  const titulosUnicos = [];
  const vistos = new Set();
  for (const ruta of [TXT_NEW, TXT_ULT]) {
    for (const t of leerTxt(ruta)) {
      const k = limpia(t);
      if (!k || vistos.has(k)) continue;
      vistos.add(k);
      titulosUnicos.push(t);
    }
  }

  console.log('TITULOS_UNION=' + titulosUnicos.length);
  const enBBDD = new Set(
    (await prisma.receta.findMany({ select: { titulo: true } })).map((r) => limpia(r.titulo))
  );
  console.log('EN_BBDD_ANTES=' + enBBDD.size);

  let insertadas = 0;
  let omitidas = 0;
  for (const t of titulosUnicos) {
    const k = limpia(t);
    if (!k) continue;
    if (enBBDD.has(k)) {
      omitidas++;
      continue;
    }
    await prisma.receta.create({
      data: {
        titulo: t,
        momento: 'AMBAS',
        descripcion: 'Receta importada de Recetas.Mar (elaboracion pendiente de completar).',
        ingredientes: [],
        pasos: [],
      },
    });
    enBBDD.add(k);
    insertadas++;
  }

  console.log('INSERTADAS=' + insertadas);
  console.log('OMITIDAS_DUPLICADAS=' + omitidas);
  console.log('EN_BBDD_FINAL=' + enBBDD.size生命中);
  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR=' + e.message.split('\n')[0]);
  process.exit(1);
});
