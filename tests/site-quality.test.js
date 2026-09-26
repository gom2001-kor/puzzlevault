const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/privacy-controls.js'), 'utf8');
const KEY = 'pv_privacy_v1';
const GA = 'G-K90N7DX7S6';

function browser({ stored, hostname = 'puzzlevault.pages.dev', blocked = false } = {}) {
    const store = new Map([['pv_game_quickcalc', '900'], ['pv_numvault_progress', 'saved']]);
    if (stored !== undefined) store.set(KEY, typeof stored === 'string' ? stored : JSON.stringify(stored));
    const listeners = {}, appended = [], cookieWrites = [];
    function node(tag) {
        const el = { tagName: tag.toUpperCase(), children: [], attrs: {}, parent: null, id: '',
            setAttribute(name, value) { this.attrs[name] = value; },
            appendChild(child) { child.parent = this; this.children.push(child); if (this === document.head) appended.push(child); return child; },
            append(...children) { children.forEach(child => this.appendChild(child)); },
            remove() { if(this.parent) this.parent.children = this.parent.children.filter(child => child !== this); },
            addEventListener(type, callback) { this[type] = callback; },
            focus() { document.activeElement = this; },
            querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
            querySelectorAll(selector) {
                const tags = selector.split(',').map(value => value.trim().toUpperCase());
                const descend = current => current.children.flatMap(child => [child, ...descend(child)]);
                return descend(this).filter(child => tags.includes(child.tagName));
            }
        };
        return el;
    }
    const document = { documentElement: { lang: 'en' }, activeElement: null,
        createElement: node,
        addEventListener: (type, callback) => { listeners[type] = callback; },
        querySelectorAll: () => [],
        getElementById(id) {
            const find = el => el.id === id ? el : el.children.map(find).find(Boolean);
            return find(document.head) || find(document.body) || null;
        }
    };
    document.head = node('head'); document.body = node('body');
    const publisher = node('meta'); publisher.attrs.name = 'google-adsense-account'; publisher.attrs.content = 'ca-pub-6035096210993315'; document.head.appendChild(publisher);
    const footer = node('footer'); footer.id = 'pv-footer'; document.body.appendChild(footer);
    appended.length = 0;
    Object.defineProperty(document, 'cookie', { get: () => '_ga=ga-data; _ga_TEST=ga-test; _gid=session; pv_lang=ko; pv_game=unchanged', set: value => cookieWrites.push(value) });
    const window = { location: { hostname }, addEventListener: (type, callback) => { listeners[type] = callback; },
        localStorage: {
            getItem(key) { if(blocked) throw new Error('SecurityError'); return store.get(key) ?? null; },
            setItem(key, value) { if(blocked) throw new Error('SecurityError'); store.set(key, value); }
        }
    };
    const context = vm.createContext({ window, document, queueMicrotask: callback => callback() });
    vm.runInContext(source, context);
    const ready = () => listeners.DOMContentLoaded();
    return { window, document, store, appended, cookieWrites, ready, listeners, publisher };
}

test('privacy dialog keys stay inside the modal without blocking choice buttons', () => {
    const env = browser(); env.ready(); env.window.PVPrivacy.open();
    const overlay = env.document.getElementById('pv-privacy-dialog');
    let gameInputs = 0;
    for (const key of ['Enter', '1', 'ArrowLeft']) {
        let stopped = false, prevented = false;
        overlay.keydown({ key, stopPropagation() { stopped = true; }, preventDefault() { prevented = true; } });
        if (!stopped) gameInputs++;
        assert.equal(prevented, false, 'normal button activation must remain available');
    }
    assert.equal(gameInputs, 0);
    overlay.querySelector('button').onclick();
    assert.equal(JSON.parse(env.store.get(KEY)).analytics, false);
    assert.equal(env.store.get('pv_numvault_progress'), 'saved');
    assert.equal(env.document.getElementById('pv-privacy-dialog'), null);
});

