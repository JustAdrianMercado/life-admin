import { pushConfigured, sendPushToAll } from "@/lib/push";
import { buildDailyDigest } from "@/lib/reminders";

// Lo llama Vercel Cron cada mañana (ver vercel.json). Vercel manda CRON_SECRET en el header Authorization.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  if (!pushConfigured()) return Response.json({ skipped: "faltan las claves VAPID" });

  const digest = await buildDailyDigest();
  if (!digest) return Response.json({ skipped: "nada que avisar hoy" });
  const result = await sendPushToAll(digest);
  return Response.json({ ...result, title: digest.title });
}
