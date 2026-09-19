import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@cookplan.local';

  const admin = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: { nombre: 'Fiti' },
    create: {
      nombre: 'Fiti',
      email: adminEmail,
      password: await bcrypt.hash('Fiti6969', 12),
      esAdmin: true,
      confirmado: true,
      activo: true,
    },
  });
  console.log('Admin OK (Fiti):', admin.email);

  const mar = await prisma.usuario.upsert({
    where: { email: 'mmarruizg70@gmail.com' },
    update: {},
    create: {
      nombre: 'Mar',
      email: 'mmarruizg70@gmail.com',
      password: await bcrypt.hash('5668', 12),
      esAdmin: false,
      confirmado: true,
      activo: true,
    },
  });
  console.log('Usuario Mar OK:', mar.email);

  const jose = await prisma.usuario.upsert({
    where: { email: 'jose@cookplan.local' },
    update: {},
    create: {
      nombre: 'Jose',
      email: 'jose@cookplan.local',
      password: await bcrypt.hash('5668', 12),
      esAdmin: false,
      confirmado: true,
      activo: true,
    },
  });
  console.log('Usuario Jose OK:', jose.email);

  await prisma.configuracion.upsert({
    where: { clave: 'dias_sin_repetir' },
    update: { valor: '21' },
    create: { clave: 'dias_sin_repetir', valor: '21', descripcion: 'Dias minimos sin repetir un plato en el plan semanal' },
  });

  // Personas a las que se reparten las tareas domesticas del fin de semana
  await prisma.configuracion.upsert({
    where: { clave: 'tareas_personas' },
    update: { valor: [admin.id, mar.id, jose.id].join(',') },
    create: {
      clave: 'tareas_personas',
      valor: [admin.id, mar.id, jose.id].join(','),
      descripcion: 'IDs de los usuarios (Fiti, Mar, Jose) a los que se reparten las tareas domesticas',
    },
  });

  // Catalogo inicial de tareas domesticas (lo puede ampliar cualquier usuario)
  const tareasIniciales: Array<{ nombre: string; peso: number }> = [
    { nombre: 'Pasar la aspiradora', peso: 2 },
    { nombre: 'Barrer y fregar el suelo', peso: 2 },
    { nombre: 'Limpiar el baño', peso: 3 },
    { nombre: 'Fregar los platos', peso: 2 },
    { nombre: 'Poner la lavadora y tender', peso: 1 },
    { nombre: 'Quitar y poner la mesa', peso: 1 },
    { nombre: 'Sacar la basura', peso: 1 },
    { nombre: 'Hacer la compra', peso: 2 },
    { nombre: 'Cocinar el fin de semana', peso: 3 },
    { nombre: 'Planchar', peso: 2 },
    { nombre: 'Limpiar la cocina', peso: 2 },
    { nombre: 'Hacer las camas', peso: 1 },
    { nombre: 'Regar las plantas', peso: 1 },
    { nombre: 'Limpiar cristales y espejos', peso: 2 },
    { nombre: 'Recoger los cuartos', peso: 1 },
  ];
  for (const t of tareasIniciales) {
    await prisma.tareaDomestica.upsert({
      where: { nombre: t.nombre },
      update: { peso: t.peso, activa: true },
      create: { nombre: t.nombre, peso: t.peso, activa: true },
    });
  }
  console.log('Configuracion y catalogos OK');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());