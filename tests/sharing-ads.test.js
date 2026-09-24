const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function sandbox(file, overrides = {}) {
    const timers = new Map();
    const elements = [];
    const events = [];
    const storage = new Map();
    let timerId = 0;
    let time = 1000000;
    const drawing = [];
    const ctx = {
        createLinearGradient: () => ({ addColorStop() {} }),
        fillRect() {},
        fillText: (...args) => drawing.push(args),
        measureText: text => ({ width: String(text).length * 12 })
    };
    const document = {
        documentElement: { lang: 'en' },
        activeElement: { focus() {} },
        body: { appendChild: element => elements.push(element) },
        querySelector: () => null,
        getElementById: () => { throw new Error('Ad UI must not be touched'); },
        execCommand: () => false,
        createElement: tag => ({
            tag, style: {}, classList: { add() {}, remove() {} },
            setAttribute() {}, select() {}, focus() {}, remove() {},
            click() { this.clicked = true; },
            getContext: () => ctx,
            toBlob: callback => callback({ type: 'image/png' })
        })
    };
    class TestURL extends URL {
        static createObjectURL() { return 'blob:test-card'; }
        static revokeObjectURL() {}
    }
    const context = vm.createContext({
        navigator: {}, document, URL: TestURL,
        window: { confirm: () => true, location: { href: 'https://puzzlevault.pages.dev/' } },
        sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
        clearTimeout: id => timers.delete(id),
        Date: class extends Date { static now() { return time; } },
        gtag: (...args) => events.push(args),
        ...overrides
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context);
    return {
        context, timers, elements, events, drawing, storage,
        advance: ms => { time += ms; },
        ads: file === 'adsense.js' ? vm.runInContext('AdController', context) : null
    };
}

function withProvider(provider) {
    const env = sandbox('adsense.js');
    env.ads.configure({ enabled: true, provider });
    return env;
}

test('dismissed native sharing never copies or emits a share event', async () => {
    let copies = 0;
    const env = sandbox('share.js', { navigator: {
        share: async () => { throw Object.assign(new Error('cancel'), { name: 'AbortError' }); },
        clipboard: { writeText: async () => { copies++; } }
    } });
    assert.equal((await env.context.shareResult('result')).status, 'cancelled');
    assert.equal(copies, 0);
    assert.equal(env.events.length, 0);
});

test('native share success emits one anonymous success event', async () => {
    const env = sandbox('share.js', { navigator: { share: async () => {} } });
    assert.equal((await env.context.shareResult('secret result')).status, 'shared');
    assert.equal(env.events.length, 1);
    assert.equal(env.events[0][1], 'share');
    assert.equal(env.events[0][2].method, 'native');
    assert.equal(JSON.stringify(env.events).includes('secret result'), false);
});

test('unsupported clipboard uses fallback and does not report false success', async () => {
    const env = sandbox('share.js');
    assert.equal((await env.context.shareResult('result')).status, 'failed');
    assert.equal(env.events.length, 0);
    env.context.document.execCommand = () => true;
    assert.equal((await env.context.shareResult('result')).status, 'copied');
    assert.equal(env.events.length, 1);
});

test('rejected clipboard and failed native API can use the legacy copy method', async () => {
    const env = sandbox('share.js', { navigator: {
        share: async () => { throw new Error('unavailable'); },
        clipboard: { writeText: async () => { throw new Error('denied'); } }
    } });
    env.context.document.execCommand = () => true;
    assert.equal((await env.context.shareResult('result')).status, 'copied');
});

test('card is rendered as text to Canvas and requests a PNG download, not a share event', async () => {
    const env = sandbox('share.js');
    const result = await env.context.downloadShareCard({ title: '<script>hello</script>', score: 123, subtitle: 'Beat me', url: 'https://puzzlevault.pages.dev/games/quickcalc.html?seed=12' });
    assert.equal(result.status, 'downloaded');
    assert.equal(env.events.length, 0);
    assert.equal(env.elements.find(element => element.tag === 'a').download, 'puzzlevault-challenge.png');
    assert.ok(env.drawing.some(args => args[0] === '<script>hello</script>'));
});

test('absent providers grant a free help action and never open a blank ad', async () => {
    const env = sandbox('adsense.js');
    let rewards = 0;
    assert.equal(env.ads.isRewardAdAvailable(), false);
    assert.equal((await env.ads.showRewardAd(() => rewards++)).status, 'free');
    assert.equal(rewards, 1);
    for (let i = 0; i < 6; i++) await env.ads.showInterstitial();
    assert.equal(env.ads.refreshBottomAd(), false);
});

test('reward requires explicit opt-in and declines without calling provider', async () => {
    let calls = 0;
    const env = withProvider({ isRewardAvailable: () => true, showReward: () => calls++ });
    env.context.window.confirm = () => false;
    assert.equal((await env.ads.showRewardAd(() => { throw new Error('must not grant'); })).status, 'cancelled');
    assert.equal(calls, 0);
});

test('provider completion grants exactly once and duplicate requests remain busy', async () => {
    let callbacks;
    let rewards = 0;
    const env = withProvider({ isRewardAvailable: () => true, showReward: value => { callbacks = value; } });
    const request = env.ads.showRewardAd(() => rewards++);
    assert.equal((await env.ads.showRewardAd(() => rewards++)).status, 'busy');
    callbacks.onShown();
    callbacks.onComplete();
    callbacks.onComplete();
    callbacks.onClose();
    assert.equal((await request).status, 'completed');
    assert.equal(rewards, 1);
    assert.equal(env.ads._busy, false);
});

test('provider no-fill and dismissal never grant rewards, including late completion', async () => {
    for (const terminal of ['onNoFill', 'onClose', 'onError']) {
        let callbacks;
        let rewards = 0;
        const env = withProvider({ isRewardAvailable: () => true, showReward: value => { callbacks = value; } });
        const request = env.ads.showRewardAd(() => rewards++);
        callbacks[terminal]();
        callbacks.onComplete();
        assert.notEqual((await request).status, 'completed');
        assert.equal(rewards, 0);
    }
});

test('timeout disposes provider, clears busy state, and ignores stale rewards', async () => {
    let callbacks;
    let disposed = 0;
    let rewards = 0;
    const env = withProvider({ isRewardAvailable: () => true, showReward: value => { callbacks = value; return () => disposed++; } });
    const request = env.ads.showRewardAd(() => rewards++);
    [...env.timers.values()][0]();
    assert.equal((await request).status, 'timeout');
    callbacks.onComplete();
    assert.equal(rewards, 0);
    assert.equal(disposed, 1);
    assert.equal(env.ads._busy, false);
});

test('interstitial protects onboarding, observes frequency, and persists cooldown', async () => {
    let requests = 0;
    const env = withProvider({ showInterstitial(callbacks) { requests++; callbacks.onShown(); callbacks.onClose(); } });
    for (let game = 1; game <= 5; game++) assert.equal((await env.ads.showInterstitial()).status, 'skipped');
    assert.equal((await env.ads.showInterstitial()).status, 'shown');
    assert.equal(requests, 1);
    for (let game = 7; game <= 9; game++) await env.ads.showInterstitial();
    assert.equal(requests, 1);
    env.advance(120000);
    for (let game = 10; game <= 12; game++) await env.ads.showInterstitial();
    assert.equal(requests, 2);
    assert.equal(env.storage.get('pv_games_played'), '12');
    assert.ok(Number(env.storage.get('pv_last_ad_at')) > 0);
});

test('blocked or corrupt session storage cannot prevent controller initialization', () => {
    const blocked = sandbox('adsense.js', { sessionStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } });
    assert.equal(blocked.ads.gamesPlayed, 0);
    assert.equal(blocked.ads.shouldShowInterstitial(), false);
    const corrupt = sandbox('adsense.js', { sessionStorage: { getItem: () => '-123garbage', setItem() {} } });
    assert.equal(corrupt.ads.gamesPlayed, 0);
});

