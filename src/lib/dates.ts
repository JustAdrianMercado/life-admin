// Fechas como strings ISO "YYYY-MM-DD" para evitar líos de zona horaria.

export function todayISO(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function monthRange(key: string) {
  const [y, m] = key.split("-").map(Number);
  return { start: toISO(y, m, 1), end: toISO(y, m, daysInMonth(y, m)) };
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Fecha de cobro en un mes dado; si el mes es más corto se usa el último día. */
export function chargeDateIn(key: string, billingDay: number) {
  const [y, m] = key.split("-").map(Number);
  return toISO(y, m, Math.min(billingDay, daysInMonth(y, m)));
}

/** Próximo cobro desde hoy (incluye hoy). */
export function nextChargeDate(billingDay: number, today: string) {
  const thisMonth = chargeDateIn(monthKey(today), billingDay);
  return thisMonth >= today ? thisMonth : chargeDateIn(shiftMonth(monthKey(today), 1), billingDay);
}

export function addDays(iso: string, n: number) {
  const { y, m, d } = parts(iso);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  const a = parts(from);
  const b = parts(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  const { y, m, d } = parts(iso);
  return new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...opts,
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function relativeDay(iso: string, today: string) {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  if (diff === -1) return "ayer";
  if (diff < 0) return `hace ${-diff} días`;
  return `en ${diff} días`;
}

export function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : null;
}
