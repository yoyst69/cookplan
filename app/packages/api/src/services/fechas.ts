// Utilidades de fechas en UTC. Prisma serializa los Date a UTC para las columnas
// @db.Date, por lo que todas las fechas se construyen en UTC para evitar desfases
// de zona horaria (el servidor esta en UTC+2; una fecha local midnight se guardaria
// como el dia anterior).
export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y || 0, (m || 1) - 1, d || 1));
}

export function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

// Lunes de la semana de una fecha
export function mondayOf(d: Date): Date {
  const r = new Date(d.getTime());
  const dow = (r.getUTCDay() + 6) % 7; // lunes=0
  r.setUTCDate(r.getUTCDate() - dow);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

// Dias de la semana (lunes a domingo) a partir de una fecha cualquiera
export function diasSemana(d: Date): Date[] {
  const l = mondayOf(d);
  return Array.from({ length: 7 }, (_, i) => addDays(l, i));
}

export function hoy(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}