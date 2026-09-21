require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const recetas = await prisma.receta.findMany({
    select: { titulo: true, momento: true },
    orderBy: { titulo: 'asc' },
  });
  console.log('TOTAL=' + recetas.length);
  for (const r of recetas) {
    console.log(r.titulo.trim() + ' [' + r.momento + ']');
  }
  await prisma.$disconnect();
})().catch((e) => {
  console.error('ERROR_BBDD: ' + e.message);
  process.exit(1);
});
