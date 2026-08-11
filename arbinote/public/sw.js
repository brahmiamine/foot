// Service Worker minimal pour PWA
const CACHE_NAME = 'arbinote-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/logo-light.png',
];

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de cache : Network First, fallback sur cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignorer les requêtes qui ne peuvent pas être mises en cache
  // - Schémas non-HTTP/HTTPS (chrome-extension://, about:, data:, etc.)
  // - Méthodes non-GET
  // - Requêtes vers des domaines externes si nécessaire
  const url = new URL(request.url);
  const isHttpOrHttps = url.protocol === 'http:' || url.protocol === 'https:';
  const isGetRequest = request.method === 'GET';
  
  // Ne pas intercepter les requêtes non-HTTP/HTTPS ou non-GET
  if (!isHttpOrHttps || !isGetRequest) {
    return; // Laisser la requête passer normalement
  }
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Vérifier que la réponse est valide et peut être mise en cache
        if (response && response.status === 200 && response.type === 'basic') {
          // Clone de la réponse pour la mettre en cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Vérifier que la requête peut être mise en cache
            try {
              cache.put(request, responseToCache).catch((err) => {
                // Ignorer silencieusement les erreurs de cache pour les requêtes non supportées
                console.debug('Cache put failed (ignored):', err);
              });
            } catch (err) {
              // Ignorer silencieusement les erreurs
              console.debug('Cache put error (ignored):', err);
            }
          });
        }
        return response;
      })
      .catch(() => {
        // Si le réseau échoue, retourner depuis le cache
        return caches.match(request);
      })
  );
});

// Réception des notifications Web Push (voir /admin/notifications côté app,
// notification-api/src/providers/push/web-push.provider.ts côté serveur).
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Arbinote', body: event.data.text() };
  }
  const { title = 'Arbinote', body, url = '/admin', icon = '/icon-192x192.png' } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/admin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

