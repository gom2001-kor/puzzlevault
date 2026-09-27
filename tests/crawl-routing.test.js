const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'functions/_middleware.js'), 'utf8');
const middleware = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const request = (pathname = '/', headers = {}, method = 'GET') => new Request('https://puzzlevault.pages.dev' + pathname, { headers, method });

test('language preference uses the exact cookie and honors an explicit English selection', async () => {
    const { chooseLanguage } = await middleware;
    assert.equal(chooseLanguage(new Headers({ Cookie: 'x=1; pv_lang=ko; y=2', 'Accept-Language': 'es' })), 'ko');
    assert.equal(chooseLanguage(new Headers({ Cookie: 'pv_lang=en', 'Accept-Language': 'ko' })), 'en');
    for (const cookie of ['preview_pv_lang=ko', 'pv_lang=ko-malformed', 'pv_lang=xx']) {
        assert.equal(chooseLanguage(new Headers({ Cookie: cookie, 'Accept-Language': 'es' })), 'es');
    }
});

test('language negotiation respects quality order and ignores refused or malformed choices', async () => {
    const { chooseLanguage } = await middleware;
    for (const [value, expected] of [
        ['ko;q=0,es;q=0.8,en;q=1', 'en'],
        ['ko;q=0.2,ja-JP;q=0.9,en;q=0.5', 'ja'],
        ['de;q=1,zh-Hant;q=0.8,es;q=0.8', 'zh'],
        ['ko;q=bad,es;q=2,ja;q=-1', 'en'],
        ['', 'en']
    ]) assert.equal(chooseLanguage(new Headers({ 'Accept-Language': value })), expected, value);
});

test('root language redirect preserves query and cannot be reused across visitors', async () => {
    const { onRequest } = await middleware;
    const response = await onRequest({ request: request('/?source=challenge', { 'Accept-Language': 'ko' }), next: () => { throw new Error('not needed'); } });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), 'https://puzzlevault.pages.dev/ko/?source=challenge');
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.match(response.headers.get('Vary'), /Accept-Language/);
    assert.match(response.headers.get('Vary'), /Cookie/);
});

test('English root remains content with origin headers and correct cache variation', async () => {
    const { onRequest } = await middleware;
    const response = await onRequest({ request: request(), next: async () => new Response('English homepage', {
        status: 200, headers: { Vary: 'Accept-Encoding', 'Content-Type': 'text/html', ETag: 'version19' }
    }) });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'English homepage');
    assert.equal(response.headers.get('ETag'), 'version19');
    assert.match(response.headers.get('Vary'), /Accept-Encoding/);
    assert.match(response.headers.get('Vary'), /Cookie/);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});

test('crawler files and every explicit page bypass automatic language negotiation', async () => {
    const { onRequest } = await middleware;
    for (const pathname of ['/ads.txt', '/robots.txt', '/sitemap.xml', '/ko/', '/games/numvault.html', '/learn/english/']) {
        const original = new Response('original content');
        const response = await onRequest({ request: request(pathname, { 'Accept-Language': 'ko' }), next: async () => original });
        assert.equal(response, original, pathname);
        assert.equal(response.headers.get('Location'), null);
    }
});

test('language handling leaves non-navigation methods to the origin', async () => {
    const { onRequest } = await middleware;
    const original = new Response('method handled by origin', { status: 405 });
    const response = await onRequest({ request: request('/', { 'Accept-Language': 'ko' }, 'POST'), next: async () => original });
    assert.equal(response, original);
    const head = await onRequest({ request: request('/', { 'Accept-Language': 'ja' }, 'HEAD'), next: () => original });
    assert.equal(head.status, 302);
    assert.equal(await head.text(), '');
});
