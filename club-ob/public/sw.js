// Service worker minimal : uniquement pour la réception des notifications
// Web Push (voir notifications §16 et espace-membre/preferences). Ne met
// rien en cache — le site est du contenu dynamique (actualités, live match)
// qui ne doit jamais servir une version périmée depuis le cache.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Olympique de Béja", body: event.data.text() };
  }
  const { title = "Olympique de Béja", body, url = "/espace-membre/notifications", icon = "/icon.png" } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/espace-membre/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
