/* ===================================================
   PuzzleVault — Service Worker (sw.js)
   Cache game HTML/CSS/JS for offline play
   =================================================== */

const CACHE_VERSION = 17;
const CACHE_NAME = 'puzzlevault-v' + CACHE_VERSION;
const ASSETS = [
    '/',
    '/index.html',
    '/css/global.css',
    '/js/pv3d.js',
    '/css/flagship.css',
    '/js/flagship.js',
    '/css/mosslight.css',
    '/css/cloudweft.css',
    '/games/mosslight.html',
    '/games/cloudweft.html',
    '/games/mosslight-logic.js',
    '/games/cloudweft-logic.js',
    '/css/arcade.css',
    '/css/site-quality.css',
    '/css/blog.css',
    '/js/blog-ui.js',
    '/js/canvas-depth.js',
    '/js/privacy-controls.js',
    '/js/progression.js',
    '/js/arcade.js',
    '/js/duel.js',
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
    '/ko/',
    '/ja/',
    '/zh/',
    '/es/',
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

// Keep the same privacy and support information available with offline games.
for (const language of ['ko', 'ja', 'zh', 'es']) {
    for (const page of ['about', 'privacy', 'terms', 'contact']) {
        ASSETS.push('/' + language + '/' + page + '.html');
    }
}

// HTML references versioned assets so an older worker cannot serve stale game code.
ASSETS.push(...ASSETS.filter(asset => /\.(css|js|json)$/.test(asset)).map(asset => asset + '?v=' + CACHE_VERSION));

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
                keys.filter(key => key.startsWith('puzzlevault-v') && key !== CACHE_NAME).map(key => caches.delete(key))
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

    // External ad requests are excluded above; the local ad controller is needed offline.

    // CSS/JS/JSON: cache-first (game assets)
    if (url.pathname.match(/\.(css|js|json)$/)) {
        event.respondWith(
            caches.match(event.request).then(cached =>
                cached || fetch(event.request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
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
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(async () => (await caches.match(event.request)) || (await caches.match(url.pathname)) || new Response('Offline', { status: 503 }))
    );
});
