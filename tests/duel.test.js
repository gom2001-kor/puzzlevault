const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const duel = require('../js/duel.js');

function harness(search = '?mode=blitz&seed=42&target=500') {
    let time = 0, id = 0, statsCalls = 0, ads = 0;
    const nodes = new Map(), timeouts = new Map(), frames = new Map(), callbacks = {};
    const storage = new Map();
    function element() {
        const classes = new Set();
        return {
            style: {}, dataset: {}, textContent: '', innerHTML: '', disabled: false, hidden: false,
            classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle: (c, enabled) => enabled ? classes.add(c) : classes.delete(c) },
            addEventListener() {}, setAttribute() {}, focus() {}, appendChild() {}, remove() {},
            querySelector: () => element(), getBoundingClientRect: () => ({ left: 0, top: 0, width: 60 })
        };
    }
    const get = key => { if (!nodes.has(key)) nodes.set(key, element()); return nodes.get(key); };
    const tabs = ['classic', 'daily', 'timeattack', 'blitz'].map(mode => Object.assign(element(), { dataset: { mode } }));
    const context = {
        document: { getElementById: get, createElement: element, querySelectorAll: selector => selector.includes('qc-tabs') ? tabs : [], addEventListener: (type, fn) => { callbacks[type] = fn; } },
        location: { search, href: 'https://example.com/games/quickcalc.html' + search, pathname: '/games/quickcalc.html' },
        history: { replaceState() {} }, addEventListener() {},
        performance: { now: () => time }, URL, URLSearchParams, Uint32Array,
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)) },
        setTimeout: (fn, delay) => { timeouts.set(++id, { fn, delay }); return id; }, clearTimeout: id => timeouts.delete(id),
        requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
        SFX: { play() {}, toggle() {}, enabled: true }, showToast() {}, confirm: () => true,
        updateStats: () => statsCalls++, AdController: { shouldShowInterstitial: () => true, showInterstitial: () => ads++, refreshBottomAd() {}, hideInterstitial() {} },
        shareResult: text => text, downloadShareCard: options => options, formatNumber: String, I18n: { currentLang: 'en' }
    };
    context.window = context;
    vm.createContext(context);
    for (const file of ['js/seed.js', 'js/duel.js', 'games/quickcalc-logic.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
    }
    const run = code => vm.runInContext(code, context);
    callbacks.DOMContentLoaded();
    return { run, nodes, timeouts, frames, setTime: value => { time = value; }, statsCalls: () => statsCalls, ads: () => ads };
}

test('challenge links strictly validate seeds and self-reported target scores', () => {
    assert.deepEqual(duel.parse('?mode=blitz&seed=42&target=0'), { mode: 'blitz', seed: 42, target: 0 });
    for (const seed of ['0', '-1', '1.2', '1e4', 'NaN', '2147483647', '01', '<script>']) {
        assert.equal(duel.parse(`?mode=blitz&seed=${seed}&target=500`).seed, null);
        assert.equal(duel.parse(`?mode=blitz&seed=${seed}&target=500`).target, null);
    }
    assert.equal(duel.parse('?mode=blitz&seed=1&seed=2&target=500').seed, null);
    assert.equal(duel.parse('?mode=blitz&seed=1&target=500&target=9').target, null);
    for (const score of ['-1', 'Infinity', '1000000001', '10.5', '1e3']) assert.equal(duel.parse(`?mode=blitz&seed=1&target=${score}`).target, null);
    assert.deepEqual(duel.parse('?mode=daily&seed=42&target=500'), { mode: 'daily', seed: null, target: null });
});

test('share link preserves the exact seed, mode and score on the serving origin', () => {
    const url = new URL(duel.buildURL('https://preview.example/quickcalc?old=1#frag', 12345, 950));
    assert.equal(url.origin, 'https://preview.example');
    assert.equal(url.pathname, '/games/quickcalc.html');
    assert.equal(url.hash, '');
    assert.deepEqual(duel.parse(url.search), { mode: 'blitz', seed: 12345, target: 950 });
    assert.throws(() => duel.buildURL('https://example.com', -1, 0), RangeError);
});

test('friends and replays receive identical questions AND answer positions across all phases', () => {
    const first = harness(), friend = harness();
    const course = "startGame(); JSON.stringify(Array.from({length: 100}, (_, i) => generateProblem(i + 1)))";
    const original = first.run(course);
    assert.equal(original, friend.run(course));
    assert.equal(original, first.run(course));
    const different = harness('?mode=blitz&seed=43');
    assert.notEqual(original, different.run(course));
    for (const question of JSON.parse(original)) {
        assert.equal(new Set(question.choices).size, 4);
        assert.ok(question.choices.includes(question.answer));
    }
});

