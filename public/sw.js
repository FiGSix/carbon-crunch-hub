/* Lightweight runtime caching Service Worker to improve repeat-visit performance
   Focus: cache static assets (JS/CSS/fonts/images) with a Cache-First strategy
   This does not alter app functionality or UI. */

const CACHE_VERSION = 'v1';
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  // Activate new SW immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== RUNTIME_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Helper: Decide whether to handle this request
function shouldHandleRequest(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  // Only cache same-origin assets
  if (url.origin !== self.location.origin) return false;

  // Destination-based filtering
  const dest = request.destination;
  if (['script', 'style', 'image', 'font'].includes(dest)) return true;

  // Fallback: file extension-based
  const extPattern = /\.(js|css|png|jpg|jpeg|webp|avif|svg|gif|ico|woff2?|ttf|eot)$/i;
  return extPattern.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!shouldHandleRequest(request)) return;

  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached; // Cache-first

      try {
        const response = await fetch(request);
        // Only cache successful, basic/opaque allowed responses
        if (response && (response.status === 200 || response.type === 'opaque')) {
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        // Network failed and no cache; just rethrow
        throw err;
      }
    })
  );
});
