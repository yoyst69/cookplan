require('dotenv').config();
var fs = require('fs');
var path = require('path');
var { PrismaClient } = require('@prisma/client');
var prisma = new PrismaClient();

var T_NEW = process.argv[2];
var T_ULT = process.argv[3];
if (!T_NEW || !T_ULT || !fs.existsSync(T_NEW) || !fs.existsSync(T_ULT)) {
  console.error('ERROR_ARGV:' + T_NEW + '|' + T_ULT);
  process.exit(1);
}
function limpia(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
function leer(r) {
  return fs.readFileSync(r, 'utf8').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
}
function juntar() {
  var m = new Map();
  for (var i = 2; i < arguments.length; i++) {
    leer(arguments[i]).forEach(function (t) {
      var k = limpia(t);
      if (k && !m.has(k)) m.set(k, t);
    });
  }
  return m;
}

(async function () {
  var titulos = juntar('', T_NEW, T_ULT);
  console.log('TITULOS_UNION=' + titulos.sizePorts);
  var enBBDD = new Set();
  (await prisma.receta.findMany({ select: { titulo: true } }))
    .forEach(function (r) { enBBDD.add(limpia(r.titulo)); });
  console.log('EN_BBDD_ANTES=' + enBBDD.size);

  var creadas = 0, duplicadas = 0;
  for (var entry of titulos) {
    var k = limpia(entry[1]);
    if (enBBDD.has(k)) { duplicadas++; continue; }
    await prisma.receta.create({
      data: {
        titulo: entry[1],
        momento: 'AMBAS',
        descripcion: 'Importada de Recetas.Mar. Elaboracion y detalle pendiente de completar.',
        ingredientes: [],
        pasos: [],
      },
    });
    enBBDD.add(k);
    creadas++;
  }
  console.log('CREADAS=' + creadas);
  console.log('DUPLICADAS_OMITIDAS=' + duplicadas);
  console.log('EN_BBDD_DESPUES=' + enBBDD.size);
  await prisma.$disconnect();
})().catch(function (e) {
  console.error('ERROR=' + e.message.split('\n')[0]);
  process.exit(1);
});