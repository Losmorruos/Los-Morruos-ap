// Añade el soporte de notificaciones push de OneSignal a este mismo service worker
// (así no hace falta un segundo archivo peleándose por el mismo scope "/").
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// IMPORTANTE: sube este número cada vez que publiques cambios en index.html,
// logo.png o manifest.json. Si no lo cambias, los móviles seguirán viendo
// la versión antigua aunque hayas subido archivos nuevos al hosting.
const CACHE = "morruos-v8";
const ASSETS = ["./index.html", "./logo.png", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Solo cacheamos archivos de NUESTRO sitio.
// Las peticiones a GitHub (data.json) las deja pasar el navegador sin tocarlas.
// Así no se rompe la descarga de datos en los móviles.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) {
    return; // no interceptar raw.githubusercontent.com ni la API de GitHub
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, resClone));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});

