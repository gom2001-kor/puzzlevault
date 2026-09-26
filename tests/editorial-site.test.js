const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const languages = ['en', 'ko', 'ja', 'zh', 'es'];
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'js/blog-data.js'), 'utf8') + ';this.posts=BLOG_POSTS', context);
const posts = context.posts;
const articlePath = (slug, lang) => `/blog/${lang === 'en' ? 'posts' : lang}/${slug}.html`;

test('every registered guide is reachable without JavaScript in every published language', () => {
    const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
    for (const lang of languages) {
        const listing = fs.readFileSync(path.join(root, lang === 'en' ? 'blog/index.html' : `blog/${lang}/index.html`), 'utf8');
        const grid = listing.slice(listing.indexOf('id="blog-grid"'));
        for (const post of posts) {
            const url = articlePath(post.slug, lang);
            assert.ok(grid.includes(`href="${url}"`), `${lang} listing missing ${post.slug}`);
            const source = fs.readFileSync(path.join(root, url), 'utf8');
            assert.ok(source.includes(`<html lang="${lang}"`), url);
            assert.equal((source.match(/<h1[\s>]/g) || []).length, 1, url);
            assert.ok(source.includes('class="blog-content"'), url);
            assert.ok(source.includes('class="related-post-card"'), `static related links: ${url}`);
            for (const match of source.matchAll(/href="(\/games\/[^"]+)"/g)) {
                const target = new URL(match[1].replace(/&amp;/g, '&'), 'https://puzzlevault.pages.dev');
                assert.equal(target.searchParams.get('lang'), lang, `game link language: ${url}`);
            }
            assert.ok(!source.includes('[object Object]'), url);
            assert.ok(sitemap.includes(`https://puzzlevault.pages.dev${url}`), `sitemap: ${url}`);
            const schema = JSON.parse(source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
            assert.equal(schema.datePublished, post.date, url);
            assert.equal(schema.headline, post.title[lang], url);
            for (const alternate of languages) assert.ok(source.includes(`hreflang="${alternate}" href="https://puzzlevault.pages.dev${articlePath(post.slug, alternate)}"`), url);
        }
    }
});

test('all ten games have a localized route to a worked-example guide', () => {
    const entries = ['existing-guides', 'cognitive-guides', 'spatial-guides'].flatMap(name => JSON.parse(fs.readFileSync(path.join(root, `scripts/content/${name}.json`), 'utf8')));
    assert.equal(new Set(entries.map(entry => entry.game)).size, 10);
    for (const entry of entries) {
        const game = fs.readFileSync(path.join(root, `games/${entry.game}.html`), 'utf8');
        assert.ok(game.includes(`data-i18n-html="games.${entry.game}.articleGuide"`), entry.game);
        for (const lang of languages) {
            const translation = JSON.parse(fs.readFileSync(path.join(root, `lang/${lang}.json`), 'utf8'));
            assert.ok(translation.games[entry.game].articleGuide.includes(articlePath(entry.slug, lang)), `${entry.game}/${lang}`);
            const article = fs.readFileSync(path.join(root, articlePath(entry.slug, lang)), 'utf8');
            assert.match(article, /<figure[\s>]/, `${entry.game}/${lang} needs an example`);
            assert.match(article, /<figcaption[\s>]/, `${entry.game}/${lang} needs a caption`);
            assert.ok(article.includes(`/games/${entry.game}.html`), `${entry.game}/${lang} return to play`);
        }
    }
});
