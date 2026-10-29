import { startOfWeek } from "./calendar";
import { addDays } from "./dates";

export const HEATMAP_WEEKS = 12;
// Cuántos días hacia atrás se leen para calcular rachas largas.
export const HISTORY_DAYS = 400;

export function isDaily(targetPerWeek: number) {
  return targetPerWeek >= 7;
}

export function targetLabel(targetPerWeek: number) {
  return isDaily(targetPerWeek) ? "Todos los días" : `${targetPerWeek} ${targetPerWeek === 1 ? "vez" : "veces"} por semana`;
}

/** Veces marcadas en la semana (lunes a domingo) de una fecha. */
export function countInWeek(checks: Set<string>, date: string) {
  const start = startOfWeek(date);
  let n = 0;
  for (let i = 0; i < 7; i++) if (checks.has(addDays(start, i))) n++;
  return n;
}

/**
 * Racha actual. Diario: días seguidos. "N por semana": semanas seguidas cumpliendo la meta.
 * Hoy (o esta semana) todavía no rompe la racha si no se marcó: termina cuando acaba el día/la semana.
 */
export function habitStreak(checks: Set<string>, targetPerWeek: number, today: string) {
  let count = 0;
  if (isDaily(targetPerWeek)) {
    let d = checks.has(today) ? today : addDays(today, -1);
    while (checks.has(d)) {
      count++;
      d = addDays(d, -1);
    }
    return { count, unit: count === 1 ? "día" : "días" };
  }
  let week = startOfWeek(today);
  if (countInWeek(checks, week) >= targetPerWeek) count++;
  week = addDays(week, -7);
  while (countInWeek(checks, week) >= targetPerWeek) {
    count++;
    week = addDays(week, -7);
  }
  return { count, unit: count === 1 ? "semana" : "semanas" };
}

/** Mensaje de hito cuando la racha llega a 7/30/100 días o 4/12/52 semanas. */
export function milestone(streak: { count: number; unit: string }) {
  const days = [7, 30, 100, 365];
  const weeks = [4, 12, 26, 52];
  const hit = streak.unit.startsWith("d") ? days.includes(streak.count) : weeks.includes(streak.count);
  return hit ? `🎉 ¡${streak.count} ${streak.unit} seguidos!` : null;
}

/** Columnas del mapa de calor: una por semana (lunes a domingo), terminando en la semana de hoy. */
export function heatmapWeeks(today: string, weeks = HEATMAP_WEEKS) {
  const first = addDays(startOfWeek(today), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
}
