// ==========================================================================
// SERVICE WORKER CONFIGURATION
// ==========================================================================

const CACHE_NAME = 'hyaena-v0.25.6';
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/state.js",
  "./js/consts.js",
  "./js/utils.js",
  "./js/statistics.js",
  "./js/ui.js",
  "./js/canvas.js",
  "./js/project.js",
  "./js/io.js",
  "./js/app.js",
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
