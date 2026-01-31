// ==========================================================================
// SERVICE WORKER CONFIGURATION
// ==========================================================================

const CACHE_NAME = "hyaena-v0.23.0";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png"
];

// ==========================================================================
// INSTALL EVENT
// ==========================================================================
// Caches resources immediately upon installation
self.addEventListener("install", (e) => {
  console.log("[Service Worker] Install");
  self.skipWaiting(); // Force waiting service worker to become active
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching all: app shell and content");
      return cache.addAll(ASSETS);
    })
  );
});

// ==========================================================================
// ACTIVATE EVENT
// ==========================================================================
// Cleans up old caches that don't match the current CACHE_NAME
self.addEventListener("activate", (e) => {
  console.log("[Service Worker] Activate");
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of all pages immediately
});

// ==========================================================================
// FETCH EVENT
// ==========================================================================
// Intercepts network requests and serves cached files if available
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
