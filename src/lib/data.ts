import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  accountMovements,
  accounts,
  budgets,
  categories,
  events,
  expenses,
  goalContributions,
  habitChecks,
  habits,
  pushSubscriptions,
  savingsGoals,
  settings as settingsTable,
  subscriptionCharges,
  subscriptions,
  tasks,
  type Settings,
} from "@/db/schema";
import { accountBalances, accountValue, netWorth } from "./accounts";
import { occurrencesIn } from "./calendar";
import { monthRange } from "./dates";

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  if (row) return row;
  const [created] = await db.insert(settingsTable).values({ id: 1 }).returning();
  return created;
}

export function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export function getSubscriptions() {
  return db.select().from(subscriptions).orderBy(asc(subscriptions.billingDay), asc(subscriptions.name));
}

export function getChargesForMonth(month: string) {
  return db.select().from(subscriptionCharges).where(eq(subscriptionCharges.periodMonth, month));
}

export function getChargesForMonths(months: string[]) {
  return db.select().from(subscriptionCharges).where(inArray(subscriptionCharges.periodMonth, months));
}

/** Cada aparición de un evento entre dos fechas (los que se repiten aparecen varias veces). */
export async function getEventOccurrences(start: string, end: string) {
  const rows = await db
    .select()
    .from(events)
    .where(
      or(
        and(eq(events.repeat, "none"), gte(events.date, start), lte(events.date, end)),
        and(ne(events.repeat, "none"), lte(events.date, end)),
      ),
    );
  return rows
    .flatMap((event) => occurrencesIn(event, start, end).map((date) => ({ event, date })))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        // Los de todo el día primero, luego por hora.
        (a.event.startTime ?? "").localeCompare(b.event.startTime ?? ""),
    );
}

export type EventOccurrence = Awaited<ReturnType<typeof getEventOccurrences>>[number];

export function getTasksBetween(start: string, end: string) {
  return db
    .select()
    .from(tasks)
    .where(and(isNotNull(tasks.dueDate), gte(tasks.dueDate, start), lte(tasks.dueDate, end)))
    .orderBy(asc(tasks.dueDate), asc(tasks.dueTime));
}

export function getPushDevices() {
  return db.select().from(pushSubscriptions).orderBy(asc(pushSubscriptions.createdAt));
}

export function getOpenTasks() {
  return db
    .select()
    .from(tasks)
    .where(ne(tasks.status, "hecha"))
    .orderBy(asc(tasks.dueDate), asc(tasks.dueTime));
}

export function getDoneTasks(limit = 20) {
  return db.select().from(tasks).where(eq(tasks.status, "hecha")).orderBy(desc(tasks.completedAt)).limit(limit);
}

export function getExpensesForMonth(month: string) {
  const { start, end } = monthRange(month);
  return db
    .select()
    .from(expenses)
    .where(and(gte(expenses.date, start), lte(expenses.date, end)))
    .orderBy(desc(expenses.date), desc(expenses.id));
}

export async function getGoalsWithProgress(includeArchived = false) {
  const goals = await db
    .select()
    .from(savingsGoals)
    .where(includeArchived ? undefined : eq(savingsGoals.archived, false))
    .orderBy(asc(savingsGoals.createdAt));
  if (goals.length === 0) return [];

  const contributions = await db
    .select()
    .from(goalContributions)
    .where(inArray(goalContributions.goalId, goals.map((g) => g.id)))
    .orderBy(desc(goalContributions.date), desc(goalContributions.id));

  return goals.map((goal) => {
    const own = contributions.filter((c) => c.goalId === goal.id);
    const saved = own.reduce((acc, c) => acc + c.amount, 0);
    return {
      ...goal,
      contributions: own,
      saved,
      remaining: Math.max(goal.targetAmount - saved, 0),
      percent: goal.targetAmount > 0 ? Math.min((saved / goal.targetAmount) * 100, 100) : 0,
    };
  });
}

export type GoalWithProgress = Awaited<ReturnType<typeof getGoalsWithProgress>>[number];

/** Cuentas con su saldo actual (las archivadas también, para mostrar su nombre en gastos viejos). */
export async function getAccountsWithBalances() {
  const [settings, accountRows, movements, paid] = await Promise.all([
    getSettings(),
    db.select().from(accounts).orderBy(asc(accounts.createdAt)),
    db.select().from(accountMovements).orderBy(desc(accountMovements.date), desc(accountMovements.id)),
    db
      .select({
        accountId: expenses.accountId,
        amount: expenses.amount,
        currency: expenses.currency,
        amountLocal: expenses.amountLocal,
      })
      .from(expenses)
      .where(isNotNull(expenses.accountId)),
  ]);
  const balances = accountBalances(accountRows, movements, paid, settings);
  const active = accountRows.filter((a) => !a.archived);
  return {
    accounts: accountRows.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 })),
    movements,
    total: netWorth(active, balances, settings),
  };
}

export function getAccountOptions() {
  return db
    .select({
      id: accounts.id,
      name: accounts.name,
      emoji: accounts.emoji,
      currency: accounts.currency,
      paymentMethod: accounts.paymentMethod,
      archived: accounts.archived,
    })
    .from(accounts)
    .orderBy(asc(accounts.createdAt));
}

/** Lo que se eligió en "Pagado con" en el último gasto (la cuenta si tenía), para preseleccionarlo. */
export async function getLastPaymentChoice() {
  const [last] = await db
    .select({ accountId: expenses.accountId, paymentMethod: expenses.paymentMethod })
    .from(expenses)
    .orderBy(desc(expenses.createdAt))
    .limit(1);
  if (!last) return null;
  return last.accountId ? accountValue(last.accountId) : last.paymentMethod;
}

export function getBudgets() {
  return db.select().from(budgets);
}

export function getHabits() {
  return db
    .select()
    .from(habits)
    .where(eq(habits.archived, false))
    .orderBy(asc(habits.sortOrder), asc(habits.createdAt));
}

export function getHabitChecksSince(start: string) {
  return db.select().from(habitChecks).where(gte(habitChecks.date, start));
}
