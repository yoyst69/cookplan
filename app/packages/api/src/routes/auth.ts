import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma';
import { autenticar } from '../middleware/auth';
import upload from '../middleware/upload';
import {
  enviarCorreoConfirmacion,
  notificarAdminNuevoUsuario,
  enviarCorreoRecuperacion,
  appUrl,
} from '../services/email';
import { guardarFotoWebp, fotoUrl, borrarFoto } from '../services/fotos';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mapUsuario(u: any) {
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    telefono: u.telefono || null,
    logo: u.logo ? fotoUrl(u.logo) : null,
    confirmado: u.confirmado,
    activo: u.activo,
    esAdmin: u.esAdmin,
    createdAt: u.createdAt,
  };
}

// REGISTRO — crea el usuario pendiente de confirmar el correo (envia el enlace)
router.post('/register', async (req, res) => {
  const { email, password, nombre } = req.body ?? {};
  if (!email || !password || !nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, email, password)' });
  }
  if (!EMAIL_RE.test(String(email))) return res.status(400).json({ error: 'El correo no tiene un formato válido' });
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  try {
    const existing = await prisma.usuario.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Ese correo ya está registrado' });
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.usuario.create({
      data: {
        email: String(email).toLowerCase(),
        password: hash,
        nombre: String(nombre).trim(),
        confirmado: false,
        activo: true,
      },
    });

    const token = crypto.randomBytes(24).toString('hex');
    await prisma.tokenConfirmacion.upsert({
      where: { usuarioId: user.id },
      create: { usuarioId: user.id, token, expira: new Date(Date.now() + 48 * 3600 * 1000) },
      update: { token, expira: new Date(Date.now() + 48 * 3600 * 1000) },
    });
    const enlace = `${appUrl()}/confirmar/${token}`;
    try {
      await enviarCorreoConfirmacion(user.email, enlace);
    } catch (e: any) {
      console.error('Error enviando correo de confirmación:', e?.message || e);
      return res.status(500).json({ error: 'No se pudo enviar el correo de confirmación. Inténtalo de nuevo.' });
    }
    await notificarAdminNuevoUsuario({ email: user.email, nombre: user.nombre }).catch((e) =>
      console.error('Error avisando al admin:', e)
    );
    res.status(201).json({ mensaje: 'Registro completado. Revisa tu correo para confirmar la cuenta.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// REENVIAR correo de confirmacion
router.post('/reenviar', async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || !EMAIL_RE.test(String(email))) return res.status(400).json({ error: 'Introduce un correo válido' });
  try {
    const user = await prisma.usuario.findUnique({ where: { email: String(email).toLowerCase() } });
    if (!user) return res.status(404).json({ error: 'No existe ninguna cuenta con ese correo' });
    if (user.confirmado) return res.status(400).json({ error: 'Esa cuenta ya está confirmada' });
    const token = crypto.randomBytes(24).toString('hex');
    await prisma.tokenConfirmacion.upsert({
      where: { usuarioId: user.id },
      create: { usuarioId: user.id, token, expira: new Date(Date.now() + 48 * 3600 * 1000) },
      update: { token, expira: new Date(Date.now() + 48 * 3600 * 1000) },
    });
    const enlace = `${appUrl()}/confirmar/${token}`;
    try {
      await enviarCorreoConfirmacion(user.email, enlace);
    } catch (e) {
      console.error('Error reenviando correo:', e);
      return res.status(500).json({ error: 'No se pudo reenviar el correo. Inténtalo de nuevo.' });
    }
    res.json({ mensaje: 'Correo reenviado. Revisa tu bandeja de entrada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// CONFIRMAR correo — activa la cuenta con el token del enlace
router.post('/confirmar', async (req, res) => {
  const { token } = req.body ?? {};
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token requerido' });
  try {
    const found = await prisma.tokenConfirmacion.findUnique({ where: { token } });
    if (!found || found.expira < new Date()) return res.status(400).json({ error: 'Enlace de confirmación inválido o caducado' });
    await prisma.usuario.update({ where: { id: found.usuarioId }, data: { confirmado: true } });
    await prisma.tokenConfirmacion.delete({ where: { id: found.id } });
    res.json({ mensaje: 'Correo confirmado. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// LOGIN — por email
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const identificador = (email || '').trim().toLowerCase();
  if (!identificador || !password) return res.status(400).json({ error: 'Faltan usuario o contraseña' });
  try {
    const user = await prisma.usuario.findUnique({ where: { email: identificador } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });
    if (!user.confirmado) return res.status(401).json({ error: 'Confirma tu correo antes de entrar' });
    if (!user.activo) return res.status(401).json({ error: 'Cuenta desactivada. Contacta con el administrador.' });
    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET || 'cookplan-secreto', {
      expiresIn: '7d',
    });
    res.json({ usuario: mapUsuario(user), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// USUARIO ACTUAL
router.get('/me', autenticar, async (req, res) => {
  try {
    const user = await prisma.usuario.findUnique({ where: { id: req.usuario!.id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ usuario: mapUsuario(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /me — actualiza perfil (nombre, email, telefono, password, logo opcional con multipart)
router.patch('/me', autenticar, upload.single('logo'), async (req, res) => {
  try {
    const userId = req.usuario!.id;
    const body = req.body ?? {};
    const data: any = {};
    if (typeof body.nombre === 'string' && body.nombre.trim().length > 0) data.nombre = body.nombre.trim();
    if (typeof body.telefono === 'string') data.telefono = body.telefono.trim() || null;

    if (typeof body.email === 'string' && body.email.trim().length > 0) {
      const e = body.email.trim().toLowerCase();
      if (!EMAIL_RE.test(e)) return res.status(400).json({ error: 'El correo no tiene un formato válido' });
      const existing = await prisma.usuario.findFirst({ where: { email: e, id: { not: userId } } });
      if (existing) return res.status(409).json({ error: 'Ese correo ya está registrado' });
      data.email = e;
    }
    if (typeof body.password === 'string' && body.password.trim().length > 0) {
      if (body.password.length < 6) {
        return res.status(400).json({ error: 'La contrase�a debe tener al menos 6 caracteres' });
      }
      data.password = await bcrypt.hash(body.password, 12);
    }
    if (req.file) {
      const nombre = await guardarFotoWebp(req.file.buffer, req.file.originalname, 'logo');
      borrarFoto(req.usuario && (await prisma.usuario.findUnique({ where: { id: userId } }))?.logo);
      data.logo = nombre;
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    const user = await prisma.usuario.update({ where: { id: userId }, data });
    res.json({ usuario: mapUsuario(user) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// RECUPERAR — solicita un token de reset y envia el enlace
router.post('/recuperar', async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || !EMAIL_RE.test(String(email))) return res.status(400).json({ error: 'Introduce un correo válido' });
  try {
    const user = await prisma.usuario.findUnique({ where: { email: String(email).toLowerCase() } });
    if (user) {
      const token = crypto.randomBytes(24).toString('hex');
      await prisma.tokenRecuperacion.upsert({
        where: { usuarioId: user.id },
        create: { usuarioId: user.id, token, expira: new Date(Date.now() + 3600 * 1000) },
        update: { token, expira: new Date(Date.now() + 3600 * 1000) },
      });
      const enlace = `${appUrl()}/reset?token=${token}`;
      try {
        await enviarCorreoRecuperacion(user.email, enlace);
      } catch (e) {
        console.error('Error enviando correo de recuperación:', e);
        return res.status(500).json({ error: 'No se pudo enviar el correo de recuperación' });
      }
    }
    res.json({ mensaje: 'Si el correo existe, te hemos enviado un enlace de recuperación.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RESET — cambia la contrasena con un token valido
router.post('/reset', async (req, res) => {
  const { token, password } = req.body ?? {};
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token requerido' });
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  try {
    const found = await prisma.tokenRecuperacion.findUnique({ where: { token } });
    if (!found || found.expira < new Date()) return res.status(400).json({ error: 'Enlace de recuperación inválido o caducado' });
    const hash = await bcrypt.hash(password, 12);
    await prisma.usuario.update({ where: { id: found.usuarioId }, data: { password: hash } });
    await prisma.tokenRecuperacion.delete({ where: { id: found.id } });
    res.json({ mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;