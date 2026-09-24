const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const languages = ['en', 'ko', 'ja', 'zh', 'es'];
const homes = languages.map(lang => lang === 'en' ? 'index.html' : `${lang}/index.html`);
const games = fs.readdirSync(path.join(root, 'games')).filter(file => file.endsWith('.html')).map(file => `games/${file}`);

test('all ten games and five homes load progress before common initialization', () => {
    assert.equal(games.length, 10);
    for (const file of [...homes, ...games]) {
        const html = read(file);
        assert.match(html, /src="\/js\/arcade\.js/);
        assert.match(html, /href="\/css\/arcade\.css/);
        assert.ok(html.indexOf('src="/js/progression.js') < html.indexOf('src="/js/common.js'), file);
        const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
        // Inspect static markup; inline templates may intentionally repeat runtime IDs.
        const staticIds = [...html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
        assert.equal(new Set(staticIds).size, staticIds.length, `Duplicate HTML id in ${file}`);
        assert.ok(ids.length > 0);
    }
});

test('all UI keys and interpolation parameters are available in all five languages', () => {
    const en = JSON.parse(read('lang/en.json')).arcade;
    for (const lang of languages) {
        const strings = JSON.parse(read(`lang/${lang}.json`)).arcade;
        assert.deepEqual(Object.keys(strings).sort(), Object.keys(en).sort());
        for (const [key, value] of Object.entries(en)) {
            assert.deepEqual((strings[key].match(/\{\w+\}/g) || []).sort(), (value.match(/\{\w+\}/g) || []).sort(), `${lang}.${key}`);
        }
    }
    for (const file of homes) {
        for (const [, key] of read(file).matchAll(/data-i18n="arcade\.([^"]+)"/g)) assert.ok(en[key], `${file}: ${key}`);
    }
});

test('every local script and stylesheet exists and all inline JS parses', () => {
    for (const file of [...homes, ...games]) {
        const html = read(file);
        for (const [, asset] of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^" ]*)?)"/g)) {
            if (/^https?:/.test(asset)) continue;
            const clean = asset.split('?')[0];
            const resolved = clean.startsWith('/') ? path.join(root, clean) : path.join(root, path.dirname(file), clean);
            assert.ok(fs.existsSync(resolved), `${file}: ${asset}`);
        }
        for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
            if (/src=|application\/ld\+json/.test(match[1])) continue;
            new vm.Script(match[2], { filename: file });
        }
    }
});

test('service worker precache resolves all assets including the new game loop', () => {
    const context = vm.createContext({ self: { addEventListener() {} } });
    vm.runInContext(read('sw.js') + '\nglobalThis.assets = ASSETS;', context);
    for (const asset of context.assets) {
        let clean = asset.split('?')[0];
        if (clean.endsWith('/')) clean += 'index.html';
        assert.ok(fs.existsSync(path.join(root, clean)), asset);
    }
    for (const asset of ['/js/progression.js', '/js/arcade.js', '/js/duel.js', '/css/arcade.css']) assert.ok(context.assets.includes(asset));
});

test('offline shared challenge URLs reuse the precached game page', async () => {
    const listeners = {};
    const cachedPage = new Response('<html>QuickCalc</html>');
    const context = vm.createContext({
        self: { addEventListener(type, callback) { listeners[type] = callback; } },
        location: { origin: 'https://puzzlevault.pages.dev' }, URL, Response,
        fetch: () => Promise.reject(new Error('offline')),
        caches: { match: async request => request === '/games/quickcalc.html' ? cachedPage : undefined }
    });
    vm.runInContext(read('sw.js'), context);
    let response;
    listeners.fetch({ request: { method: 'GET', url: 'https://puzzlevault.pages.dev/games/quickcalc.html?mode=blitz&seed=123&target=900' }, respondWith(value) { response = value; } });
    assert.equal(await (await response).text(), '<html>QuickCalc</html>');
});

test('offline local ad controller is cached while external ad traffic is untouched', async () => {
    const listeners = {};
    const context = vm.createContext({
        self: { addEventListener(type, callback) { listeners[type] = callback; } },
        location: { origin: 'https://puzzlevault.pages.dev' }, URL, Response,
        fetch: () => { throw new Error('Network must not be used for a cached script'); },
        caches: { match: async () => new Response('/* cached controller */') }
    });
    vm.runInContext(read('sw.js'), context);
    let response;
    listeners.fetch({ request: { method: 'GET', url: 'https://puzzlevault.pages.dev/js/adsense.js?v=12' }, respondWith(value) { response = value; } });
    assert.equal(await (await response).text(), '/* cached controller */');
    let intercepted = false;
    listeners.fetch({ request: { method: 'GET', url: 'https://pagead2.googlesyndication.com/ad.js' }, respondWith() { intercepted = true; } });
    assert.equal(intercepted, false);
});
