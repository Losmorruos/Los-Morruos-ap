// Service Worker de Los Morruos + OneSignal.
// v25: compartir partidos con selector forzado y fallback de eventos.
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE = "morruos-v25-social-share";
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
    } catch (e) { console.warn("Migración Firebase no completada:", e); }
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
      }, function () { try { renderUsersList([]); } catch (_) {} });
      installed = true;
      window.__morruosRobustUsersListener = true;
    } catch (e) { console.error("No se pudo instalar listener de usuarios:", e); }
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
    try { const box = document.getElementById("home-next-matches"); if (box && !box.innerHTML.trim()) recover(); } catch (_) {}
  }, 3500);
})();
`;

const SOCIAL_SHARE_SCRIPT = `
(function () {
  function openSocialMenu(title, text) {
    const safeTitle = String(title || "Los Morruos");
    const safeText = String(text || "");
    const url = location.href;
    const full = safeTitle + "\\n" + safeText + "\\n" + url;
    const enc = encodeURIComponent(full);
    const wa = "https://wa.me/?text=" + enc;
    const fb = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url) + "&quote=" + encodeURIComponent(safeTitle + "\\n" + safeText);
    const x = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(safeTitle + "\\n" + safeText) + "&url=" + encodeURIComponent(url);
    const tg = "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(safeTitle + "\\n" + safeText);

    const overlay = document.createElement("div");
    overlay.id = "morruos-social-share-overlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:20px;";
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    const box = document.createElement("div");
    box.style.cssText = "background:#141414;border:1px solid #F5C518;border-radius:18px;padding:20px;max-width:390px;width:100%;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.6);";
    box.innerHTML = "<h3 style='color:#F5C518;margin:0 0 8px;font-size:20px'>Compartir partido</h3>" +
      "<p style='color:#aaa;font-size:13px;line-height:1.45;margin:0 0 14px'>" + safeText.replace(/&/g,"&amp;").replace(/</g,"&lt;") + "</p>" +
      "<div style='display:grid;gap:10px'>" +
      "<a target='_blank' rel='noopener noreferrer' href='" + wa + "' style='display:block;background:#25D366;color:#fff;padding:13px;border-radius:10px;text-align:center;text-decoration:none;font-weight:700'>🟢 WhatsApp</a>" +
      "<a target='_blank' rel='noopener noreferrer' href='" + fb + "' style='display:block;background:#1877F2;color:#fff;padding:13px;border-radius:10px;text-align:center;text-decoration:none;font-weight:700'>🔵 Facebook</a>" +
      "<a target='_blank' rel='noopener noreferrer' href='https://www.instagram.com/' style='display:block;background:linear-gradient(90deg,#833AB4,#FD1D1D,#FCAF45);color:#fff;padding:13px;border-radius:10px;text-align:center;text-decoration:none;font-weight:700'>📸 Instagram</a>" +
      "<a target='_blank' rel='noopener noreferrer' href='" + x + "' style='display:block;background:#000;color:#fff;padding:13px;border-radius:10px;text-align:center;text-decoration:none;font-weight:700'>𝕏 X / Twitter</a>" +
      "<a target='_blank' rel='noopener noreferrer' href='" + tg + "' style='display:block;background:#229ED9;color:#fff;padding:13px;border-radius:10px;text-align:center;text-decoration:none;font-weight:700'>✈️ Telegram</a>" +
      "<button id='morruos-more-share' type='button' style='width:100%;padding:13px;border:0;border-radius:10px;background:#F5C518;color:#0A0A0A;font-weight:700'>📱 Más opciones</button>" +
      "<button id='morruos-copy-share' type='button' style='width:100%;padding:13px;border:0;border-radius:10px;background:#2A2A2A;color:#fff;font-weight:700'>📋 Copiar texto y enlace</button>" +
      "<button id='morruos-close-share' type='button' style='width:100%;padding:10px;border:0;background:transparent;color:#888'>Cerrar</button>" +
      "</div>";
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById("morruos-more-share").onclick = function() {
      if (navigator.share) navigator.share({title:safeTitle,text:safeText,url:url}).catch(function(){});
    };
    document.getElementById("morruos-copy-share").onclick = function() {
      const done = function(){ this.textContent="✓ Copiado"; };
      if (navigator.clipboard) navigator.clipboard.writeText(full).then(done.bind(this)).catch(function(){ prompt("Copia este texto:",full); });
      else prompt("Copia este texto:",full);
    };
    document.getElementById("morruos-close-share").onclick = function(){ overlay.remove(); };
  }

  window.shareText = function(title, text) { openSocialMenu(title, text); };

  // Captura el clic aunque el HTML tenga un onclick antiguo que llame a otra función.
  document.addEventListener("click", function(e) {
    const btn = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!btn) return;
    if ((btn.textContent || "").trim().toLowerCase() === "compartir partido") {
      e.preventDefault();
      e.stopImmediatePropagation();
      const card = btn.closest(".card");
      const titleNode = card && card.querySelector(".font-display.text-lg.font-bold.text-gold");
      const title = titleNode ? titleNode.textContent.trim() : "Los Morruos";
      const p = card ? card.querySelector(".mt-4.text-center p.text-sm") : null;
      const info = p ? p.textContent.trim() : "Próximo partido de Los Morruos";
      openSocialMenu(title, info);
    }
  }, true);
})();
`;

function injectFixes(html) {
  const all = FIREBASE_FIX_SCRIPT + ROBUST_USERS_SCRIPT + STARTUP_RECOVERY_SCRIPT + SOCIAL_SHARE_SCRIPT;
  const marker = "    const DEFAULT = {";
  if (html.includes(marker)) return html.replace(marker, all + "\n" + marker);
  if (html.includes("</body>")) return html.replace("</body>", "<script>" + all + "</script></body>");
  return html + "<script>" + all + "</script>";
}

self.addEventListener("install", function(event) {
  event.waitUntil(caches.open(CACHE).then(async function(cache) {
    for (const asset of ASSETS) {
      try {
        const res = await fetch(asset, {cache:"no-store"});
        if (!res.ok) continue;
        if (asset === "./index.html") {
          const html = await res.text();
          const fixed = injectFixes(html);
          await cache.put(asset, new Response(fixed, {status:res.status,statusText:res.statusText,headers:{"Content-Type":"text/html; charset=utf-8"}}));
        } else await cache.put(asset,res);
      } catch (_) {}
    }
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(key){return key!==CACHE;}).map(function(key){return caches.delete(key);}));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function(event) {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request,{cache:"no-store"}).then(async function(res){
    if (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/Los-Morruos-ap/") || url.pathname === "/") {
      try {
        const html = await res.clone().text();
        const fixed = injectFixes(html);
        res = new Response(fixed,{status:res.status,statusText:res.statusText,headers:res.headers});
      } catch (_) {}
    }
    const clone=res.clone();
    caches.open(CACHE).then(function(cache){cache.put(event.request,clone).catch(function(){});}).catch(function(){});
    return res;
  }).catch(function(){return caches.match(event.request).then(function(r){return r||caches.match("./index.html");});}));
});
