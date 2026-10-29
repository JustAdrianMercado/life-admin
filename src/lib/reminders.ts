import "server-only";
import type { Subscription } from "@/db/schema";
import { addDays, chargeDateIn, formatDate, formatTime, monthKey, relativeDay, todayISO } from "./dates";
import { getChargesForMonths, getEventOccurrences, getOpenTasks, getSettings, getSubscriptions } from "./data";
import { fmt } from "./money";
import { paymentLabel } from "./payment-methods";
import type { PushPayload } from "./push";

/**
 * Resumen del día para la notificación de la mañana:
 * cobros de hoy (sin pagar) y de dentro de N días, eventos de hoy y pendientes que vencen hoy.
 * null si no hay nada que avisar.
 */
export async function buildDailyDigest(): Promise<PushPayload | null> {
  const settings = await getSettings();
  const today = todayISO(settings.timezone);
  const ahead = addDays(today, settings.notifyDaysBefore);
  const [subs, charges, events, openTasks] = await Promise.all([
    getSubscriptions(),
    getChargesForMonths([monthKey(today), monthKey(ahead)]),
    getEventOccurrences(today, today),
    getOpenTasks(),
  ]);

  const paid = new Set(charges.map((c) => `${c.subscriptionId}:${c.periodMonth}`));
  const chargingOn = (date: string) =>
    subs.filter(
      (s) =>
        s.active &&
        chargeDateIn(monthKey(date), s.billingDay) === date &&
        !paid.has(`${s.id}:${monthKey(date)}`),
    );
  const describe = (s: Subscription) =>
    `${s.name} ${fmt(s, settings)}${s.paymentMethod ? ` (${paymentLabel(s.paymentMethod)})` : ""}`;

  const dueToday = chargingOn(today);
  const dueAhead = settings.notifyDaysBefore > 0 ? chargingOn(ahead) : [];
  const tasksToday = openTasks.filter((t) => t.dueDate === today);

  const lines: string[] = [];
  if (dueToday.length) lines.push(`💳 Hoy te cobran: ${dueToday.map(describe).join(", ")}`);
  if (dueAhead.length) {
    const when = relativeDay(ahead, today);
    lines.push(`🔔 ${when.charAt(0).toUpperCase() + when.slice(1)} (${formatDate(ahead)}): ${dueAhead.map(describe).join(", ")}`);
  }
  for (const { event } of events) {
    lines.push(`📅 ${formatTime(event.startTime) ?? "Todo el día"} · ${event.title}`);
  }
  if (tasksToday.length) {
    lines.push(`✅ ${tasksToday.length === 1 ? `Vence hoy: ${tasksToday[0].title}` : `${tasksToday.length} pendientes vencen hoy`}`);
  }
  if (lines.length === 0) return null;

  const names = (list: Subscription[]) => list.map((s) => s.name).join(" y ");
  const verb = (list: Subscription[]) => (list.length > 1 ? "cobran" : "cobra");
  const title = dueToday.length
    ? `Hoy te ${verb(dueToday)} ${names(dueToday)}`
    : dueAhead.length
      ? `${names(dueAhead)} te ${verb(dueAhead)} ${relativeDay(ahead, today)}`
      : "Tu día";
  return { title, body: lines.join("\n"), url: dueToday.length || dueAhead.length ? "/suscripciones" : "/calendario", tag: `digest-${today}` };
}
