const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const rules = fs.readFileSync(path.join(root, '_redirects'), 'utf8').split(/\r?\n/)
    .map(line => line.trim()).filter(line => line && !line.startsWith('#')).map(line => line.split(/\s+/));

test('the root URL is served as the English home without language negotiation', () => {
    // A Pages Function in functions/ would run before static files and could redirect by Accept-Language.
    assert.equal(fs.existsSync(path.join(root, 'functions/_middleware.js')), false);
    assert.ok(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('<html lang="en"'));
    assert.ok(fs.readFileSync(path.join(root, 'ko/index.html'), 'utf8').includes('<html lang="ko"'));
    assert.ok(!rules.some(([source]) => source === '/'), 'no rule may rewrite or redirect the root');
});

test('/en and every /en/ path permanently redirect to the root English URLs', () => {
    const index = source => rules.findIndex(([from]) => from === source);
    assert.deepEqual(rules[index('/en')], ['/en', '/', '301']);
    assert.deepEqual(rules[index('/en/*')], ['/en/*', '/:splat', '301']);
    // Cloudflare applies the first matching rule, so the English aliases come before other rules.
    assert.ok(index('/en') < 2 && index('/en/*') < 2);
    assert.equal(fs.existsSync(path.join(root, 'en')), false);
});
