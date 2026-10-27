"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { goalContributions, savingsGoals } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { currency, num, optInt, optStr, str } from "@/lib/form";

export async function saveGoal(fd: FormData) {
  await requireAuth();
  const values = {
    name: str(fd, "name"),
    emoji: str(fd, "emoji") || "🎯",
    targetAmount: num(fd, "targetAmount"),
    currency: currency(fd),
    deadline: optStr(fd, "deadline"),
  };
  if (!values.name) return;
  const id = optInt(fd, "id");
  if (id) await db.update(savingsGoals).set(values).where(eq(savingsGoals.id, id));
  else await db.insert(savingsGoals).values(values);
  revalidatePath("/", "layout");
}

export async function addContribution(fd: FormData) {
  await requireAuth();
  const goalId = optInt(fd, "goalId");
  const amount = num(fd, "amount");
  if (!goalId || amount === 0) return;
  const sign = str(fd, "kind") === "retiro" ? -1 : 1;
  await db.insert(goalContributions).values({
    goalId,
    amount: Math.abs(amount) * sign,
    date: str(fd, "date"),
    note: optStr(fd, "note"),
  });
  revalidatePath("/", "layout");
}

export async function deleteContribution(id: number) {
  await requireAuth();
  await db.delete(goalContributions).where(eq(goalContributions.id, id));
  revalidatePath("/", "layout");
}

export async function setGoalArchived(id: number, archived: boolean) {
  await requireAuth();
  await db.update(savingsGoals).set({ archived }).where(eq(savingsGoals.id, id));
  revalidatePath("/", "layout");
}

export async function deleteGoal(id: number) {
  await requireAuth();
  await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
  revalidatePath("/", "layout");
}
