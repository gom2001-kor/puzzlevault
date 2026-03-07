/* ===================================================
   PuzzleVault — Service Worker (sw.js)
   Cache game HTML/CSS/JS for offline play
   =================================================== */

const CACHE_VERSION = 4;
const CACHE_NAME = 'puzzlevault-v' + CACHE_VERSION;
const ASSETS = [
    '/',
    '/index.html',
    '/css/global.css',
    '/js/common.js',
    '/js/adsense.js',
    '/js/seed.js',
    '/js/sfx.js',
    '/js/share.js',
    '/js/blog-data.js',
    '/js/i18n.js',
    '/lang/en.json',
    '/lang/ko.json',
    '/lang/ja.json',
    '/lang/zh.json',
    '/lang/es.json',
    '/manifest.json',
    '/about.html',
    '/privacy.html',
    '/terms.html',
    '/contact.html',
    '/games/numvault.html',
    '/games/gridsmash.html',
    '/games/patternpop.html',
    '/games/sortstack.html',
    '/games/quickcalc.html',
    '/games/tileturn.html',
    '/games/colorflow.html',
    '/games/pipelink.html',
    '/games/mergechain.html',
    '/games/hexmatch.html',
    '/games/numvault-logic.js',
    '/games/gridsmash-logic.js',
    '/games/patternpop-logic.js',
    '/games/sortstack-logic.js',
    '/games/quickcalc-logic.js',
    '/games/tileturn-logic.js',
    '/games/colorflow-logic.js',
    '/games/colorflow-levels.js',
    '/games/pipelink-logic.js',
    '/games/mergechain-logic.js',
    '/games/hexmatch-logic.js',
];

// Install: precache all core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean old caches + notify clients of update
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        ).then(() => {
            // Notify all clients that a new version is available
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
                });
            });
        })
    );
    self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET and external requests
    if (event.request.method !== 'GET' || url.origin !== location.origin) return;

    // Ad-related requests: network-first, don't cache
    if (url.hostname.includes('googlesyndication') ||
        url.hostname.includes('doubleclick') ||
        url.hostname.includes('googleads') ||
        url.pathname.includes('/adsense')) {
        event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
        return;
    }

    // CSS/JS/JSON: cache-first (game assets)
    if (url.pathname.match(/\.(css|js|json)$/)) {
        event.respondWith(
            caches.match(event.request).then(cached =>
                cached || fetch(event.request).then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
            )
        );
        return;
    }

    // HTML: network-first with cache fallback (offline support)
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
