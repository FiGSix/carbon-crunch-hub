/**
 * Service Worker for aggressive caching and performance optimization
 */

const CACHE_NAME = 'carbon-crunch-v1';
const RUNTIME_CACHE = 'carbon-crunch-runtime';

// Resources to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/lovable-uploads/cc-favicon.png',
];

// Cache strategies for different resource types
const cacheStrategies = {
  // Cache first for static assets
  static: ['js', 'css', 'woff2', 'woff', 'png', 'jpg', 'jpeg', 'svg', 'ico'],
  // Network first for API calls
  api: ['/api/', 'supabase.co'],
  // Stale while revalidate for pages
  pages: ['/', '/dashboard', '/proposals', '/profile']
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle different types of requests
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(networkFirst(request));
  } else if (isPageRequest(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Cache first strategy for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return a fallback response if available
    return new Response('Offline', { status: 503 });
  }
}

// Network first strategy for API calls
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Stale while revalidate for pages
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

// Helper functions
function isStaticAsset(url) {
  return cacheStrategies.static.some(ext => url.pathname.includes(`.${ext}`));
}

function isAPIRequest(url) {
  return cacheStrategies.api.some(pattern => url.href.includes(pattern));
}

function isPageRequest(url) {
  return url.origin === self.location.origin && 
         !url.pathname.includes('.') && 
         !url.pathname.startsWith('/api/');
}