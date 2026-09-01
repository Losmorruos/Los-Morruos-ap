// Service worker de la app + OneSignal (mismo scope del subdirectorio)
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// v22: Firebase + registros robustos + WhatsApp de merchandising.
const CACHE = "morruos-v22-firebase-registros-whatsapp";
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
      if (!firebaseReady || !db || !currentUser || currentUser.guest) return false;
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

  const migrationTimer = setInterval(() => {
    if (typeof firebaseReady !== "undefined" && firebaseReady && typeof db !== "undefined" && db && typeof currentUser !== "undefined" && currentUser && !currentUser.guest) {
      syncCurrentUser();
      clearInterval(migrationTimer);
    }
  }, 1000);
})();
`;

const REGISTRATION_AND_ADMIN_FIX_SCRIPT = `
(function () {
  function installRegistrationGuard() {
    try {
      if (typeof submitRegistration !== "function" || submitRegistration.__morruosGuarded) return;
      const original = submitRegistration;
      async function guardedSubmitRegistration() {
        try {
          if (!firebaseReady || !db) {
            if (typeof initFirebase === "function") initFirebase();
          }
          if (!firebaseReady || !db) {
            const err = document.getElementById("reg-error");
            if (err) {
              err.textContent = "No se pudo conectar con Firebase. Comprueba tu conexión e inténtalo de nuevo.";
              err.classList.remove("hidden");
            }
            return;
          }
          await original();
          const u = (typeof currentUser !== "undefined") ? currentUser : null;
          const id = u && u.telefono ? String(u.telefono).replace(/\\D/g, "") : "";
          if (!id) return;
          const snap = await db.collection("registrations").doc(id).get();
          if (!snap.exists) {
            const err = document.getElementById("reg-error");
            if (err) {
              err.textContent = "No se pudo guardar el registro en el servidor. Inténtalo de nuevo.";
              err.classList.remove("hidden");
            }
            const overlay = document.getElementById("register-overlay");
            if (overlay) overlay.classList.remove("hidden");
          }
        } catch (e) {
          console.error("Registro Firebase no completado:", e);
          const err = document.getElementById("reg-error");
          if (err) {
            err.textContent = "No se pudo guardar el registro. Comprueba la conexión e inténtalo de nuevo.";
            err.classList.remove("hidden");
          }
          const overlay = document.getElementById("register-overlay");
          if (overlay) overlay.classList.remove("hidden");
        }
      }
      guardedSubmitRegistration.__morruosGuarded = true;
      window.submitRegistration = guardedSubmitRegistration;
    } catch (_) {}
  }

  function installRobustUsersListener() {
    try {
      if (typeof firebaseReady === "undefined" || !firebaseReady || !db) return;
      if (typeof renderUsersList !== "function") return;
      if (window.__morruosRobustUsersListener) return;
      if (usersUnsub) usersUnsub();
      usersUnsub = db.collection("registrations").limit(500).onSnapshot(function (snap) {
        const list = [];
        snap.forEach(function (doc) {
          list.push({ id: doc.id, ...doc.data() });
        });
        list.sort(function (a, b) {
          return String(b.registeredAt || "").localeCompare(String(a.registeredAt || ""));
        });
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
    installRegistrationGuard();
    installRobustUsersListener();
    if (typeof submitRegistration === "function" && window.__morruosRobustUsersListener) clearInterval(timer);
  }, 700);
  setTimeout(function () {
    installRegistrationGuard();
    installRobustUsersListener();
  }, 5000);
})();
`;

const MERCH_WHATSAPP_FIX_SCRIPT = `
(function () {
  const NUMBER = "34650858521";

  window.comprarPorWhatsApp = function (nombre, precio) {
    const producto = String(nombre || "producto").trim();
    const precioTexto = String(precio || "").trim();
    const mensaje = `Hola, quiero consultar por ${producto}${precioTexto ? ` (${precioTexto})` : ""} de Los Morruos. ¿Me puedes indicar disponibilidad, tallas y precio?`;
    const url = `https://wa.me/${NUMBER}?text=${encodeURIComponent(mensaje)}`;
    window.location.href = url;
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
  const observer = new MutationObserver(function () { cambiarTextoBotones(document); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
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
  const marker = '    const DEFAULT = {';
  if (html.includes("__morruosRobustUsersListener") && html.includes("Consultar por WhatsApp")) return html;
  const fixed = FIREBASE_FIX_SCRIPT + REGISTRATION_AND_ADMIN_FIX_SCRIPT + MERCH_WHATSAPP_FIX_SCRIPT + STARTUP_RECOVERY_SCRIPT + "\\n";
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
          if (!html.includes("__morruosRobustUsersListener") || !html.includes("Consultar por WhatsApp")) {
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
