import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  esAdmin: boolean;
  confirmado: boolean;
  activo: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: AuthUser;
    }
  }
}

// Valida el Bearer token y carga los datos basicos del usuario.
export async function autenticar(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'cookplan-secreto') as any;
    const userId = Number(payload.sub);
    if (!userId) return res.status(401).json({ error: 'Token inválido' });
    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    if (!user.confirmado) return res.status(403).json({ error: 'Confirma tu correo antes de continuar' });
    if (!user.activo) return res.status(403).json({ error: 'Cuenta desactivada. Contacta con el administrador.' });
    req.usuario = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      esAdmin: user.esAdmin,
      confirmado: user.confirmado,
      activo: user.activo,
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o caducado' });
  }
}

// Requiere que el usuario sea administrador.
export function requiereAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.usuario?.esAdmin) return res.status(403).json({ error: 'Acceso restringido al administrador' });
  next();
}