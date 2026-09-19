// Todas las recetas importables (unidas las dos partes).
import { RECETAS_A, RecetaImport } from './recetasDataA';
import { RECETAS_B } from './recetasDataB';

export const RECETAS: RecetaImport[] = [...RECETAS_A, ...RECETAS_B];
export type { RecetaImport };