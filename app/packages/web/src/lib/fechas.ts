export function isoToday(): string {
  const d = new Date();
  return iso(d);
}

export function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

export function addDaysIso(s: string, n: number): string {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function mondayOf(s: string): string {
  const d = parseIso(s);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return iso(d);
}

export function diasSemana(semana: string): string[] {
  const l = mondayOf(semana);
  return Array.from({ length: 7 }, (_, i) => addDaysIso(l, i));
}

export const NOMBRES_DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function nombreDia(s: string): string {
  return NOMBRES_DIA[(parseIso(s).getDay() + 6) % 7];
}

export function formatearFechaLarga(s: string): string {
  const d = parseIso(s);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}