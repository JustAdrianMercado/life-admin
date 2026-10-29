"use client";

import { Bell, BellOff, Send } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { sendTestPush, subscribePush, unsubscribePush } from "@/actions/push";
import { Button } from "./ui";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

type Status = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

/** Activa/desactiva las notificaciones push en este dispositivo. */
export function PushManager() {
  const [status, setStatus] = useState<Status>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // En iPhone las notificaciones solo funcionan con la app agregada a la pantalla de inicio.
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const standalone = window.matchMedia("(display-mode: standalone)").matches;
        setStatus(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
      setStatus(sub ? "on" : Notification.permission === "denied" ? "denied" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  function enable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY!),
        });
        await subscribePush(JSON.parse(JSON.stringify(sub)), navigator.userAgent);
        setSubscription(sub);
        setStatus("on");
      } catch (err) {
        console.error(err);
        setMessage("No se pudo activar. Prueba de nuevo o revisa los permisos del navegador.");
      }
    });
  }

  function disable() {
    setMessage(null);
    startTransition(async () => {
      if (subscription) {
        await unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscription(null);
      setStatus("off");
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      const { sent, total } = await sendTestPush();
      setMessage(
        sent > 0
          ? `Enviada a ${sent} ${sent === 1 ? "dispositivo" : "dispositivos"}.`
          : total > 0
            ? "No se pudo enviar. Desactiva y vuelve a activar."
            : "No hay dispositivos suscritos.",
      );
    });
  }

  if (!PUBLIC_KEY) {
    return (
      <p className="text-sm text-muted">
        Faltan las claves VAPID (<code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> y <code>VAPID_PRIVATE_KEY</code>).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "loading" && <p className="text-sm text-muted">Revisando…</p>}
      {status === "unsupported" && <p className="text-sm text-muted">Este navegador no admite notificaciones push.</p>}
      {status === "ios-install" && (
        <p className="text-sm text-muted">
          En iPhone primero agrega la app a la pantalla de inicio (<b>Compartir → Agregar a inicio</b>), ábrela desde
          ahí y vuelve a esta página para activarlas.
        </p>
      )}
      {status === "denied" && (
        <p className="text-sm text-muted">
          Bloqueaste las notificaciones para este sitio. Permítelas en los ajustes del navegador y recarga la página.
        </p>
      )}
      {status === "off" && (
        <Button type="button" onClick={enable} disabled={pending} className="self-start">
          <Bell size={16} /> {pending ? "Activando…" : "Activar en este dispositivo"}
        </Button>
      )}
      {status === "on" && <p className="text-sm text-success">Activadas en este dispositivo.</p>}
      {status === "on" && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={test} disabled={pending}>
            <Send size={16} /> Enviar prueba
          </Button>
          <Button type="button" variant="ghost" onClick={disable} disabled={pending}>
            <BellOff size={16} /> Desactivar aquí
          </Button>
        </div>
      )}
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
