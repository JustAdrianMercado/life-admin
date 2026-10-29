"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { EVENT_REPEATS, events, type EventRepeat } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { optInt, optStr, str } from "@/lib/form";

export async function saveEvent(fd: FormData) {
  await requireAuth();
  const repeat = str(fd, "repeat") as EventRepeat;
  const startTime = optStr(fd, "startTime");
  const values = {
    title: str(fd, "title"),
    date: str(fd, "date"),
    startTime,
    // Sin hora de inicio es de todo el día: no tiene sentido una hora de fin.
    endTime: startTime ? optStr(fd, "endTime") : null,
    location: optStr(fd, "location"),
    repeat: EVENT_REPEATS.includes(repeat) ? repeat : "none",
    categoryId: optInt(fd, "categoryId"),
    notes: optStr(fd, "notes"),
  };
  if (!values.title || !values.date) return;
  const id = optInt(fd, "id");
  if (id) await db.update(events).set(values).where(eq(events.id, id));
  else await db.insert(events).values(values);
  revalidatePath("/", "layout");
}

export async function deleteEvent(id: number) {
  await requireAuth();
  await db.delete(events).where(eq(events.id, id));
  revalidatePath("/", "layout");
}
