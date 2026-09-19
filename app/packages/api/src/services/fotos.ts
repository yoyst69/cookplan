import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

// Carpeta donde se guardan las fotos webp. Por defecto app\datos\uploads
export function uploadsDir(): string {
  if (process.env.UPLOADS_DIR && process.env.UPLOADS_DIR.trim()) return process.env.UPLOADS_DIR;
  return path.resolve(__dirname, '../../../datos/uploads');
}

export function publicUrlFotos(): string {
  const api = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3004}`).replace(/\/$/, '');
  return `${api}/uploads`;
}

export function asegurarCarpetaUploads(): string {
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function fotoUrl(nombreFichero: string): string {
  return `${publicUrlFotos()}/${nombreFichero}`;
}

// Convierte la imagen subida a WEBP comprimido (max 1400px, calidad 78):
// formato ligero para ocupar poco espacio en la base de datos / disco.
export async function guardarFotoWebp(
  buffer: Buffer,
  extOriginal: string,
  ventana?: string
): Promise<string> {
  const dir = asegurarCarpetaUploads();
  const nombre = `${ventana ? ventana + '-' : ''}${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;
  const ruta = path.join(dir, nombre);
  await sharp(buffer)
    .rotate()
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(ruta);
  return nombre;
}

// Borra un fichero de foto (ignora errores si no existe)
export function borrarFoto(nombreFichero?: string | null): void {
  if (!nombreFichero) return;
  const nombre = path.basename(nombreFichero);
  const ruta = path.join(uploadsDir(), nombre);
  try {
    if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
  } catch (e) {
    // silencio
  }
}

// Lista de extensiones admitidas al subir una imagen
export const EXTENSIONES_FOTO = ['.jpg', '.jpeg', '.png', '.webp', '.gif']; // gif se convierte igualmente a webp