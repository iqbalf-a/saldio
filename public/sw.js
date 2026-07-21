/* Saldio Service Worker — offline shell + update prompt */
const CACHE_NAME = "saldio-__BUILD_ID__";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

/* ---- Install: pre-cache shell ---- */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

/* ---- Activate: purge old caches ---- */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) =>
        Promise.all(ks.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/* ---- Fetch: cache-first, network fallback ---- */
self.addEventListener("fetch", (e) => {
  /* Only GET */
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        /* Cache successful same-origin navigation/resource responses */
        if (!res || res.status !== 200 || res.type !== "basic") return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return res;
      });
    }),
  );
});

/* ---- Listen for skipWaiting from client ---- */
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
