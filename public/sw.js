// Service Worker của QLĐT: chỉ lo Web Push (mục 4.5). Không cache nội dung để tránh hiển thị dữ liệu cũ.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { tieu_de: "Thông báo mới", noi_dung: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(d.tieu_de || "Thông báo mới", {
      body: d.noi_dung || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: d.id || undefined,
      data: { url: d.lien_ket || "/thong-bao" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/thong-bao";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          return c.focus().then(() => ("navigate" in c ? c.navigate(url) : undefined));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
