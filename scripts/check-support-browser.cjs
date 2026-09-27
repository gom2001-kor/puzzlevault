/* Run: node scripts/check-support-browser.cjs [Playwright module] [origin]. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require(process.argv[2] || 'playwright');
const origin = process.argv[3] || 'http://127.0.0.1:8765';
const root = path.resolve(__dirname, '..');
const languages = ['en', 'ko', 'ja', 'zh', 'es'];
function luminance(rgb) {
    const values = rgb.match(/[\d.]+/g).slice(0, 3).map(n => Number(n) / 255)
        .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(foreground, background) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
}
(async () => {
    const browser = await chromium.launch({channel: 'msedge', headless: true});
    const checks = [], errors = [], external = [];
    try {
        for (const scheme of ['light', 'dark']) {
            const context = await browser.newContext({viewport: {width: 390, height: 844}, colorScheme: scheme, reducedMotion: 'reduce', serviceWorkers: 'block'});
            const page = await context.newPage();
            page.on('pageerror', error => errors.push(error.message));
            page.on('request', request => {
                if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + '/')) external.push(request.url());
            });
            for (const width of [320, 390, 1280]) {
                await page.setViewportSize({width, height: 844});
                for (const lang of languages) {
                    const prefix = lang === 'en' ? '/' : `/${lang}/`;
                    await page.goto(origin + prefix + 'contact.html');
                    const button = page.locator('main a.pv-btn-primary');
                    await button.waitFor();
                    const measured = await button.evaluate(node => {
                        const css = getComputedStyle(node), rect = node.getBoundingClientRect();
                        return {color: css.color, background: css.backgroundColor, height: rect.height,
                            overflow: document.documentElement.scrollWidth > innerWidth, href: node.getAttribute('href')};
                    });
                    assert.ok(contrast(measured.color, measured.background) >= 4.5, `${lang} ${scheme} ${width}: contact text contrast`);
                    assert.ok(measured.height >= 44, 'contact button touch target');
                    assert.equal(measured.overflow, false, `${lang} ${scheme} ${width}: page overflow`);
                    assert.equal(measured.href, 'https://forms.gle/NBjCNdVCBGaGGcbM9');
                    assert.equal(await page.locator('#learning-corrections').count(), 1);
                    assert.equal(await page.locator('#rights-reports').count(), 1);
                    const links = await page.locator('main .pv-editorial-callout a:not(.pv-btn)').evaluateAll(nodes => nodes.map(node => {
                        let parent = node.parentElement;
                        while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
                        return {color: getComputedStyle(node).color, background: getComputedStyle(parent || document.body).backgroundColor};
                    }));
                    for (const link of links) assert.ok(contrast(link.color, link.background) >= 4.5, `${lang} ${scheme}: support navigation contrast`);
                    await button.hover();
                    const hover = await button.evaluate(node => ({color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor}));
                    assert.ok(contrast(hover.color, hover.background) >= 4.5, 'hover contrast');
                    checks.push({lang, scheme, width, contrast: Number(contrast(measured.color, measured.background).toFixed(2)), height: measured.height});
                    if (lang === 'ko' && width === 390) {
                        await page.mouse.move(0, 0);
                        await page.screenshot({path: path.join(root, `docs/support-contact-${scheme}.png`), fullPage: true});
                    }
                }
            }
            await context.close();
        }
        const staticContext = await browser.newContext({viewport: {width: 390, height: 844}, javaScriptEnabled: false, serviceWorkers: 'block'});
        const page = await staticContext.newPage();
        for (const lang of languages) {
            const prefix = lang === 'en' ? '/' : `/${lang}/`;
            await page.goto(origin + prefix + 'privacy.html');
            assert.match(await page.locator('#english-content-updates').innerText(), /study-english2.pages.dev/);
            await page.goto(origin + prefix + 'about.html');
            assert.match(await page.locator('#english-learning').innerText(), /PuzzleVault English/);
            assert.equal(await page.locator('main a[href="/learn/english/guides/"]').count(), 1);
            await page.goto(origin + prefix + 'terms.html');
            assert.equal(await page.locator('#learning-materials').count(), 1);
        }
        await staticContext.close();
        assert.deepEqual(errors, []);
        assert.deepEqual(external, []);
        const report = {checkedAt: new Date().toISOString(), contactChecks: checks, staticLanguages: languages, pageErrors: errors, externalRequests: external};
        fs.writeFileSync(path.join(root, 'docs/support-browser-checks.json'), JSON.stringify(report, null, 2) + '\n');
        console.log(`Passed ${checks.length} contact contrast/layout checks and static support checks in ${languages.length} languages.`);
    } finally {
        await browser.close();
    }
})().catch(error => {console.error(error); process.exitCode = 1;});
