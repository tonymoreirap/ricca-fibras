// Service worker simples: busca na rede primeiro e guarda uma cópia
// para o site abrir mesmo sem internet.
const CACHE = "rica-v7";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/")))
  );
});

// Avisos do salão (notificações no celular)
self.addEventListener("push", (event) => {
  let m = {};
  try {
    m = event.data ? event.data.json() : {};
  } catch {
    m = { corpo: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(m.titulo || m.empresa || "Avisos do salão", {
      body: m.corpo || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: m.tag || undefined,
      renotify: Boolean(m.tag),
      vibrate: [120, 60, 120],
      data: { url: m.url || "/admin" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const alvo = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abertas) => {
      for (const c of abertas) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) {
          c.navigate(alvo).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(alvo);
    })
  );
});
