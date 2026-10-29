"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pushSubscriptions, settings } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { optInt } from "@/lib/form";
import { sendPushToAll } from "@/lib/push";
import { buildDailyDigest } from "@/lib/reminders";

type SerializedSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function subscribePush(sub: SerializedSubscription, userAgent: string) {
  await requireAuth();
  const values = { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent };
  await db
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
  revalidatePath("/ajustes");
}

export async function unsubscribePush(endpoint: string) {
  await requireAuth();
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  revalidatePath("/ajustes");
}

/** Manda el resumen de hoy (o un mensaje de prueba si no hay nada) a todos los dispositivos. */
export async function sendTestPush() {
  await requireAuth();
  const digest = await buildDailyDigest();
  return sendPushToAll(
    digest ?? { title: "Notificaciones activadas ✅", body: "Hoy no tienes cobros ni eventos. Así se verán los avisos.", url: "/" },
  );
}

export async function saveNotifySettings(fd: FormData) {
  await requireAuth();
  const days = Math.min(Math.max(optInt(fd, "notifyDaysBefore") ?? 1, 0), 14);
  await db
    .insert(settings)
    .values({ id: 1, notifyDaysBefore: days })
    .onConflictDoUpdate({ target: settings.id, set: { notifyDaysBefore: days } });
  revalidatePath("/", "layout");
}
