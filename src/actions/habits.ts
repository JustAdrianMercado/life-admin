"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { habitChecks, habits } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { optInt, str } from "@/lib/form";

export async function saveHabit(fd: FormData) {
  await requireAuth();
  const values = {
    name: str(fd, "name"),
    emoji: str(fd, "emoji") || "✅",
    color: str(fd, "color") || "#4f46e5",
    targetPerWeek: Math.min(Math.max(optInt(fd, "targetPerWeek") ?? 7, 1), 7),
  };
  if (!values.name) return;
  const id = optInt(fd, "id");
  if (id) await db.update(habits).set(values).where(eq(habits.id, id));
  else await db.insert(habits).values(values);
  revalidatePath("/", "layout");
}

export async function archiveHabit(id: number) {
  await requireAuth();
  await db.update(habits).set({ archived: true }).where(eq(habits.id, id));
  revalidatePath("/", "layout");
}

/** Marca o desmarca un hábito en una fecha. */
export async function toggleHabit(habitId: number, date: string, done: boolean) {
  await requireAuth();
  if (done) await db.insert(habitChecks).values({ habitId, date }).onConflictDoNothing();
  else await db.delete(habitChecks).where(and(eq(habitChecks.habitId, habitId), eq(habitChecks.date, date)));
  revalidatePath("/", "layout");
}
