const CACHE_NAME = 'emenu-cache-v80';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/res/logo.jpg',
  '/res/logo2.jpg.jpeg',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event (Network-First falling back to Cache for all GET requests)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching for non-GET requests, API routes, /app SPA, or different origins
  if (
    event.request.method !== 'GET' || 
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/app') ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  // Network-First falling back to Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful response
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});
