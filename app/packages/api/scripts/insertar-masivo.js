require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  const titulos = [...new Set([...leer(TXT_NEW), ...leer(TXT_ULT)])];
  console.log('TITULOS_UNION=' + titulos.length);

  const enBBDD = new Set(
    (await prisma.receta.findMany({ select: { titulo: true } })).map((r) => limpia(r.titulo))
  );
  console.log('EN_BBDD_ANTES=' + enBBDD.size);

  let creadas = 0;
  let omitidas = 0;
  const vistos = new Set();
  for (const t of titulos) {
    const k = limpia(t);
    if (!k || enBBDD.has(k) || vistos.has(k)) {
      if (k) omitidas++;
      continue;
    }
    vistos.add(k);
    await prisma.receta.create({
      data: {
        titulo: t,
        momento: 'AMBAS',
        descripcion: 'Receta importada de Recetas.Mar (elaboracion pendiente de completar).',
        ingredientes: [],
        pasos: [],
      },
    });
    creadas++;
    enBBDD.add(k);
  }
  console.log('CREADAS=' + creadas);
  console.log('OMITIDAS_DUP=' + omitidas);
  console.log('EN_BBDD_DESPUES=' + enBBDD.size);

  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR=' + e.message.split('\n')[0]);
  process.exit(1);
});
