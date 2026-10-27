import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  expenses,
  goalContributions,
  savingsGoals,
  settings as settingsTable,
  subscriptionCharges,
  subscriptions,
  tasks,
  type Settings,
} from "@/db/schema";
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
