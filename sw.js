// Heinz UI service worker: network first, cache as fallback (so the app opens offline). Never touches /api/.
var CACHE = 'aiuiheinz-v1';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
    var u = new URL(e.request.url);
    if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.indexOf('/api/') === 0) return;
    e.respondWith(fetch(e.request).then(function (r) {
        if (r.ok) { var c = r.clone(); caches.open(CACHE).then(function (ch) { ch.put(e.request, c); }); }
        return r;
    }).catch(function () { return caches.match(e.request); }));
});
