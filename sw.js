/* Awesome Messenger — service worker: кэш файлов + клики по уведомлениям */
var CACHE = "am-v3-6";
var CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; /* база данных и QR ходят напрямую в сеть */

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (r) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", cp); });
        return r;
      }).catch(function () { return caches.match("./index.html"); })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (r) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return r;
      });
    })
  );
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var chatId = (e.notification.data || {}).chatId || "";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if ("focus" in c) {
          c.postMessage({ chatId: chatId });
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow("./?chat=" + chatId);
    })
  );
});
