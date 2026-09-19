import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { autenticar, requiereAdmin } from '../middleware/auth';
import { mapUsuario } from './auth';

const router = Router();

router.use(autenticar);
router.use(requiereAdmin);

// LISTADO de usuarios (admin)
router.get('/', async (_req, res) => {
  try {
    const users = await prisma.usuario.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ usuarios: users.map(mapUsuario) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ALTA de usuario (admin); si se envia password se crea directo, si no queda activo y sin confirmar
router.post('/', async (req, res) => {
  try {
    const { nombre, email, password, esAdmin, telefono } = req.body ?? {};
    if (!nombre || !email) return res.status(400).json({ error: 'Faltan nombre y email' });
    const e = String(email).toLowerCase();
    const existing = await prisma.usuario.findUnique({ where: { email: e } });
    if (existing) return res.status(409).json({ error: 'Ese correo ya está registrado' });
    const hash = password ? await bcrypt.hash(password, 12) : await bcrypt.hash(crypto(), 12);
    const user = await prisma.usuario.create({
      data: {
        nombre: String(nombre).trim(),
        email: e,
        password: hash,
        telefono: telefono ? String(telefono) : null,
        esAdmin: !!esAdmin,
        confirmado: !!password, // si el admin le pone contrasena, queda confirmado
        activo: true,
      },
    });
    res.status(201).json({ usuario: mapUsuario(user) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

function crypto(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// EDITAR / ALTA-BAJA / reset de contrasena (admin)
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const data: any = {};
    if (typeof body.nombre === 'string' && body.nombre.trim()) data.nombre = body.nombre.trim();
    if (typeof body.telefono === 'string') data.telefono = body.telefono.trim() || null;
    if (typeof body.email === 'string' && body.email.trim()) data.email = body.email.trim().toLowerCase();
    if (typeof body.esAdmin === 'boolean') data.esAdmin = body.esAdmin;
    if (typeof body.activo === 'boolean') data.activo = body.activo;
    if (typeof body.confirmado === 'boolean') data.confirmado = body.confirmado;
    if (typeof body.password === 'string' && body.password.length >= 6) {
      data.password = await bcrypt.hash(body.password, 12);
    }
    const user = await prisma.usuario.update({ where: { id }, data });
    res.json({ usuario: mapUsuario(user) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// BAJA LOGICA de usuario (admin): deja de poder entrar, conserva datos/historial
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.usuario!.id) return res.status(400).json({ error: 'No puedes darte de baja a ti mismo' });
    const user = await prisma.usuario.update({ where: { id }, data: { activo: false } });
    res.json({ usuario: mapUsuario(user) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

export default router;