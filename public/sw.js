// Service worker: solo muestra las notificaciones push de la app.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon",
      badge: "/icon",
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

// Al tocar la notificación: enfoca la app si ya está abierta, si no la abre.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) return open.navigate(url).then((w) => (w ?? open).focus());
      return self.clients.openWindow(url);
    }),
  );
});
