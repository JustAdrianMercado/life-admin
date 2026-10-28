"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { expenses, subscriptionCharges } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { optInt, payment, str } from "@/lib/form";

export async function saveExpense(fd: FormData) {
  await requireAuth();
  const values = {
    description: str(fd, "description"),
    ...payment(fd),
    date: str(fd, "date"),
    categoryId: optInt(fd, "categoryId"),
  };
  if (!values.description || !values.date) return;
  const id = optInt(fd, "id");
  if (id) await db.update(expenses).set(values).where(eq(expenses.id, id));
  else await db.insert(expenses).values(values);
  revalidatePath("/", "layout");
}

export async function deleteExpense(id: number) {
  await requireAuth();
  // Si el gasto venía de una suscripción, el mes vuelve a quedar como "por pagar".
  await db.delete(subscriptionCharges).where(eq(subscriptionCharges.expenseId, id));
  await db.delete(expenses).where(eq(expenses.id, id));
  revalidatePath("/", "layout");
}
