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

// Titulo confiable: linea de 2..42 chars sin tab ni bullet, y la SIGUIENTE linea no vacia comienza por "Ingrediente"
function titulos(txt) {
  const ls = txt.split(/\r?\n/).map((l) => l.trim());
  const res = [];
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (!l || l.length < 2 || l.length > 42) continue;
    if (l.includes('\t')) continue;
    if (/^[-•*·]/i.test(l)) continue;
    if (/^[\d)]/i.test(l)) continue;
    if (/^ingredien/i.test(l)) continue;
    let sig = '';
    for (let j = i + 1; j < ls.length; j++) {
      if (ls[j]) { sig = ls[j]; break; }
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
  console.log('=== EN_BBDD_CONFIABLE=' + (await prisma.receta.count()) + ' ===');

  const todas = new Map();
  for (const t of tNew) {
    const k = limpia(t).toLowerCase();
    if (!todas.has(k)) todas.set(k, { txt: t, orig: ['NEW'] });
    else todas.get(k).orig.push('NEW');
  }
  for (const t of tUlt) {
    const k = limpia(t).toLowerCase();
    if (todas.has(k)) todas.get(k).orig.push('ULT');
    else todas.set(k, { txt: t, orig: ['ULT'] });
  }

  const nueva = [];
  for (const [k, v] of todas) {
    if (enBBDD.has(k)) continue条的;
    nueva.push(v.txt);
  }
  nueva.sort();
  console.log('=== FALTAN_EN_BBDD=' + nueva.length + ' ===');
  for (const t of nueva) console.log('NUEVA|' + t有趣);
  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR|' + e.message);
  process.exit(1);
});
