/* Enhanced Service Worker for aggressive caching to improve repeat-visit performance
   Implements Cache-First strategy with appropriate cache durations for different asset types
   This addresses PageSpeed cache lifetime recommendations */

const CACHE_VERSION = 'v3';
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const ASSET_CACHE = `assets-${CACHE_VERSION}`;

// Cache durations in milliseconds
const CACHE_DURATIONS = {
  images: 365 * 24 * 60 * 60 * 1000,    // 1 year for images
  scripts: 365 * 24 * 60 * 60 * 1000,   // 1 year for JS (hashed filenames)
  styles: 365 * 24 * 60 * 60 * 1000,    // 1 year for CSS (hashed filenames)
  fonts: 365 * 24 * 60 * 60 * 1000,     // 1 year for fonts
  other: 7 * 24 * 60 * 60 * 1000        // 1 week for other assets
};

self.addEventListener('install', (event) => {
  // Activate new SW immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  const cacheWhitelist = [RUNTIME_CACHE, IMAGE_CACHE, ASSET_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !cacheWhitelist.includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Helper: Determine cache name and duration for asset type
function getCacheConfig(url) {
  const pathname = new URL(url).pathname;
  
  // Images
  if (/\.(png|jpg|jpeg|webp|avif|svg|gif|ico)$/i.test(pathname)) {
    return { cache: IMAGE_CACHE, duration: CACHE_DURATIONS.images };
  }
  
  // Scripts
  if (/\.js$/i.test(pathname)) {
    return { cache: ASSET_CACHE, duration: CACHE_DURATIONS.scripts };
  }
  
  // Styles
  if (/\.css$/i.test(pathname)) {
    return { cache: ASSET_CACHE, duration: CACHE_DURATIONS.styles };
  }
  
  // Fonts
  if (/\.(woff2?|ttf|eot)$/i.test(pathname)) {
    return { cache: ASSET_CACHE, duration: CACHE_DURATIONS.fonts };
  }
  
  // Other assets
  return { cache: RUNTIME_CACHE, duration: CACHE_DURATIONS.other };
}

// Helper: Check if cached response is still fresh
function isCacheFresh(response, duration) {
  if (!response) return false;
  
  const cachedTime = response.headers.get('sw-cache-time');
  if (!cachedTime) return false;
  
  const age = Date.now() - parseInt(cachedTime, 10);
  return age < duration;
}

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
  
  // Network-First for HTML/navigation requests (app shell)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          // Cache the fresh HTML for offline fallback
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone());
          return response;
        })
        .catch(async () => {
          // Fallback to cached HTML if network fails
          const cached = await caches.match(request);
          return cached || new Response('Offline', { status: 503 });
        })
    );
    return;
  }
  
  // Cache-First for static assets (JS, CSS, images, fonts)
  if (!shouldHandleRequest(request)) return;

  const { cache: cacheName, duration } = getCacheConfig(request.url);

  event.respondWith(
    caches.open(cacheName).then(async (cache) => {
      const cached = await cache.match(request);
      
      // Check if cache is still fresh
      if (cached && isCacheFresh(cached, duration)) {
        return cached;
      }

      try {
        const response = await fetch(request);
        
        // Only cache successful responses
        if (response && response.status === 200) {
          // Clone the response and add cache timestamp
          const responseToCache = response.clone();
          const headers = new Headers(responseToCache.headers);
          headers.append('sw-cache-time', Date.now().toString());
          
          const cachedResponse = new Response(responseToCache.body, {
            status: responseToCache.status,
            statusText: responseToCache.statusText,
            headers: headers
          });
          
          cache.put(request, cachedResponse);
        }
        
        return response;
      } catch (err) {
        // Network failed - return stale cache if available
        if (cached) {
          return cached;
        }
        throw err;
      }
    })
  );
});
