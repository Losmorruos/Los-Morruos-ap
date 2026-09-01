// Service worker de la app + OneSignal (mismo scope del subdirectorio)
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// v18: Firebase global + migración automática de usuarios antiguos.
const CACHE = "morruos-v18-firebase-global";
const ASSETS = ["./index.html", "./logo.png", "./logo-192.png", "./logo-512.png", "./manifest.json"];

const FIREBASE_FIX_SCRIPT = `
<script>
(function () {
  // Configuración Firebase global: no depende del localStorage de cada móvil.
  const GLOBAL_FIREBASE_CONFIG = {
    apiKey: "AIzaSyD975LbcmD-5roITCDT8SFBQVo1Kb2g_es",
    authDomain: "los-morruos.firebaseapp.com",
    projectId: "los-morruos",
    storageBucket: "los-morruos.firebasestorage.app",
    messagingSenderId: "43160020256",
    appId: "1:43160020256:web:b9d394558e23ebfbdfa345",
    measurementId: "G-HNZNTJD835"
  };

  // El código antiguo buscaba Firebase solo en localStorage. Lo sustituimos
  // antes de que continúe el init() asíncrono de la app.
  window.loadFirebaseConfig = function () { return GLOBAL_FIREBASE_CONFIG; };

  // Si este móvil ya tenía un usuario guardado localmente, lo migramos a
  // Firestore automáticamente para que aparezca también en Administración.
  async function syncCurrentUser() {
    try {
      if (!firebaseReady || !db || !currentUser || currentUser.guest) return;
      const u = currentUser;
      const nombre = String(u.nombre || "").trim();
      const apellidos = String(u.apellidos || "").trim();
      const telefono = String(u.telefono || "").trim();
      const id = telefono.replace(/\D/g, "");
      if (!nombre || !apellidos || id.length < 9) return;
      await db.collection("registrations").doc(id).set({
        nombre, apellidos, telefono,
        registeredAt: u.registeredAt || new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Migración Firebase de usuario local no completada:", e);
    }
  }

  const oldCheckRegistration = window.checkRegistration;
  if (typeof oldCheckRegistration === "function") {
    window.checkRegistration = function () {
      const result = oldCheckRegistration.apply(this, arguments);
      syncCurrentUser();
      return result;
    };
  }
})();
</script>`;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      for (const asset of ASSETS) {
        try {
          const res = await fetch(asset, { cache: "no-store" });
          if (res.ok) {
            if (asset === "./index.html") {
              const html = await res.text();
              const fixed = html.includes("</body>")
                ? html.replace("</body>", FIREBASE_FIX_SCRIPT + "</body>")
                : html + FIREBASE_FIX_SCRIPT;
              await c.put(asset, new Response(fixed, {
                headers: { "Content-Type": "text/html; charset=utf-8" }
              }));
            } else {
              await c.put(asset, res);
            }
          }
        } catch (_) {}
      }
    })
  );
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
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request, { cache: "no-store" })
      .then(async (res) => {
        if (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/Los-Morruos-ap/")) {
          try {
            const html = await res.clone().text();
            if (!html.includes("GLOBAL_FIREBASE_CONFIG")) {
              const fixed = html.includes("</body>")
                ? html.replace("</body>", FIREBASE_FIX_SCRIPT + "</body>")
                : html + FIREBASE_FIX_SCRIPT;
              res = new Response(fixed, {
                status: res.status,
                statusText: res.statusText,
                headers: res.headers
              });
            }
          } catch (_) {}
        }
        const resClone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, resClone));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