test('URL mode is selected before the start screen, including daily', () => {
    for (const mode of ['classic', 'daily', 'timeattack', 'blitz']) {
        const h = harness('?mode=' + mode);
        assert.equal(h.run('state.mode'), mode);
        h.run('startGame()');
        assert.equal(h.run('state.timeLeft'), mode === 'blitz' ? 30000 : mode === 'timeattack' ? 120000 : 10000);
    }
});

test('completion records shared progression exactly once', () => {
    const h = harness();
    h.run('startGame(); state.score = 750; gameOver(); gameOver()');
    assert.equal(h.statsCalls(), 1);
    assert.equal(h.run('readQCStats().played'), 1);
    assert.equal(h.run('readQCStats().highscore'), 750);
    h.run('startGame(); gameOver()');
    assert.equal(h.statsCalls(), 2);
});

test('restarting cancels delayed question transitions and stale callbacks cannot alter the new round', () => {
    const h = harness();
    h.run('startGame(); handleChoiceTap(state.currentProblem.choices.indexOf(state.currentProblem.answer))');
    const pending = [...h.timeouts.values()].find(timer => timer.delay === 120).fn;
    h.run('startGame()');
    const before = h.run('JSON.stringify(state.currentProblem)');
    pending();
    assert.equal(h.run('state.questionNum'), 1);
    assert.equal(h.run('JSON.stringify(state.currentProblem)'), before);
    assert.equal(h.run('state.waitingForNext'), false);
});

test('late input after the actual deadline cannot add points', () => {
    const h = harness();
    h.run('startGame()');
    h.setTime(30001);
    h.run('handleChoiceTap(state.currentProblem.choices.indexOf(state.currentProblem.answer))');
    assert.equal(h.run('state.score'), 0);
    assert.equal(h.run('state.isPlaying'), false);
    assert.equal(h.statsCalls(), 1);
});

test('wrong-answer time penalty ends a duel immediately when time runs out', () => {
    const h = harness();
    h.run('startGame(); state.timeLeft = 2000; handleChoiceTap(state.currentProblem.choices.findIndex(value => value !== state.currentProblem.answer))');
    assert.equal(h.run('state.isPlaying'), false);
    assert.equal(h.run('state.timeLeft'), 0);
    assert.equal(h.statsCalls(), 1);
});

test('duel hints cannot extend the timer or change the deterministic sequence', () => {
    const h = harness();
    h.run('startGame()');
    const before = h.run('state.rng.state');
    h.run('useTimerHint(); useOperatorHint()');
    assert.equal(h.run('state.timeLeft'), 30000);
    assert.equal(h.run('state.rng.state'), before);
    assert.equal(h.run('state.hintsUsed'), 0);
});

test('dismissing or replaying a result prevents an old delayed ad from appearing', () => {
    const h = harness();
    h.run('startGame(); gameOver()');
    const pending = [...h.timeouts.values()].find(timer => timer.delay === 2000).fn;
    h.run('resetToStart()');
    pending();
    assert.equal(h.ads(), 0);
});

test('share result is a playable invitation with the completed course and score', () => {
    const h = harness();
    const text = h.run('startGame(); state.score = 1250; gameOver(); shareQC()');
    const url = new URL(text.split('\n').at(-1));
    assert.deepEqual(duel.parse(url.search), { mode: 'blitz', seed: 42, target: 1250 });
    assert.match(text, /self-reported/);
});

test('new challenge clears the old target and keyboard choices reset after a hinted question', () => {
    const h = harness();
    h.run('newQCChallenge()');
    assert.equal(h.run('state.challengeTarget'), null);
    assert.equal(h.run('state.mode'), 'blitz');
    assert.ok(h.run('state.courseSeed') > 0);
    h.nodes.get('qc-btn-0').disabled = true;
    h.run('nextProblem()');
    assert.equal(h.nodes.get('qc-btn-0').disabled, false);
});

test('saved score cards retain the exact playable challenge link', () => {
    const h = harness();
    const card = h.run('startGame(); state.score = 950; state.correctCount = 4; gameOver(); saveQCCard()');
    assert.equal(card.score, '950');
    assert.match(card.subtitle, /4 Correct/);
    assert.deepEqual(duel.parse(new URL(card.url).search), { mode: 'blitz', seed: 42, target: 950 });
});
