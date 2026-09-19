-- CreateEnum
CREATE TYPE "DiaSemanaTarea" AS ENUM ('SABADO', 'DOMINGO');

-- CreateTable
CREATE TABLE "TareaDomestica" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "peso" INTEGER NOT NULL DEFAULT 1,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TareaDomestica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionTarea" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tareaId" INTEGER NOT NULL,
    "semana" DATE NOT NULL,
    "dia" "DiaSemanaTarea" NOT NULL DEFAULT 'SABADO',
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "generado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsignacionTarea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TareaDomestica_nombre_key" ON "TareaDomestica"("nombre");

-- CreateIndex
CREATE INDEX "AsignacionTarea_semana_idx" ON "AsignacionTarea"("semana");

-- CreateIndex
CREATE INDEX "AsignacionTarea_usuarioId_semana_idx" ON "AsignacionTarea"("usuarioId", "semana");

-- CreateIndex
CREATE UNIQUE INDEX "AsignacionTarea_usuarioId_tareaId_semana_key" ON "AsignacionTarea"("usuarioId", "tareaId", "semana");

-- AddForeignKey
ALTER TABLE "TareaDomestica" ADD CONSTRAINT "TareaDomestica_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionTarea" ADD CONSTRAINT "AsignacionTarea_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionTarea" ADD CONSTRAINT "AsignacionTarea_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "TareaDomestica"("id") ON DELETE CASCADE ON UPDATE CASCADE;