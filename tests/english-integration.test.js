const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

test('the published learning app resolves local assets under its nested canonical URL', () => {
    const html = fs.readFileSync(path.join(root, 'learn/english/index.html'), 'utf8');
    assert.match(html, /<html lang="ko">/);
    assert.match(html, /rel="canonical" href="https:\/\/puzzlevault.pages.dev\/learn\/english\/"/);
    const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1]);
    assert.ok(refs.some(ref => /^\/learn\/english\/assets\/.*\.js$/.test(ref)));
    assert.ok(!refs.some(ref => /^\/(assets|src)\//.test(ref)), 'Vite assets must not escape the module');
    for (const ref of refs.filter(ref => ref.startsWith('/'))) {
        assert.ok(fs.existsSync(path.join(root, ref.split(/[?#]/)[0])), `Missing ${ref}`);
    }
    assert.match(html, /<noscript>/);
    assert.match(html, /THIRD-PARTY-NOTICES/);
});

test('the root worker precaches every learning bundle without duplicate content-hashed URLs', () => {
    const context = vm.createContext({ self: { addEventListener() {} } });
    vm.runInContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8') + '\nthis.assets = ASSETS;', context);
    const urls = [...context.assets];
    for (const file of fs.readdirSync(path.join(root, 'learn/english/assets'))) {
        const url = '/learn/english/assets/' + file;
        assert.ok(urls.includes(url), `Offline cache missed ${url}`);
        assert.equal(urls.filter(item => item.startsWith(url)).length, 1);
    }
    for (const url of ['/learn/english/', '/learn/english/index.html', '/learn/english/THIRD-PARTY-NOTICES.txt']) assert.ok(urls.includes(url));
    assert.ok(urls.every(url => !url.startsWith('/apps/')));
});

test('learning discovery and storage notices are available in all five site languages', () => {
    for (const lang of ['en', 'ko', 'ja', 'zh', 'es']) {
        const prefix = lang === 'en' ? '' : lang + '/';
        const home = fs.readFileSync(path.join(root, prefix + 'index.html'), 'utf8');
        assert.match(home, /href="\/learn\/english\//, lang);
        const policy = fs.readFileSync(path.join(root, prefix + 'privacy.html'), 'utf8');
        assert.match(policy, /pv_english_reading_v2/, lang);
        assert.match(policy, /pv_english_quest_v1/, lang);
    }
});
