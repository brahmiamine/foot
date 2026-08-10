// Service Worker minimal pour PWA
const CACHE_NAME = 'teammanager-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/images/favicon.png',
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

  const url = new URL(request.url);
  const isHttpOrHttps = url.protocol === 'http:' || url.protocol === 'https:';
  const isGetRequest = request.method === 'GET';

  // Ne pas intercepter les requêtes non-HTTP/HTTPS, non-GET, ou API/auth
  // (les réponses d'API ne doivent jamais être servies depuis un cache
  // périmé — seules les pages et assets statiques passent par ce cache).
  if (!isHttpOrHttps || !isGetRequest || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try {
              cache.put(request, responseToCache).catch((err) => {
                console.debug('Cache put failed (ignored):', err);
              });
            } catch (err) {
              console.debug('Cache put error (ignored):', err);
            }
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
