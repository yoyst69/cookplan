-- CreateEnum
CREATE TYPE "MomentoDia" AS ENUM ('COMIDA', 'CENA', 'AMBAS', 'POSTRE');

-- CreateEnum
CREATE TYPE "OrigenItem" AS ENUM ('MENU', 'MANUAL');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "telefono" TEXT,
    "logo" TEXT,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenConfirmacion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expira" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenConfirmacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenRecuperacion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expira" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRecuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receta" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "momento" "MomentoDia" NOT NULL DEFAULT 'AMBAS',
    "descripcion" TEXT,
    "foto" TEXT,
    "ingredientes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pasos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tiempo" INTEGER,
    "personas" INTEGER,
    "creadorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanMenu" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "comidaId" INTEGER,
    "cenaId" INTEGER,
    "generado" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaCompraItem" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "semana" DATE NOT NULL,
    "producto" TEXT NOT NULL,
    "cantidad" TEXT,
    "origen" "OrigenItem" NOT NULL DEFAULT 'MANUAL',
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListaCompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TokenConfirmacion_token_key" ON "TokenConfirmacion"("token");

-- CreateIndex
CREATE INDEX "TokenConfirmacion_usuarioId_idx" ON "TokenConfirmacion"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenRecuperacion_token_key" ON "TokenRecuperacion"("token");

-- CreateIndex
CREATE INDEX "TokenRecuperacion_usuarioId_idx" ON "TokenRecuperacion"("usuarioId");

-- CreateIndex
CREATE INDEX "Receta_momento_idx" ON "Receta"("momento");

-- CreateIndex
CREATE INDEX "Receta_titulo_idx" ON "Receta"("titulo");

-- CreateIndex
CREATE INDEX "PlanMenu_usuarioId_fecha_idx" ON "PlanMenu"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "PlanMenu_comidaId_idx" ON "PlanMenu"("comidaId");

-- CreateIndex
CREATE INDEX "PlanMenu_cenaId_idx" ON "PlanMenu"("cenaId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanMenu_usuarioId_fecha_key" ON "PlanMenu"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "ListaCompraItem_usuarioId_semana_idx" ON "ListaCompraItem"("usuarioId", "semana");

-- CreateIndex
CREATE UNIQUE INDEX "ListaCompraItem_usuarioId_semana_producto_origen_key" ON "ListaCompraItem"("usuarioId", "semana", "producto", "origen");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracion_clave_key" ON "Configuracion"("clave");

-- AddForeignKey
ALTER TABLE "TokenConfirmacion" ADD CONSTRAINT "TokenConfirmacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenRecuperacion" ADD CONSTRAINT "TokenRecuperacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receta" ADD CONSTRAINT "Receta_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMenu" ADD CONSTRAINT "PlanMenu_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMenu" ADD CONSTRAINT "PlanMenu_comidaId_fkey" FOREIGN KEY ("comidaId") REFERENCES "Receta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMenu" ADD CONSTRAINT "PlanMenu_cenaId_fkey" FOREIGN KEY ("cenaId") REFERENCES "Receta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaCompraItem" ADD CONSTRAINT "ListaCompraItem_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
