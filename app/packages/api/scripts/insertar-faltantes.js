require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LISTA_JSON = process.argv[2];
if (!LISTA_JSON || !fs.existsSync(LISTA_JSON)) {
  console.error('ERROR_LISTA=' + LISTA_JSON);
  process.exit(1);
}

const titulos = JSON.parse(fs.readFileSync(LISTA_JSON, 'utf8'));
if (!Array.isArray(titulos)) {
  console.error('ERROR_FORMATO_LISTA');
  process.exit(1);
}

function norma(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

(async () => {
  const enBBDD = new Set(
    (await prisma.receta.findMany({ select: { titulo: true } })).map((r) => norma(r.titulo))
  );
  console.log('DATABASE_URL_FIJO=' + (process.env.DATABASE_URL || '').replace(/:([^:@/]+)@/, ':***@'));
  console.log('EN_BBDD_ANTES=' + enBBDD.size + ' | A_INSERTAR_CANDIDATAS=' + titulos.length);

  const vistos = new Set();
  let creadas = 0;
  let omitidas = 0;
  for (const t of titulos) {
    const k = norma(t);
    if (!k) continue;
    if (enBBDD.has(k) || vistos.has(k)) {
      omitidas++;
      continue;
    }
    vistos.add(k);
    await prisma.receta.create({
      data: {
        titulo: t.trim(),
        momento: 'AMBAS',
        descripcion: 'Importada desde Recetas.Mar.docx (pendiente detallar elaboracion).',
        ingredientes: [],
        pasos: [],
      },
    });
    creadas++;
  }
  console.log('INSERTADAS=' + creadas + ' | OMITIDAS_DUPLICADO=' + omitidas);
  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR=' + e.message);
  process.exit(1);
});
