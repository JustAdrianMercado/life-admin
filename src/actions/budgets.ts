"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { num, optInt, str } from "@/lib/form";

/** Guarda el presupuesto mensual de una categoría; vacío o 0 lo quita. */
export async function saveBudget(fd: FormData) {
  await requireAuth();
  const categoryId = optInt(fd, "categoryId");
  if (!categoryId) return;
  const amountUsd = str(fd, "amountUsd") ? num(fd, "amountUsd") : 0;
  if (amountUsd > 0) {
    await db
      .insert(budgets)
      .values({ categoryId, amountUsd })
      .onConflictDoUpdate({ target: budgets.categoryId, set: { amountUsd } });
  } else {
    await db.delete(budgets).where(eq(budgets.categoryId, categoryId));
  }
  revalidatePath("/", "layout");
}
