// IMPORTANTE: sube este número cada vez que publiques cambios en index.html,
// logo.png o manifest.json. Si no lo cambias, los móviles seguirán viendo
// la versión antigua aunque hayas subido archivos nuevos al hosting.
const CACHE = "morruos-v3";
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

// Network-first: intenta traer siempre la versión más reciente del servidor.
// Si no hay conexión, usa la copia guardada en caché como respaldo.
// data.json viene de GitHub con un parámetro cambiante (?t=...) para evitar
// cachés intermedias, así que ese archivo no se guarda en la caché del sw.
self.addEventListener("fetch", (e) => {
  const isOwnOrigin = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (isOwnOrigin) {
          const resClone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
