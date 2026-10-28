"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories, settings } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { num, optInt, optStr, str } from "@/lib/form";

export async function saveSettings(fd: FormData) {
  await requireAuth();
  const budget = optStr(fd, "monthlyBudgetUsd");
  const timezone = str(fd, "timezone") || "America/La_Paz";
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return;
  }
  const values = {
    localCurrency: str(fd, "localCurrency").toUpperCase().slice(0, 3) || "BOB",
    usdToLocalRate: num(fd, "usdToLocalRate") || 1,
    monthlyBudgetUsd: budget ? num(fd, "monthlyBudgetUsd") : null,
    timezone,
  };
  await db
    .insert(settings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: settings.id, set: values });
  revalidatePath("/", "layout");
}

/** Usa una tasa del día (oficial, paralelo, P2P…) como tasa de conversión de la app. */
export async function setAppRate(rate: number) {
  await requireAuth();
  if (!Number.isFinite(rate) || rate <= 0) return;
  await db.insert(settings).values({ id: 1, usdToLocalRate: rate }).onConflictDoUpdate({
    target: settings.id,
    set: { usdToLocalRate: rate },
  });
  revalidatePath("/", "layout");
}

export async function saveCategory(fd: FormData) {
  await requireAuth();
  const values = {
    name: str(fd, "name"),
    emoji: str(fd, "emoji") || "📁",
    color: str(fd, "color") || "#6366f1",
  };
  if (!values.name) return;
  const id = optInt(fd, "id");
  if (id) await db.update(categories).set(values).where(eq(categories.id, id));
  else await db.insert(categories).values(values).onConflictDoNothing();
  revalidatePath("/", "layout");
}

export async function deleteCategory(id: number) {
  await requireAuth();
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/", "layout");
}
