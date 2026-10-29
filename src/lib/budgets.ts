import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { budgetAlerts, budgets, categories } from "@/db/schema";
import { monthKey, todayISO } from "./dates";
import { getExpensesForMonth, getSettings } from "./data";
import { formatMoney, sumUSD } from "./money";
import { pushConfigured, sendPushToAll } from "./push";

// Umbrales de aviso, de mayor a menor.
const THRESHOLDS = [100, 80];

/**
 * Tras guardar un gasto: si su categoría pasó el 80 % o el 100 % de su presupuesto este mes
 * (y no se avisó antes), manda una notificación push y devuelve el mensaje para mostrarlo en la app.
 */
export async function checkBudgetAlert(categoryId: number | null, date: string) {
  if (!categoryId) return null;
  const settings = await getSettings();
  const month = monthKey(date);
  if (month !== monthKey(todayISO(settings.timezone))) return null;

  const [row] = await db
    .select({ limit: budgets.amountUsd, name: categories.name, emoji: categories.emoji })
    .from(budgets)
    .innerJoin(categories, eq(categories.id, budgets.categoryId))
    .where(eq(budgets.categoryId, categoryId));
  if (!row || row.limit <= 0) return null;

  const expenses = await getExpensesForMonth(month);
  const spent = sumUSD(
    expenses.filter((e) => e.categoryId === categoryId),
    settings,
  );
  const pct = (spent / row.limit) * 100;
  const threshold = THRESHOLDS.find((t) => pct >= t);
  if (!threshold) return null;

  // El índice único (categoría, mes, umbral) evita avisar dos veces.
  const inserted = await db
    .insert(budgetAlerts)
    .values({ categoryId, month, threshold })
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0) return null;
  // Si salta directo al 100 %, el aviso del 80 % ya no tiene sentido.
  if (threshold === 100) {
    await db.insert(budgetAlerts).values({ categoryId, month, threshold: 80 }).onConflictDoNothing();
  }

  const title =
    threshold === 100
      ? `${row.emoji} Te pasaste del presupuesto de ${row.name}`
      : `${row.emoji} Llevas el ${Math.round(pct)}% de ${row.name}`;
  const body = `Gastado ${formatMoney(spent, "USD")} de ${formatMoney(row.limit, "USD")} este mes.`;
  if (pushConfigured()) {
    await sendPushToAll({ title, body, url: "/presupuestos", tag: `budget-${categoryId}-${month}` }).catch((err) =>
      console.error("push presupuesto", err),
    );
  }
  return `${title}. ${body}`;
}

/** Tras borrar un gasto: los umbrales que ya no se cumplen se pueden volver a avisar. */
export async function resetBudgetAlerts(categoryId: number | null, date: string) {
  if (!categoryId) return;
  const month = monthKey(date);
  const [settings, [budget], expenses] = await Promise.all([
    getSettings(),
    db.select().from(budgets).where(eq(budgets.categoryId, categoryId)),
    getExpensesForMonth(month),
  ]);
  const spent = sumUSD(
    expenses.filter((e) => e.categoryId === categoryId),
    settings,
  );
  const pct = budget && budget.amountUsd > 0 ? (spent / budget.amountUsd) * 100 : 0;
  await db
    .delete(budgetAlerts)
    .where(
      and(
        eq(budgetAlerts.categoryId, categoryId),
        eq(budgetAlerts.month, month),
        gt(budgetAlerts.threshold, Math.floor(pct)),
      ),
    );
}
