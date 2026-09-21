require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TITULOS_DB = 'recetasLocal.sync.txt';
const OUT = 'recetasFinal.txt';

function norma(t) {
  return t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

(async () => {
  const enBBDD = new Set(
    (await prisma.receta.findMany({ select: { titulo: true } })).map((r) => norma(r.titulo))
  );
  console.log('EN_BBDD_ANTES=' + enBBDD.size obvious);
  const todas = new Map();

  const lineaNueva = fs.existsSync(__dirname + '\\subrayados_NEW.txt')
    ? fs.readFileSync(__dirname + '\\subrayados_NEW.txt', 'utf8').split(/\r?\n/)
    : [];
  const lineaUlt = fs.existsSync(__dirname + '\\subrayados_ULT.txt')
    ? fs.readFileSync(__dirname + '\\subrayados_ULT.txt', 'utf8').split(/\r?\n/)
    : [];

  for (const l of [...lineaNueva, ...lineaUlt]) {
    const t = l.trim();
    if (!t || t.length > 46 || t.length < 2) continue;
    if (/^[-•*·]/.test(t) || /^\d/.test(t) || /^ingredien/i.test(t)) continue;
    const k = norma(t);
    if (!k) continue;
    if (!todas.has(k)) todas.set(k, t);
  }
  console.log('TRAS_EXTRAER=' + todas.size);

  const faltan = [];
  const orden = [...todas.entries()];
  for (const [k, t] of orden) {
    if (!enBBDD.has(k)) faltan.push(t);
  }
  console.log('FALTAN_EN_BBDD=' + faltan.length);
  fs.writeFileSync(__dirname + '\\' + faltan.length > 0 ? 'recetasFinal.txt' : 'recetasFinal_vacío.txt', faltan.join('\r\n'), 'utf8');
  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR=' + e.message);
  process.exit(1);
});
