// Service Worker for Kind Setup
const CACHE_NAME = 'kind-setup-cache-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/fonts/inter-var.woff2',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and browser extensions
  if (
    event.request.method !== 'GET' ||
    event.request.url.startsWith('chrome-extension') ||
    event.request.url.includes('extension') ||
    event.request.url.includes('__webpack_hmr') ||
    event.request.url.includes('hot-update')
  ) {
    return;
  }

  // For API requests, use network only
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // For HTML requests, use network first, fallback to cache
  if (event.request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the latest version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/offline.html');
            });
        })
    );
    return;
  }

  // For other assets, use cache first, fallback to network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((response) => {
            // Cache the fetched response
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return response;
          })
          .catch(() => {
            // For image requests, return a placeholder
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/images/placeholder.png');
            }
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
  );
});
