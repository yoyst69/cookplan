// Utilidades de fechas locales (evita problemas de zona horaria/ZULU con @db.Date)
export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Lunes de la semana de una fecha
export function mondayOf(d: Date): Date {
  const r = new Date(d);
  const dow = (r.getDay() + 6) % 7; // lunes=0
  r.setDate(r.getDate() - dow);
  r.setHours(0, 0, 0, 0);
  return r;
}

// Dias de la semana (lunes a domingo) a partir de una fecha cualquiera
export function diasSemana(d: Date): Date[] {
  const l = mondayOf(d);
  return Array.from({ length: 7 }, (_, i) => addDays(l, i));
}

export function hoy(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}