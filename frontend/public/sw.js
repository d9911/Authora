// Minimal service worker: precache the offline fallback and serve it when
// a navigation request fails (no network).
const CACHE = 'app-cache-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/manifest.json'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }
  // Cache-first for same-origin static assets.
  if (request.method === 'GET' && new URL(request.url).origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
  }
});
