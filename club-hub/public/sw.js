// Service Worker PWA minimal pour club-hub : app shell (assets statiques)
// + page de secours hors-ligne pour la navigation, + réception Web Push
// (convocations, annonces — voir avancement.md, "Web Push généralisé").
// Pas de synchronisation offline des données (formulaires/CRUD) — hors
// périmètre de ce chantier (voir roadmap.md §3).
const CACHE_NAME = "teammanager-shell-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json", "/icons/icon-192x192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Navigation (chargement de page) : réseau d'abord, secours cache/offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((res) => res || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Assets statiques : cache d'abord, réseau en secours + mise à jour du cache.
  if (/\.(?:css|js|png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Club Hub", body: event.data.text() };
  }
  const { title = "Club Hub", body, url = "/admin", icon = "/icons/icon-192x192.png" } = payload;
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
  const targetUrl = event.notification.data?.url ?? "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
