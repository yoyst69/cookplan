require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ficheros con titulos subrayados (1 por linea), latin-1 -> convertido por el script PS
const TXT_A = process.argv[2];
const TXT_B = process.argv[3];
if (!TXT_A || !TXT_B) {
  console.error('ERROR_ARGUMENTOS');
  process.exit(1);
}

function limpia(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function leer(ruta) {
  const s = fs.readFileSync(ruta, 'utf8');
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

(async () => {
  const titA = leer(TXT_A);
  const titB = leer(TXT_B);
  const enBBDD = new Set(
    (await prisma.receta.findMany({ select: { titulo: true } })).map((r) => limpia(r.titulo))
  );
  console.log('BBDD_LOCAL=' + enBBDD.sizekena);
  const vistos = new Set();
  const faltan = [];
  for (const t of [...titA, ...titB]) {
    const k = limpia(t);
    if (!k) continue;
    if (enBBDD.has(k) || vistos.has(k)) continue;
    vistos.add(k);
    faltan.push(t);
  }
  console.log('FALTAN=' + faltan.length);
  for (const t of faltan) console.log('FALTA|' + t);
  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR=' + e.message);
  process.exit(1);
});
