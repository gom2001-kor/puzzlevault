const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function initialize({ pathname, saved = null, browser = 'en-US', storageUnavailable = false }) {
    const fetched = [];
    const document = {
        cookie: '',
        documentElement: { lang: 'en', getAttribute: () => null },
        querySelectorAll: () => [], querySelector: () => null
    };
    const context = vm.createContext({
        window: { location: { pathname } }, document,
        navigator: { language: browser },
        localStorage: { getItem() { if (storageUnavailable) throw new Error('Storage unavailable'); return saved; } },
        fetch: async url => { fetched.push(url); return { ok: true, json: async () => ({}) }; }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/i18n.js'), 'utf8'), context);
    await vm.runInContext('I18n.init()', context);
    return { language: vm.runInContext('I18n.currentLang', context), document, fetched };
}

test('English static policy and about pages keep English despite a saved foreign language', async () => {
    for (const pathname of ['/about.html', '/privacy.html', '/contact.html', '/terms.html', '/about', '/privacy', '/contact/', '/terms/']) {
        const result = await initialize({ pathname, saved: 'ko', browser: 'ja-JP' });
        assert.equal(result.language, 'en', pathname);
        assert.equal(result.document.documentElement.lang, 'en', pathname);
        assert.match(result.fetched[0], /^\/lang\/en\.json(?:\?|$)/);
    }
});

test('English article routes keep English while localized article and policy routes honor their URL', async () => {
    for (const [pathname, expected] of [
        ['/blog/posts/numvault-tips-and-strategy.html', 'en'],
        ['/blog/posts/numvault-tips-and-strategy', 'en'],
        ['/ko/privacy.html', 'ko'], ['/ja/about', 'ja'],
        ['/blog/zh/the-math-behind-sortstack.html', 'zh'], ['/es/terms.html', 'es']
    ]) {
        const result = await initialize({ pathname, saved: 'ko', browser: 'en-US' });
        assert.equal(result.language, expected, pathname);
        assert.equal(result.document.documentElement.lang, expected, pathname);
    }
});

test('shared games and the dynamic home retain saved language preferences', async () => {
    for (const pathname of ['/games/quickcalc.html', '/quickcalc', '/', '/index.html']) {
        const result = await initialize({ pathname, saved: 'ko', browser: 'en-US' });
        assert.equal(result.language, 'ko', pathname);
    }
});

test('unavailable storage still permits browser detection for games and path language for static pages', async () => {
    const game = await initialize({ pathname: '/games/patternpop.html', browser: 'ja-JP', storageUnavailable: true });
    assert.equal(game.language, 'ja');
    const english = await initialize({ pathname: '/privacy.html', browser: 'ja-JP', storageUnavailable: true });
    assert.equal(english.language, 'en');
    const localized = await initialize({ pathname: '/blog/es/numvault-tips-and-strategy.html', browser: 'ja-JP', storageUnavailable: true });
    assert.equal(localized.language, 'es');
});
