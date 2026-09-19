// Importa las recetas de Recetas.Mar.docx al usuario Mar (mmarruizg70@gmail.com).
// Uso: npx ts-node scripts/import-recetas.ts
// Idempotente: no duplica recetas con el mismo titulo.
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { RECETAS } from './recetasData';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const emailMar = 'mmarruizg70@gmail.com';
  const mar = await prisma.usuario.findUnique({ where: { email: emailMar } });
  if (!mar) {
    console.error('No existe el usuario Mar:', emailMar);
    process.exit(1);
  }

  const existentes = await prisma.receta.findMany({ select: { titulo: true } });
  const titulos = new Set(existentes.map((r) => r.titulo.trim().toLowerCase()));

  let creadas = 0;
  let omitidas = 0;
  for (const r of RECETAS) {
    const clave = r.titulo.trim().toLowerCase();
    if (titulos.has(clave)) {
      omitidas++;
      continue;
    }
    await prisma.receta.create({
      data: {
        titulo: r.titulo.trim(),
        momento: r.momento,
        descripcion: r.descripcion || null,
        tiempo: r.tiempo ?? null,
        personas: r.personas ?? null,
        ingredientes: r.ingredientes,
        pasos: r.pasos,
        creadorId: mar.id,
      },
    });
    titulos.add(clave);
    creadas++;
  }

  console.log(`Recetas importadas: ${creadas} (omitidas por duplicado: ${omitidas})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());