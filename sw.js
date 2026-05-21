/**
 * 轻量 SW：只缓存壳与 PWA 图标，不缓存 MediaPipe WASM / CDN
 */
var CACHE_SHELL = 'vn-shell-v3-edge';
var SHELL_ASSETS = [
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/assets/pwa/icon-256.png',
    '/assets/pwa/icon-192.png',
    '/assets/pwa/icon-512.png',
    '/assets/pwa/icon-512-maskable.png',
    '/favicon.ico'
];

var NEVER_CACHE = [
    /mediapipe/i,
    /\.wasm$/i,
    /cdn\.|jsdelivr|unpkg|bootcdn|gstatic\.com|googleapis\.com|firebase/i,
    /vendor\/mediapipe/i,
    /firebase\//i
];

function shouldSkipCache(url) {
    var path = url.pathname || '';
    return NEVER_CACHE.some(function (re) {
        return re.test(url.href) || re.test(path);
    });
}

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_SHELL).then(function (cache) {
            return cache.addAll(SHELL_ASSETS).catch(function (err) {
                console.warn('[sw] precache partial', err);
            });
        }).then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (key) {
                if (key !== CACHE_SHELL) return caches.delete(key);
            }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (event) {
    if (event.request.method !== 'GET') return;
    var url;
    try { url = new URL(event.request.url); } catch (e) { return; }
    if (url.origin !== self.location.origin) return;
    if (shouldSkipCache(url)) return;

    var isShell =
        url.pathname.endsWith('manifest.json') ||
        url.pathname.indexOf('/assets/pwa/') >= 0 ||
        url.pathname.endsWith('favicon.ico');

    if (!isShell) return;

    event.respondWith(
        caches.match(event.request).then(function (cached) {
            if (cached) return cached;
            return fetch(event.request).then(function (res) {
                if (!res || res.status !== 200) return res;
                var copy = res.clone();
                caches.open(CACHE_SHELL).then(function (cache) {
                    cache.put(event.request, copy);
                });
                return res;
            });
        })
    );
});
