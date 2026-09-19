-- Add a unique constraint on usuarioId for token models (one active token per user).
DROP INDEX "TokenConfirmacion_usuarioId_idx";
DROP INDEX "TokenRecuperacion_usuarioId_idx";
CREATE UNIQUE INDEX "TokenConfirmacion_usuarioId_key" ON "TokenConfirmacion"("usuarioId");
CREATE UNIQUE INDEX "TokenRecuperacion_usuarioId_key" ON "TokenRecuperacion"("usuarioId");