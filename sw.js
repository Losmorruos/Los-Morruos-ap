// Service Worker de Los Morruos + OneSignal.
// v24: Firebase robusto + compartir partidos con redes sociales.
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE = "morruos-v24-firebase-social-share";
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
      if (typeof firebaseReady === "undefined" || !firebaseReady || typeof db === "undefined" || !db || typeof currentUser === "undefined" || !currentUser || currentUser.guest) return;
      const u = currentUser;
      const nombre = String(u.nombre || "").trim();
      const apellidos = String(u.apellidos || "").trim();
      const telefono = String(u.telefono || "").trim();
      const id = telefono.replace(/\\D/g, "");
      if (!nombre || !apellidos || id.length < 9) return;
      await db.collection("registrations").doc(id).set({ nombre, apellidos, telefono, registeredAt: u.registeredAt || new Date().toISOString() }, { merge: true });
    } catch (e) { console.warn("Migración Firebase de usuario local no completada:", e); }
  }
  const timer = setInterval(function () {
    try {
      if (typeof firebaseReady !== "undefined" && firebaseReady && typeof db !== "undefined" && db && typeof currentUser !== "undefined" && currentUser && !currentUser.guest) {
        syncCurrentUser(); clearInterval(timer);
      }
    } catch (_) {}
  }, 1000);
})();
`;

const ROBUST_USERS_SCRIPT = `
(function () {
  let installed = false;
  function install() {
    try {
      if (installed || typeof firebaseReady === "undefined" || !firebaseReady || typeof db === "undefined" || !db || typeof renderUsersList !== "function") return;
      db.collection("registrations").limit(500).onSnapshot(function (snap) {
        const list = [];
        snap.forEach(function (doc) { list.push({ id: doc.id, ...doc.data() }); });
        list.sort(function (a,b) { return String(b.registeredAt || "").localeCompare(String(a.registeredAt || "")); });
        renderUsersList(list);
      }, function (err) {
        console.error("Error leyendo registrations en Firebase:", err);
        try { renderUsersList([]); } catch (_) {}
      });
      installed = true;
      window.__morruosRobustUsersListener = true;
    } catch (e) { console.error("No se pudo instalar el listener robusto de usuarios:", e); }
  }
  const timer = setInterval(function () { install(); if (installed) clearInterval(timer); }, 700);
  setTimeout(install, 3500);
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

// Fuerza un selector de redes para "Compartir partido".
// No usa navigator.share automáticamente porque en PC/PWA puede ocultar las opciones sociales.
const SOCIAL_SHARE_SCRIPT = `
(function () {
  function makeButton(label, url, extraClass) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = label;
    a.style.cssText = "display:block;padding:12px;border-radius:10px;text-align:center;text-decoration:none;font-weight:700;color:#fff;" + (extraClass || "background:#2A2A2A;");
    return a;
  }
  window.shareText = function (title, text) {
    const safeTitle = String(title || "Los Morruos");
    const safeText = String(text || "");
    const full = safeTitle + "\\n" + safeText + "\\n" + location.href;
    const encoded = encodeURIComponent(full);
    const wa = "https://wa.me/?text=" + encoded;
    const fb = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(location.href) + "&quote=" + encodeURIComponent(safeTitle + "\\n" + safeText);
    const x = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(safeTitle + "\\n" + safeText) + "&url=" + encodeURIComponent(location.href);
    const tg = "https://t.me/share/url?url=" + encodeURIComponent(location.href) + "&text=" + encodeURIComponent(safeTitle + "\\n" + safeText);

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:20px;";
    overlay.addEventListener("click", function (e) { if (e.target === overlay) overlay.remove(); });
    const box = document.createElement("div");
    box.style.cssText = "background:#141414;border:1px solid #2A2A2A;border-radius:16px;padding:20px;max-width:380px;width:100%;color:#fff;max-height:90vh;overflow:auto;";
    const h = document.createElement("h3"); h.textContent = "Compartir partido"; h.style.cssText = "color:#F5C518;margin:0 0 6px;font-size:20px;";
    const p = document.createElement("p"); p.textContent = safeText; p.style.cssText = "color:#aaa;font-size:13px;line-height:1.45;margin:0 0 14px;";
    const grid = document.createElement("div"); grid.style.cssText = "display:grid;gap:10px;";
    grid.appendChild(makeButton("WhatsApp", wa, "background:#25D366;"));
    grid.appendChild(makeButton("Facebook", fb, "background:#1877F2;"));
    grid.appendChild(makeButton("Instagram", "https://www.instagram.com/", "background:linear-gradient(90deg,#833AB4,#FD1D1D,#FCAF45);"));
    grid.appendChild(makeButton("X / Twitter", x, "background:#000;"));
    grid.appendChild(makeButton("Telegram", tg, "background:#229ED9;"));
    const share = document.createElement("button");
    share.type = "button"; share.textContent = "📱 Más opciones de compartir";
    share.style.cssText = "width:100%;padding:12px;border:0;border-radius:10px;background:#F5C518;color:#0A0A0A;font-weight:700;cursor:pointer;";
    share.onclick = function () { if (navigator.share) navigator.share({ title: safeTitle, text: safeText, url: location.href }).catch(function () {}); else alert("Tu navegador no ofrece más opciones de compartir."); };
    grid.appendChild(share);
    const copy = document.createElement("button");
    copy.type = "button"; copy.textContent = "📋 Copiar texto y enlace";
    copy.style.cssText = "width:100%;padding:12px;border:0;border-radius:10px;background:#2A2A2A;color:#fff;font-weight:700;cursor:pointer;";
    copy.onclick = function () {
      const done = function () { copy.textContent = "✓ Copiado"; setTimeout(function () { overlay.remove(); }, 600); };
      if (navigator.clipboard) navigator.clipboard.writeText(full).then(done).catch(function () { prompt("Copia este texto:", full); });
      else prompt("Copia este texto:", full);
    };
    grid.appendChild(copy);
    const close = document.createElement("button");
    close.type = "button"; close.textContent = "Cerrar";
    close.style.cssText = "width:100%;padding:10px;border:0;background:transparent;color:#888;cursor:pointer;";
    close.onclick = function () { overlay.remove(); };
    grid.appendChild(close);
    box.append(h, p, grid); overlay.appendChild(box); document.body.appendChild(overlay);
  };
})();
`;

function injectFixes(html) {
  const all = FIREBASE_FIX_SCRIPT + ROBUST_USERS_SCRIPT + STARTUP_RECOVERY_SCRIPT + SOCIAL_SHARE_SCRIPT;
  const marker = '    const DEFAULT = {';
  if (html.includes(marker)) return html.replace(marker, all + "\\n" + marker);
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
            const fixed = injectFixes(html);
            await cache.put(asset, new Response(fixed, { status: res.status, statusText: res.statusText, headers: { "Content-Type": "text/html; charset=utf-8" } }));
          } else await cache.put(asset, res);
        } catch (_) {}
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) { return caches.delete(key); }));
  }));
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
          const fixed = injectFixes(html);
          res = new Response(fixed, { status: res.status, statusText: res.statusText, headers: res.headers });
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
