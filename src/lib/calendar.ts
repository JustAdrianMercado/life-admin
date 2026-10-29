import type { CalendarEvent, EventRepeat } from "@/db/schema";
import { addDays, chargeDateIn, daysBetween, daysInMonth, monthKey, shiftMonth } from "./dates";

export const repeatLabel: Record<EventRepeat, string> = {
  none: "No se repite",
  weekly: "Cada semana",
  monthly: "Cada mes",
  yearly: "Cada año",
};

/** Fechas (YYYY-MM-DD) en que ocurre un evento dentro de [start, end]. */
export function occurrencesIn(event: Pick<CalendarEvent, "date" | "repeat">, start: string, end: string) {
  const first = event.date;
  if (first > end) return [];
  const from = first > start ? first : start;
  const dates: string[] = [];

  if (event.repeat === "weekly") {
    let d = addDays(first, Math.ceil(daysBetween(first, from) / 7) * 7);
    for (; d <= end; d = addDays(d, 7)) dates.push(d);
  } else if (event.repeat === "monthly") {
    // Igual que los cobros: el día 31 cae el último día en los meses más cortos.
    const day = Number(first.slice(8, 10));
    for (let m = monthKey(from); m <= monthKey(end); m = shiftMonth(m, 1)) dates.push(chargeDateIn(m, day));
  } else if (event.repeat === "yearly") {
    const [, month, day] = first.split("-").map(Number);
    for (let y = Number(from.slice(0, 4)); y <= Number(end.slice(0, 4)); y++) {
      const mm = String(month).padStart(2, "0");
      const dd = String(Math.min(day, daysInMonth(y, month))).padStart(2, "0");
      dates.push(`${y}-${mm}-${dd}`);
    }
  } else {
    dates.push(first);
  }

  return dates.filter((d) => d >= from && d <= end);
}

/** Lunes de la semana de una fecha. */
export function startOfWeek(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDays(iso, -weekday);
}

/** Días de la grilla de un mes: de lunes a domingo, completando con días de los meses vecinos. */
export function monthGrid(month: string) {
  const first = `${month}-01`;
  const last = chargeDateIn(month, 31);
  const start = startOfWeek(first);
  const end = addDays(startOfWeek(last), 6);
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return { start, end, days };
}

export function isUrl(text: string) {
  return /^https?:\/\//i.test(text);
}
