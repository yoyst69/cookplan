import multer from 'multer';
import path from 'path';
import { EXTENSIONES_FOTO } from '../services/fotos';

// Subida en memoria: el buffer se procesa despues con sharp (webp)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }, // 12 MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (EXTENSIONES_FOTO.includes(ext)) return cb(null, true);
    return cb(new Error('Formato de imagen no permitido (jpg, png, webp, gif)'));
  },
});

export default upload;