test('new and refused visitors make no optional requests', () => {
    for (const stored of [undefined, { version: 1, analytics: false }]) {
        const env = browser({ stored }); env.ready();
        assert.equal(env.appended.length, 0);
        assert.equal(env.window.gtag, undefined);
        assert.equal(env.window.PVPrivacy.getChoice().analytics, false);
        assert.ok(env.document.getElementById('pv-privacy-controls'));
    }
});

test('approving does not reload a live game; only a subsequent production page loads GA', () => {
    const env = browser(); env.ready();
    env.window.PVPrivacy.choose(true);
    assert.equal(env.appended.length, 0);
    assert.equal(env.store.get('pv_game_quickcalc'), '900');
    const next = browser({ stored: env.store.get(KEY) }); next.ready(); next.ready();
    assert.equal(next.appended.length, 1);
    assert.equal(next.appended[0].src, 'https://www.googletagmanager.com/gtag/js?id=' + GA);
    assert.equal(next.window['ga-disable-' + GA], false);
    const commands = next.window.dataLayer.map(args => Array.from(args));
    const consent = commands.find(args => args[0] === 'consent')[2];
    assert.equal(consent.analytics_storage, 'granted');
    assert.equal(consent.ad_storage, 'denied');
    assert.equal(consent.ad_user_data, 'denied');
    assert.equal(consent.ad_personalization, 'denied');
    const config = commands.find(args => args[0] === 'config')[2];
    assert.equal(config.allow_google_signals, false);
    assert.equal(config.allow_ad_personalization_signals, false);
    assert.ok(next.appended.every(el => !/clarity|googlesyndication|doubleclick/.test(el.src || '')));
});

test('saved approval never starts production analytics on previews or lookalike hosts', () => {
    for (const hostname of ['localhost', '127.0.0.1', 'preview.puzzlevault.pages.dev', 'puzzlevault.pages.dev.evil.example']) {
        const env = browser({ hostname, stored: { version: 1, analytics: true } }); env.ready();
        assert.equal(env.appended.length, 0, hostname);
        assert.equal(env.window.gtag, undefined, hostname);
    }
});

test('revocation disables GA and removes only analytics cookies, preserving game saves and metadata', () => {
    const env = browser({ stored: { version: 1, analytics: true } }); env.ready();
    env.window.PVPrivacy.choose(false);
    assert.equal(env.window['ga-disable-' + GA], true);
    assert.equal(JSON.parse(env.store.get(KEY)).analytics, false);
    assert.equal(env.store.get('pv_game_quickcalc'), '900');
    assert.equal(env.store.get('pv_numvault_progress'), 'saved');
    assert.ok(env.cookieWrites.length > 0);
    assert.ok(env.cookieWrites.every(value => /^_ga(?:_|=)|^_gid=|^_gat(?:_|=)/.test(value)));
    assert.ok(env.cookieWrites.every(value => !value.includes('pv_game') && !value.includes('pv_lang')));
    const last = Array.from(env.window.dataLayer.at(-1));
    assert.equal(last[0], 'consent'); assert.equal(last[1], 'update');
    assert.equal(last[2].analytics_storage, 'denied');
    assert.equal(env.document.head.children.includes(env.publisher), true);
    assert.equal(env.publisher.attrs.content, 'ca-pub-6035096210993315');
});

test('corrupt, unexpected, or inaccessible storage stays private and interactive', () => {
    for (const stored of ['{bad', 'null', { version: 2, analytics: true }, { version: 1, analytics: 'yes' }]) {
        const env = browser({ stored }); env.ready();
        assert.equal(env.appended.length, 0);
        assert.equal(env.window.PVPrivacy.getChoice().analytics, false);
    }
    const env = browser({ blocked: true }); env.ready();
    assert.doesNotThrow(() => { env.window.PVPrivacy.open(); env.window.PVPrivacy.choose(false); });
    assert.equal(env.appended.length, 0);
    assert.equal(env.store.get('pv_game_quickcalc'), '900');
});

