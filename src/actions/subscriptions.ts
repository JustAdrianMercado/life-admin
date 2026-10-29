"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { expenses, subscriptionCharges, subscriptions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { chargeDateIn } from "@/lib/dates";
import { checkBudgetAlert } from "@/lib/budgets";
import { currency, num, optInt, optStr, str } from "@/lib/form";
import { readPayment } from "@/lib/payments";

export async function saveSubscription(fd: FormData) {
  await requireAuth();
  const values = {
    name: str(fd, "name"),
    amount: num(fd, "amount"),
    currency: currency(fd),
    billingDay: Math.min(Math.max(optInt(fd, "billingDay") ?? 1, 1), 31),
    categoryId: optInt(fd, "categoryId"),
    paymentMethod: optStr(fd, "paymentMethod"),
    notes: optStr(fd, "notes"),
    active: fd.get("active") !== "off",
  };
  if (!values.name) return;
  const id = optInt(fd, "id");
  if (id) await db.update(subscriptions).set(values).where(eq(subscriptions.id, id));
  else await db.insert(subscriptions).values(values);
  revalidatePath("/", "layout");
}

export async function deleteSubscription(id: number) {
  await requireAuth();
  await db.delete(subscriptions).where(eq(subscriptions.id, id));
  revalidatePath("/", "layout");
}

/** Marca el cobro del mes como pagado y lo registra como gasto, con lo que realmente se cobró. */
export async function markSubscriptionPaid(id: number, month: string, fd: FormData) {
  await requireAuth();
  const { values: paid, chosen } = await readPayment(fd);
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
  if (!sub) return;
  const [existing] = await db
    .select()
    .from(subscriptionCharges)
    .where(and(eq(subscriptionCharges.subscriptionId, id), eq(subscriptionCharges.periodMonth, month)));
  if (existing) return;

  const [expense] = await db
    .insert(expenses)
    .values({
      description: sub.name,
      ...paid,
      date: chargeDateIn(month, sub.billingDay),
      categoryId: sub.categoryId,
      subscriptionId: sub.id,
    })
    .returning();
  await db.insert(subscriptionCharges).values({ subscriptionId: id, periodMonth: month, expenseId: expense.id });
  // Recordar el medio de pago (o la cuenta) para el próximo mes.
  if (!sub.paymentMethod && chosen) {
    await db.update(subscriptions).set({ paymentMethod: chosen }).where(eq(subscriptions.id, id));
  }
  await checkBudgetAlert(sub.categoryId, expense.date);
  revalidatePath("/", "layout");
}

export async function unmarkSubscriptionPaid(id: number, month: string) {
  await requireAuth();
  const [charge] = await db
    .delete(subscriptionCharges)
    .where(and(eq(subscriptionCharges.subscriptionId, id), eq(subscriptionCharges.periodMonth, month)))
    .returning();
  if (charge?.expenseId) await db.delete(expenses).where(eq(expenses.id, charge.expenseId));
  revalidatePath("/", "layout");
}
