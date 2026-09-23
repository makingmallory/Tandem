const OFFLINE_URL = "/offline.html";
const STATIC_CACHE = "tandem-shell-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll([
    OFFLINE_URL,
    "/icons/app-icon-192.png",
    "/icons/maskable-icon-512.png",
  ])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Authenticated pages and data stay network-only. Only failed document
  // navigations receive the pre-cached, non-personalized offline page.
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json() ?? {};
  event.waitUntil(self.registration.showNotification(payload.title ?? "Reminder", {
    body: payload.body ?? "There is something on your shared list.",
    icon: "/icons/app-icon-192.png",
    badge: "/icons/app-icon-192.png",
    data: { url: payload.url ?? "/" },
    tag: payload.tag,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/", self.location.origin);
  if (target.origin !== self.location.origin) target.pathname = "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    return existing ? existing.focus().then(() => existing.navigate(target.href)) : self.clients.openWindow(target.href);
  }));
});
