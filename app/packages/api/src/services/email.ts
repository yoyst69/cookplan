// Envio de correos (SMTP via nodemailer). Si no hay SMTP configurado
// (SMTP_HOST), los enlaces/mensajes se muestran en la consola del servidor
// para poder probar en desarrollo.
import nodemailer from 'nodemailer';

export function adminEmail(): string {
  return process.env.ADMIN_EMAIL || 'jomafosa69@gmail.com';
}

export function appUrl(): string {
  return (process.env.APP_URL || 'http://localhost:5176').replace(/\/$/, '');
}

function transporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  const config: any = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
  };
  if (process.env.SMTP_USER) {
    config.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  }
  return nodemailer.createTransport(config);
}

async function enviar(opts: { to: string; subject: string; text: string; html: string }): Promise<void> {
  const t = transporter();
  if (!t) {
    console.log(`[email] Sin SMTP configurado. Correo a ${opts.to} — Asunto: ${opts.subject}\n${opts.text}`);
    return;
  }
  const f = process.env.SMTP_FROM || 'CookPlan <no-reply@cookplan.local>';
  await t.sendMail({ from: f, to: opts.to, subject: opts.subject, text: opts.text, html: opts.html });
}

export async function enviarCorreoConfirmacion(destinatario: string, enlace: string): Promise<void> {
  await enviar({
    to: destinatario,
    subject: 'CookPlan — Confirma tu correo',
    text: `Haz clic en este enlace para confirmar tu correo y activar tu cuenta:\n\n${enlace}`,
    html: `<p>Haz clic en el siguiente enlace para confirmar tu correo y activar tu cuenta:</p><p><a href="${enlace}">Confirmar correo</a></p>`,
  });
}

export async function notificarAdminNuevoUsuario(usuario: { email: string; nombre?: string }): Promise<void> {
  const nombre = usuario.nombre ? ` (${usuario.nombre})` : '';
  await enviar({
    to: adminEmail(),
    subject: 'CookPlan — Nuevo usuario pendiente de confirmar',
    text: `Se ha registrado un nuevo usuario:\n\nCorreo: ${usuario.email}${nombre}`,
    html: `<p>Se ha registrado un nuevo usuario:</p><p><strong>Correo:</strong> ${usuario.email}${nombre}</p>`,
  });
}

export async function enviarCorreoRecuperacion(destinatario: string, enlace: string): Promise<void> {
  await enviar({
    to: destinatario,
    subject: 'CookPlan — Recupera tu contraseña',
    text: `Has solicitado restablecer tu contraseña en CookPlan. Haz clic en el siguiente enlace (válido 1 hora):\n\n${enlace}\n\nSi no fuiste tú, ignora este mensaje.`,
    html: `<p>Has solicitado restablecer tu contraseña en <strong>CookPlan</strong>.</p><p><a href="${enlace}">Restablecer contraseña</a></p><p>Este enlace caduca en 1 hora. Si no fuiste tú, ignora este mensaje.</p>`,
  });
}