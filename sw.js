// Service worker de la app + OneSignal (mismo scope del subdirectorio)
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// v20: Firebase global + migración automática + recuperación de arranque.
// IMPORTANTE: los scripts se inyectan dentro del <script> principal de index.html,
// por lo que NO deben contener etiquetas <script> anidadas.
const CACHE = "morruos-v20-firebase-global";
const ASSETS = ["./index.html", "./logo.png", "./logo-192.png", "./logo-512.png", "./manifest.json"];

const FIREBASE_FIX_SCRIPT = `
(function () {
  const GLOBAL_FIREBASE_CONFIG = {
    apiKey: "AIzaSyD975LbcmD-5roITCDT8SFBQVo1Kb2g_es",
    authDomain: "los-morruos.firebaseapp.com",
    projectId: "los-morruos",
    storageBucket: "los-morruos.firebasestorage.app",
    messagingSenderId: "43160020256",
    appId: "1:43160020256:web:b9d394558e23ebfbdfa345",
    measurementId: "G-HNZNTJD835"
  };
  try {
    const nativeGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === "morruos_firebase_cfg") return JSON.stringify(GLOBAL_FIREBASE_CONFIG);
      return nativeGetItem.call(this, key);
    };
  } catch (_) {}
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
  const migrationTimer = setInterval(() => {
    if (typeof firebaseReady !== "undefined" && firebaseReady && typeof db !== "undefined" && db && typeof currentUser !== "undefined" && currentUser && !currentUser.guest) {
      syncCurrentUser();
      clearInterval(migrationTimer);
    }
  }, 1000);
})();
`;

const STARTUP_RECOVERY_SCRIPT = `
(function () {
  // Recuperación: si una promesa de arranque falla (red, caché o datos),
  // la portada se pinta igualmente con DEFAULT en vez de quedarse vacía.
  function recover() {
    try {
      if (typeof data !== "undefined" && !data && typeof DEFAULT !== "undefined") {
        data = JSON.parse(JSON.stringify(DEFAULT));
        if (typeof normalizeNextMatches === "function") data.nextMatches = normalizeNextMatches(data);
      }
      if (typeof renderAll === "function") renderAll();
    } catch (_) {}
  }
  window.addEventListener("unhandledrejection", recover);
  setTimeout(function () {
    try {
      const box = document.getElementById("home-next-matches");
      if (box && !box.innerHTML.trim()) recover();
    } catch (_) {}
  }, 3500);
})();
`;

function injectFixes(html) {
  const marker = '    const DEFAULT = {';
  if (html.includes("GLOBAL_FIREBASE_CONFIG")) return html;
  const fixed = FIREBASE_FIX_SCRIPT + STARTUP_RECOVERY_SCRIPT + "\n";
  return html.includes(marker)
    ? html.replace(marker, fixed + marker)
    : html.includes("</body>")
      ? html.replace("</body>", fixed + "</body>")
      : html + fixed;
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      for (const asset of ASSETS) {
        try {
          const res = await fetch(asset, { cache: "no-store" });
          if (res.ok) {
            if (asset === "./index.html") {
              const html = await res.text();
              await c.put(asset, new Response(injectFixes(html), {
                headers: { "Content-Type": "text/html; charset=utf-8" }
              }));
            } else await c.put(asset, res);
          }
        } catch (_) {}
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-store" }).then(async (res) => {
      if (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/Los-Morruos-ap/")) {
        try {
          const html = await res.clone().text();
          if (!html.includes("GLOBAL_FIREBASE_CONFIG")) {
            res = new Response(injectFixes(html), { status: res.status, statusText: res.statusText, headers: res.headers });
          }
        } catch (_) {}
      }
      const resClone = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, resClone));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
