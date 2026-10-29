import "server-only";
import { eq } from "drizzle-orm";
import webpush, { WebPushError } from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

export function pushConfigured() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

// Apple rechaza el "subject" si es localhost: en Vercel se usa la URL de producción.
function vapidSubject() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : "mailto:admin@example.com";
}

/** Envía la notificación a todos los dispositivos suscritos y borra los que ya no existen. */
export async function sendPushToAll(payload: PushPayload) {
  if (!pushConfigured()) throw new Error("Faltan las claves VAPID");
  const subs = await db.select().from(pushSubscriptions);
  const options = {
    vapidDetails: {
      subject: vapidSubject(),
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
      privateKey: process.env.VAPID_PRIVATE_KEY!.trim(),
    },
    TTL: 60 * 60 * 12,
  };

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          options,
        );
        sent++;
      } catch (err) {
        // 404/410: el navegador anuló la suscripción (se desinstaló la app, se quitó el permiso…).
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        } else {
          console.error("push", err);
        }
      }
    }),
  );
  return { sent, total: subs.length };
}
