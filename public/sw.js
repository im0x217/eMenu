const CACHE_NAME = 'emenu-cache-v134';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app/',
  '/app/index.html',
  '/res/logo.jpg',
  '/res/logo2.jpg.jpeg',
  '/apple-touch-icon-shop1.png',
  '/apple-touch-icon-shop2.png',
  '/apple-touch-icon-admin.png',
  '/manifest.json',
  '/manifest-shop2.json',
  '/manifest-admin.json'
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
          if (key !== CACHE_NAME && key !== 'emenu-images-cache-v1') {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event (Tailored Caching Strategy for SPA & Assets)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Never cache non-GET requests or backend API routes
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api')) {
    return;
  }

  // 2. Cache-First Strategy for S3 Product Images
  if (url.hostname.includes('amazonaws.com')) {
    event.respondWith(
      caches.open('emenu-images-cache-v1').then((imageCache) => {
        return imageCache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              imageCache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            console.warn('[SW] S3 image network error, serving fallback', err);
            return caches.match('/res/logo.jpg');
          });
        });
      })
    );
    return;
  }

  // 3. Only intercept same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // 3. Cache-First Strategy for fingerprinted immutable Vite assets (/app/assets/*)
  if (url.pathname.startsWith('/app/assets/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. Network-First with Offline Fallback for HTML Navigations & App Shell
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.startsWith('/app')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: serve cached SPA shell or landing page
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (url.pathname.startsWith('/app')) {
              return caches.match('/app/index.html');
            }
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 5. Network-First with Cache Fallback for all other static assets (logos, manifest, etc.)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
