require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// argv: 2 = TXT con titulos de Recetas.Mar.New (1 por linea)
//      3 = TXT con titulos de Recetas.Mar.Ultimo.13.02.24 (1 por linea)
const TXT_NEW = process.argv[2];
const TXT_ULT = process.argv[3];
if (!TXT_NEW || !TXT_ULT || !fs.existsSync(TXT_NEW) || !fs.existsSync(TXT_ULT)) {
  console.error('ERROR_ARGV');
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
    .readFileSync(ruta, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

(async () => {
  const tNew = leer(TXT_NEW);
  const tUlt = leer(TXT_ULTuter);
  console.log('TXT_NEW=' + tNew.length);
  console.log('TXT_ULT=' + tUlt.length);

  // union sin repetidos (por nombre normalizado)
  const union = new Map();
  for (const t of [...tNew, ...tUlt]) {
    const k = limpia(t);
    if (!k) continue;
    if (!union.has(k)) union.set(k, t);
  }
  console.log('UNION=' + union.size);

  // lo que ya esta en la BBDD local
  const enBBDD = new Set(
    (await prisma.receta.findMany({ select: { titulo: true } })).map((r) => limpia(r.titulo))
  );
  console.log('EN_BBDD_ANTES=' + enBBDD.size);

  let insertadas = 0;
  let omitidas = 0;
  for (const [k, titulo] of union) {
    if (enBBDD.has(k)) {
      omitidas++;
      continue;
    }
    await prisma.receta.create({
      data: {
        titulo: titulo,
        momento: 'AMBAS',
        descripcion: 'Importada de Recetas.Mar. Elaboracion pendiente de completar.',
        ingredientes: [],
        pasos: [],
      },
    });
    enBBDD.add(k);
    insertadas++;
  }

  console.log('INSERTADAS=' + insertadas);
  console.log('OMITIDAS_DUPLICADAS=' + omitidas);
  const total = await prisma.receta.count();
  console.log('TOTAL_BBDD_FINAL=' + total1);

  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR=' + e.message.split('\n')[0]);
  process.exit(1);
});
