/* ===================================================
   PuzzleVault — Service Worker (sw.js)
   Cache game HTML/CSS/JS for offline play
   =================================================== */

const CACHE_NAME = 'puzzlevault-v1';
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

// Install: cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch: cache-first for assets, network-first for pages
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET and external requests
    if (event.request.method !== 'GET' || url.origin !== location.origin) return;

    // CSS/JS: cache-first
    if (url.pathname.match(/\.(css|js)$/)) {
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

    // HTML: network-first with cache fallback
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
