-- Notificaciones de tareas domesticas y quien asigno el reparto
ALTER TABLE "AsignacionTarea" ADD COLUMN "asignadaPorId" INTEGER;

ALTER TABLE "AsignacionTarea"
ADD CONSTRAINT "AsignacionTarea_asignadaPorId_fkey"
FOREIGN KEY ("asignadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AsignacionTarea_asignadaPorId_idx" ON "AsignacionTarea"("asignadaPorId");

CREATE TABLE "Notificacion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'TAREA',
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notificacion_usuarioId_leida_idx" ON "Notificacion"("usuarioId", "leida");
CREATE INDEX "Notificacion_usuarioId_createdAt_idx" ON "Notificacion"("usuarioId", "createdAt");

ALTER TABLE "Notificacion"
ADD CONSTRAINT "Notificacion_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;