test('public HTML retains the ads.txt publisher metadata without standalone tracker tags', () => {
    const ads = fs.readFileSync(path.join(root, 'ads.txt'), 'utf8');
    const expected = 'ca-' + ads.match(/google\.com,\s*(pub-\d+)/)[1];
    const excluded = new Set(['.git', '.agent', '.agents', '.codex', 'node_modules', 'docs', 'tests', 'scripts']);
    function walk(folder) {
        return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
            if(excluded.has(entry.name)) return [];
            const file = path.join(folder, entry.name);
            return entry.isDirectory() ? walk(file) : (/\.html$/.test(entry.name) && !['solution.html', '_template.html'].includes(entry.name) ? [file] : []);
        });
    }
    for (const file of walk(root)) {
        const html = fs.readFileSync(file, 'utf8');
        const publisher = (html.match(/<meta\b[^>]*>/gi) || []).find(tag => /\bname\s*=\s*["']google-adsense-account["']/i.test(tag));
        assert.ok(publisher && publisher.includes(expected), file);
        assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=\s*["'][^"']*(?:googletagmanager|google-analytics|googlesyndication|clarity\.ms|doubleclick)/i, file);
    }
});

test('static audit handles aliases, language directories, queries and JS templates; real blockers fail', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-audit-'));
    assert.ok(path.resolve(fixture).startsWith(path.resolve(os.tmpdir()) + path.sep));
    const page = (canonical, body = '') => `<!doctype html><title>Fixture</title><meta name="description" content="Fixture page"><meta name="google-adsense-account" content="ca-pub-123"><link rel="canonical" href="https://puzzlevault.pages.dev${canonical}"><header id="pv-header"><a href="/">Home</a></header>${body}<footer id="pv-footer">Footer</footer>`;
    try {
        fs.mkdirSync(path.join(fixture, 'games')); fs.mkdirSync(path.join(fixture, 'ko')); fs.mkdirSync(path.join(fixture, 'docs'));
        fs.writeFileSync(path.join(fixture, 'ads.txt'), 'google.com, pub-123, DIRECT, cert');
        fs.writeFileSync(path.join(fixture, '_redirects'), '/demo /games/demo.html 200');
        fs.writeFileSync(path.join(fixture, 'index.html'), page('/', '<a href="/demo?seed=2#board">Play</a><a href="/ko/">한국어</a><div id="shared"></div><script>const html=\'<div id="shared"></div>\';</script><script type="text/plain" src="https://www.clarity.ms/tag/inert"></script>'));
        fs.writeFileSync(path.join(fixture, 'games/demo.html'), page('/games/demo', '<div id="board"></div>'));
        fs.writeFileSync(path.join(fixture, 'ko/index.html'), page('/ko/', '<a href="/demo">Play</a>'));
        fs.writeFileSync(path.join(fixture, 'docs/ignored.html'), 'broken draft');
        const run = () => spawnSync('python', [path.join(root, 'scripts/audit-site.py'), '--root', fixture], { encoding: 'utf8' });
        let result = run(); assert.equal(result.status, 0, result.stdout + result.stderr);
        let report = JSON.parse(result.stdout); assert.equal(report.pages_checked, 3); assert.equal(report.blocker_count, 0);
        fs.appendFileSync(path.join(fixture, 'index.html'), '<a href="/demo#missing">Missing</a><img src="/missing.png"><div id="shared"></div><script src="https://www.clarity.ms/tag/test"></script>');
        result = run(); assert.equal(result.status, 1);
        report = JSON.parse(result.stdout);
        for (const code of ['missing_fragment', 'broken_local_reference', 'duplicate_id', 'tracking_before_consent']) assert.ok(report.blockers.some(item=>item.code===code), code);
        fs.writeFileSync(path.join(fixture, 'ads.txt'), 'google.com, pub-456, DIRECT, cert');
        assert.ok(JSON.parse(run().stdout).blockers.some(item=>item.code==='publisher_mismatch'));
    } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});

test('the current public site passes the same audit used before publishing', () => {
    const result = spawnSync('python', [path.join(root, 'scripts/audit-site.py')], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const report = JSON.parse(result.stdout);
    assert.ok(report.pages_checked > 0);
    assert.equal(report.games_checked, 10);
    assert.equal(report.blocker_count, 0);
});