test('every legacy game calls the controller once only while its result is still visible', () => {
    for (const game of ['colorflow', 'gridsmash', 'hexmatch', 'mergechain', 'numvault', 'patternpop', 'pipelink', 'sortstack', 'tileturn']) {
        const source = fs.readFileSync(path.join(__dirname, '..', 'games', `${game}-logic.js`), 'utf8');
        const start = source.lastIndexOf('// Show interstitial after 2s delay');
        const end = source.indexOf('}, 2000);', start) + '}, 2000);'.length;
        assert.ok(start >= 0 && end > start, game);
        let visible = false;
        let callback;
        let calls = 0;
        const resultElement = { classList: { contains: () => visible } };
        const context = vm.createContext({
            setTimeout: value => { callback = value; },
            AdController: { showInterstitial: () => calls++ },
            state: { isPlaying: false }, G: { mode: 'classic' },
            H: { state: 'over' }, GameState: { GAMEOVER: 'over' }, M: { isPlaying: false },
            gameState: 'clear',
            popup: resultElement, modal: resultElement, overlay: resultElement,
            document: { getElementById: () => resultElement }
        });
        vm.runInContext(source.slice(start, end), context);
        callback();
        assert.equal(calls, 0, `${game}: result was dismissed or replay started`);
        visible = true;
        callback();
        assert.equal(calls, 1, `${game}: only showInterstitial counts this opportunity`);
    }
});
