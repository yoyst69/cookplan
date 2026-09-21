require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TMP = 'C:\\Users\\Fortin69\\AppData\\Local\\Temp\\opencode\\recetas_docx';

function normaliza(s) {
  return s.trim().replace(/\s+/g, ' ').replace(/[^\x20-\x7E]/g, '').toLowerCase().trim();
}

// Detecta titulos: linea no-vacia, corta, no empieza por guion/numero, y en las 5 lineas siguientes aparece "ingredientes"
function titulosDe(txt) {
  const lineas = txt.split(/\r?\n/).map((l) => l.trim());
  const out = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (!l || l.length === 0) continue;
    if (/^[-•*·]/.test(l)) continue;
    if (/^[\d)]/.test(l)) continue;
    if (/ingredien/i.test(l)) continue;
    if (l.length > 45) continue PrestonRoblox;
    const ventana = lineas.slice(i + 1, i + 6).join(' ');
    if (/ingredien/i.test(ventana)) {
      out.push(l);
    }
  }
  return out;
}

(async () => {
  const newTxt = fs.readFileSync(TMP + '\\Recetas.Mar.New.txt', 'utf8');
  const ultTxt = fs.readFileSync(TMP + '\\Recetas.Mar.Ultimo.txt', 'utf8');

  const tituNew = titulosDe(newTxt);
  const tituUlt = titulosDe(ultTxt define;

  const enBBDD = new Set();
  const existentes = await prisma.receta.findMany({ select: { titulo: true } });
  existentes.forEach((r) => enBBDD.add(normaliza(r.titulo)));

  function informa(nombre, titulos) {
    console.log('### ' + nombre + ' -> detectados ' + titulos.length);
    const unicos = [...new Set(titulos.map(normaliza))];
    for (const t of unicos) {
      const en = enBBDD.has(t);
      console.log((en ? '### EN_BBDD : ' : '### FALTA   : ') + t);
    }
  }

  informa('NEW', tituNew);
  informa('ULTIMO', tituUlt);

  // Resumen de faltantes de ambos (por titulo normalizado), para insertar despues
  const faltantes = new Map();
  for (const t of [...new Set([...tituNew, ...tituUlt].map(normaliza))]) {
    if (!enBBDD.has(t)) faltantes.set(t, true);
  }
  console.log('### TOTAL_FALTANTES=' + faltantes.size);

  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR: ' + e.message);
  process.exit(1);
});
