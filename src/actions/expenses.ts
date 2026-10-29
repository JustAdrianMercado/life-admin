"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories, expenses, subscriptionCharges } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { checkBudgetAlert, resetBudgetAlerts } from "@/lib/budgets";
import { optInt, str } from "@/lib/form";
import { readPayment } from "@/lib/payments";

export async function saveExpense(fd: FormData) {
  await requireAuth();
  const { values: paid } = await readPayment(fd);
  const values = {
    description: str(fd, "description"),
    ...paid,
    date: str(fd, "date"),
    categoryId: optInt(fd, "categoryId"),
  };
  if (!values.description || !values.date) return;
  const id = optInt(fd, "id");
  if (id) await db.update(expenses).set(values).where(eq(expenses.id, id));
  else await db.insert(expenses).values(values);
  await checkBudgetAlert(values.categoryId, values.date);
  revalidatePath("/", "layout");
}

/**
 * Gasto desde el botón +: la descripción es opcional (se usa la categoría) y la fecha viene de Hoy/Ayer/Otra.
 * Devuelve el id (para "Deshacer") y el aviso de presupuesto si lo hubo.
 */
export async function quickAddExpense(fd: FormData) {
  await requireAuth();
  const { values: paid } = await readPayment(fd);
  const categoryId = optInt(fd, "categoryId");
  const date = str(fd, "date") === "otra" ? str(fd, "otherDate") : str(fd, "date");
  let description = str(fd, "description");
  if (!description && categoryId) {
    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));
    description = category?.name ?? "";
  }
  if (!date || !(paid.amount > 0)) return { id: null, alert: null };

  const [expense] = await db
    .insert(expenses)
    .values({ ...paid, description: description || "Gasto", date, categoryId })
    .returning();
  const alert = await checkBudgetAlert(categoryId, date);
  revalidatePath("/", "layout");
  return { id: expense.id, alert };
}

export async function deleteExpense(id: number) {
  await requireAuth();
  // Si el gasto venía de una suscripción, el mes vuelve a quedar como "por pagar".
  await db.delete(subscriptionCharges).where(eq(subscriptionCharges.expenseId, id));
  const [deleted] = await db.delete(expenses).where(eq(expenses.id, id)).returning();
  if (deleted) await resetBudgetAlerts(deleted.categoryId, deleted.date);
  revalidatePath("/", "layout");
}
