require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DIR = 'C:\\Users\\Fortin69\\AppData\\Local\\Temp\\opencode\\recetas_docx';
const TXT_NEW = path.join(DIR, 'Recetas.Mar.New.txt');
const TXT_ULT = path.join(DIR, 'Recetas.Mar.Ultimo.txt');

function limpia(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Titulo real: linea (2..40 chars, sin tab y sin comenzar por guion/bullet/nR"),
// y la SIGUIENTE linea no vacia comienza por "Ingrediente".
function titulos(txt) {
  const ls = txt.split(/\r?\n/).map((l) => l.trim());
  const res = [];
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (!l || l.length < 2 || l.length > 42) continue;
    if (l.includes('\t')) continue;
    if (/^[-•*·]/.test(l)) continue;
    if (/^[\d)]/) continue;
    if (/^ingredien/i.test(l)) continue;
    let sig = '';
    for (let j = i + 1; j < ls.length; j++) {
      if (!ls[j]) continue;
      sig = ls[j];
      break;
    }
    if (/^ingredien/i.test(sig)) res.push(l);
  }
  const vistos = new Set();
  return res.filter((t) => {
    const k = limpia(t).toLowerCase();
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

(async () => {
  const tNew = titulos(fs.readFileSync(TXT_NEW, 'utf8'));
  const tUlt = titulos(fs.readFileSync(TXT_ULT, 'utf8'));

  const enBBDD = new Set();
  for (const r of await prisma.receta.findMany({ select: { titulo: true } })) {
    enBBDD.add(limpia(r.titulo).toLowerCase());
  }

  const todas = new Map(); // clave normalizada -> {txt, origenes}
  for (const t of tNew) todas.set(limpia(t).toLowerCase(), { txt: t, o: ['NEW'] });
  for (const t of tUlt) {
    const k = limpia(t).toLowerCase();
    if (todas.has(k)) todas.get(k).o.push('ULT');
    else todas.set(k, { txt: t, o: ['ULT'] });
  }

  let faltan = 0;
  const lista = [];
  for (const [k, v] of todas) {
    if (enBBDD.has(k)) continue;
    faltan++;
    lista.push(v.txt + '  [' + v.o.join('+') + ']');
  }
  lista.sort();
  console.log('=== TITULOS_CONFIABLES_NEW=' + tNew.length + ' ===');
  console.log('=== TITULOS_CONFIABLES_ULT=' + tUlt.length + ' ===');
  console.log('=== UNION_SIN_DUPLICAR=' + todas.size + ' ===');
  console.log('=== NUEVAS_QUE_FALTAN_EN_BBDD=' + faltan + ' ===');
  console.log('--- LISTADO ---');
  lista.forEach((l) => console.log('NUEVA|' + l));
  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR|' + e.message);
  process.exit(1);
});
