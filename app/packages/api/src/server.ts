import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import auth from './routes/auth';
import usuarios from './routes/usuarios';
import recetas from './routes/recetas';
import plan from './routes/plan';
import listaCompra from './routes/lista';
import tareas from './routes/tareas';
import notificaciones from './routes/notificaciones';
import { uploadsDir } from './services/fotos';

const app = express();
const PORT = Number(process.env.PORT || 3004);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Fotos recetas/logos servidas desde /uploads
app.use('/uploads', express.static(path.resolve(uploadsDir()), { maxAge: '7d' }));

// Rate limit en las rutas de auth
const limAuth = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', limAuth);

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'CookPlan', hora: new Date().toISOString() }));

app.use('/api/auth', auth);
app.use('/api/usuarios', usuarios);
app.use('/api/recetas', recetas);
app.use('/api/plan', plan);
app.use('/api/lista-compra', listaCompra);
app.use('/api/tareas', tareas);
app.use('/api/notificaciones', notificaciones);

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const msg = err?.message || 'Error interno';
  // errores de multer (LIMIT_FILE_SIZE, fichero no permitido...) -> 400
  if (err && typeof err.code === 'string' && err.code.startsWith('LIMIT_')) {
    return res.status(400).json({ error: msg });
  }
  if (msg.includes('Formato de imagen no permitido')) return res.status(400).json({ error: msg });
  console.error(err);
  res.status(500).json({ error: msg });
});

app.listen(PORT, () => {
  console.log(`CookPlan API escuchando en http://localhost:${PORT}`);
  console.log(`Fotos en: ${uploadsDir()}`);
});