/* ==========================================================================
   نَحْو — عامل الخدمة
   يخزّن هيكل التطبيق ليعمل دون اتصال عند تقديمه عبر HTTP/HTTPS.
   ========================================================================== */

const CACHE_NAME = "nahw-shell-v0.5.2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/tokens.css",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/screens.css",
  "./js/utils.js",
  "./js/store.js",
  "./js/progress.js",
  "./js/engine.js",
  "./js/exam.js",
  "./js/data-loader.js",
  "./js/ui.js",
  "./js/router.js",
  "./js/screens/home.js",
  "./js/screens/lesson.js",
  "./js/screens/levels.js",
  "./js/screens/practice.js",
  "./js/screens/result.js",
  "./js/screens/dashboard.js",
  "./js/screens/mistakes.js",
  "./js/screens/exam.js",
  "./js/screens/settings.js",
  "./js/app.js",
  "./data/lessons.js",
  "./data/L01.js",
  "./assets/fonts/Cairo-Regular.woff2",
  "./assets/fonts/Cairo-Bold.woff2",
  "./assets/fonts/Amiri-Regular.woff2",
  "./assets/fonts/Amiri-Bold.woff2",
  "./assets/fonts/OFL.txt",
  "./assets/icons/favicon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("nahw-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
