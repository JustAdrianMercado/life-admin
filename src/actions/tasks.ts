"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { optInt, optStr, priority, str } from "@/lib/form";

export async function saveTask(fd: FormData) {
  await requireAuth();
  const dueDate = optStr(fd, "dueDate");
  const values = {
    title: str(fd, "title"),
    notes: optStr(fd, "notes"),
    categoryId: optInt(fd, "categoryId"),
    priority: priority(fd),
    dueDate,
    // Sin fecha no tiene sentido una hora.
    dueTime: dueDate ? optStr(fd, "dueTime") : null,
  };
  if (!values.title) return;
  const id = optInt(fd, "id");
  if (id) await db.update(tasks).set(values).where(eq(tasks.id, id));
  else await db.insert(tasks).values(values);
  revalidatePath("/", "layout");
}

export async function setTaskDone(id: number, done: boolean) {
  await requireAuth();
  await db
    .update(tasks)
    .set(done ? { status: "hecha", completedAt: new Date() } : { status: "pendiente", completedAt: null })
    .where(eq(tasks.id, id));
  revalidatePath("/", "layout");
}

export async function setTaskInProgress(id: number) {
  await requireAuth();
  await db.update(tasks).set({ status: "en_progreso" }).where(eq(tasks.id, id));
  revalidatePath("/", "layout");
}

export async function deleteTask(id: number) {
  await requireAuth();
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/", "layout");
}
