// Service worker de la app + OneSignal.
// v22: Firebase + registros robustos + WhatsApp de merchandising.
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE = "morruos-v22-firebase-registros-whatsapp";
const ASSETS = ["./index.html", "./logo.png", "./logo-192.png", "./logo-512.png", "./manifest.json"];

// Este código se inyecta como JavaScript REAL dentro de <script> en index.html.
// Importante: no lleva etiquetas <script> aquí, para evitar que aparezcan como texto.
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
      if (typeof firebaseReady === "undefined" || !firebaseReady || typeof db === "undefined" || !db || typeof currentUser === "undefined" || !currentUser || currentUser.guest) return false;
      const u = currentUser;
      const nombre = String(u.nombre || "").trim();
      const apellidos = String(u.apellidos || "").trim();
      const telefono = String(u.telefono || "").trim();
      const id = telefono.replace(/\\D/g, "");
      if (!nombre || !apellidos || id.length < 9) return false;
      await db.collection("registrations").doc(id).set({
        nombre, apellidos, telefono,
        registeredAt: u.registeredAt || new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      console.warn("Migración Firebase de usuario local no completada:", e);
      return false;
    }
  }

  const migrationTimer = setInterval(function () {
    try {
      if (typeof firebaseReady !== "undefined" && firebaseReady && typeof db !== "undefined" && db && typeof currentUser !== "undefined" && currentUser && !currentUser.guest) {
        syncCurrentUser();
        clearInterval(migrationTimer);
      }
    } catch (_) {}
  }, 1000);
})();
`;

const ROBUST_USERS_SCRIPT = `
(function () {
  let usersUnsub = null;
  function installRobustUsersListener() {
    try {
      if (typeof firebaseReady === "undefined" || !firebaseReady || typeof db === "undefined" || !db) return;
      if (typeof renderUsersList !== "function") return;
      if (window.__morruosRobustUsersListener) return;
      usersUnsub = db.collection("registrations").limit(500).onSnapshot(function (snap) {
        const list = [];
        snap.forEach(function (doc) { list.push({ id: doc.id, ...doc.data() }); });
        list.sort(function (a, b) { return String(b.registeredAt || "").localeCompare(String(a.registeredAt || "")); });
        renderUsersList(list);
      }, function (err) {
        console.error("Error leyendo registrations en Firebase:", err);
        try { renderUsersList([]); } catch (_) {}
        const status = document.getElementById("firebase-config-status");
        if (status) status.textContent = "Firebase conectado, pero no se pudieron leer los registros.";
      });
      window.__morruosRobustUsersListener = true;
    } catch (e) {
      console.error("No se pudo instalar el listener robusto de usuarios:", e);
    }
  }
  const timer = setInterval(function () {
    try {
      if (typeof firebaseReady !== "undefined" && firebaseReady && typeof db !== "undefined" && db) {
        installRobustUsersListener();
        if (window.__morruosRobustUsersListener) clearInterval(timer);
      }
    } catch (_) {}
  }, 700);
  setTimeout(function () { try { installRobustUsersListener(); } catch (_) {} }, 3500);
})();
`;

const MERCH_WHATSAPP_FIX_SCRIPT = `
(function () {
  const NUMBER = "34650858521";
  window.comprarPorWhatsApp = function (nombre, precio) {
    const producto = String(nombre || "producto").trim();
    const precioTexto = String(precio || "").trim();
    const mensaje = \`Hola, quiero consultar por \${producto}\${precioTexto ? \` (\${precioTexto})\` : ""} de Los Morruos. ¿Me puedes indicar disponibilidad, tallas y precio?\`;
    const url = \`https://api.whatsapp.com/send?phone=\${NUMBER}&text=\${encodeURIComponent(mensaje)}\`;
    window.location.assign(url);
  };
  function cambiarTextoBotones(root) {
    try {
      (root || document).querySelectorAll("button").forEach(function (btn) {
        if ((btn.textContent || "").includes("Comprar por WhatsApp")) {
          btn.innerHTML = btn.innerHTML.replace("Comprar por WhatsApp", "Consultar por WhatsApp");
        }
      });
    } catch (_) {}
  }
  cambiarTextoBotones(document);
  try {
    const observer = new MutationObserver(function () { cambiarTextoBotones(document); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}
})();
`;

const STARTUP_RECOVERY_SCRIPT = `
(function () {
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
  const all = FIREBASE_FIX_SCRIPT + ROBUST_USERS_SCRIPT + MERCH_WHATSAPP_FIX_SCRIPT + STARTUP_RECOVERY_SCRIPT;
  const marker = '    const DEFAULT = {';
  if (html.includes(marker)) return html.replace(marker, all + "\n" + marker);
  if (html.includes("</body>")) return html.replace("</body>", "<script>" + all + "</script></body>");
  return html + "<script>" + all + "</script>";
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(async function (cache) {
      for (const asset of ASSETS) {
        try {
          const res = await fetch(asset, { cache: "no-store" });
          if (!res.ok) continue;
          if (asset === "./index.html") {
            const html = await res.text();
            const fixed = html.includes("GLOBAL_FIREBASE_CONFIG") ? html : injectFixes(html);
            await cache.put(asset, new Response(fixed, { status: res.status, statusText: res.statusText, headers: { "Content-Type": "text/html; charset=utf-8" } }));
          } else {
            await cache.put(asset, res);
          }
        } catch (_) {}
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) { return caches.delete(key); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: "no-store" }).then(async function (res) {
      if (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/Los-Morruos-ap/") || url.pathname === "/") {
        try {
          const html = await res.clone().text();
          if (!html.includes("GLOBAL_FIREBASE_CONFIG")) {
            const fixed = injectFixes(html);
            res = new Response(fixed, { status: res.status, statusText: res.statusText, headers: res.headers });
          }
        } catch (_) {}
      }
      const clone = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(event.request, clone).catch(function () {}); }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(event.request).then(function (r) { return r || caches.match("./index.html"); });
    })
  );
});
