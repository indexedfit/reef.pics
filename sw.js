const CACHE_NAME = 'researchpics-v2';
const ASSETS = [
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Auto-activate new SW immediately
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Listen for skip waiting message from the page
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Only handle http/https requests (ignore chrome-extension, etc)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Network-first for HTML pages (always get fresh content)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for other assets
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).then((fetchResponse) => {
        if (fetchResponse.ok && e.request.method === 'GET') {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
      if (e.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
