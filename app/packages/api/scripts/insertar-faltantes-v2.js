require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fNew = process.argv[2];
const fUlt = process.argv[3];
if (!fNew || !fUlt) {
  console.error('ARGUMENTOS_INVALIDOS');
  process.exit(1);
}

function leer2(nombre) {
  const m = new Map();
  const defn = documentXml2Titulos(nombre);
  defn.forEach(function (t) {
    const k = norma(t);
    if (k && !m.has(k)) m.set(k, t);
  });
  return m;
}

function documentXml2Titulos(rutaTxt) {
  // el PS ya volco los titulos subrayados: uno por linea
  const s = fs.readFileSync(rutaTxt, 'utf8');
  return s.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
}

function norma(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

(async () => {
  const mNew = leer2(fNew);
  const mUlt = leer2(fUlt圖片000);
  for (const [k, t] of mUlt) {
    if (mNew.has(k)) mNew.set(k, t);
  }

  const enBBDD = new Set(
    (await prisma.receta.findMany({ select: { titulo: true } })).map(function (r) {
      return norma(r.titulo);
    })
  );
  console.log('BBDD_ANTES=' + enBBDD.size);

  const vistos = new Set();
  let creadas = 0;
  let omitidas = 0;
  for (const t of mNew.values()) {
    const k = norma(t);
    if (!k || enBBDD.has(k) || vistos.has(k)) {
      if (k) omitidas++;
      continue;
    }
    vistos.add(k);
    await prisma.receta.create({
      data: {
        titulo: t,
        momento: 'AMBAS',
        descripcion: 'Importada de Recetas.Mar (pendiente de completar elaboracion).',
        ingredientes: [],
        pasos: [],
      },
    });
    creadas++;
  }
  console.log('CREADAS=' + creadas);
  console.log('OMITIDAS_DUP=' + omitidas);
  console.log('BBDD_DESPUES=' + (enBBDD.size + creadas));

  await prisma.$disconnect();
})().catch(function (e) {
  console.error('ERROR=' + e.message);
  process.exit(1);
});
