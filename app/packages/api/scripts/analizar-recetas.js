require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DIR = 'C:\\Users\\Fortin69\\AppData\\Local\\Temp\\opencode\\recetas_docx';
const TXT_NEW = path.join(DIR, 'Recetas.Mar.New.txt');
const TXT_ULT = path.join(DIR, 'Recetas.Mar.Ultimo.txt');

function normaliza(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Titulo = linea corta (<=55) que no empieza por guion/viñeta/numero, no contiene "ingredien",
// y en las 6 lineas siguientes aparece la palabra "ingredien".
function titulosDe(txt) {
  const lineas = txt.split(/\r?\n/).map((l) => l.trim());
  const out = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (!l || l.length === 0) continue;
    if (/^[-•*·ºª]/.test(l)) continue;
    if (/^[\d)]/.test(l)) continue;
    if (/ingredien/i.test(l)) continue;
    if (/^(ingredientes|elaboraci)/i.test(l)) continue;
    if (l.length > 55) continue;
    const ventana = lineas.slice(i + 1, i + 7).join(' ');
    if (/ingredien/i.test(ventana)) {
      out.push(l);
    }
  }
  const vistos = new Set();
  return out.filter((t) => {
    const k = normaliza(t);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

(async () => {
  const txtNew = fs.readFileSync(TXT_NEW, 'utf8');
  const txtUlt = fs.readFileSync(TXT_ULT, 'utf8');
  const tNew = titulosDe(txtNew);
  const tUlt = titulosDe(txtUlt);

  console.log('=== TITULOS_DETECTADOS_NEW (' + tNew.length + ') ===');
  tNew.forEach((t) => console.log('  NEW|' + t));
  console.log('=== TITULOS_DETECTADOS_ULTIMO (' + tUlt.length + ') ===');
  tUlt.forEach((t) => console.log('  ULT|' + t));

  const enBBDD = new Set();
  const filas = await prisma.receta.findMany({ select: { titulo: true } });
  filas.forEach((r) => enBBDD.add(normaliza(r.titulo)));
  console.log('=== RECETAS_EN_BBDD_LOCAL=' + filas.length + ' ===');

  const faltantes = [];
  const vistosF = new Set();
  for (const t of [...tNew, ...tUlt]) {
    const k = normaliza(t);
    if (enBBDD.has(k)) { console.log('  YA_ESTA|' + t); continue; }
    if (vistosF.has(k)) continue;
    vistosF.add(k);
    faltantes.push(t);
  }
  console.log('=== FALTANTES (' + faltantes.length + ') ===');
  faltantes.forEach((t) => console.log('  FALTA_INSERTAR|' + t));

  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR: ' + e.message);
  process.exit(1);
});
