const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function gameFixture(game) {
    let clock = 0, timerId = 0, completions = 0;
    const timers = new Map(), nodes = new Map(), storage = new Map(), symbols = [];
    const ctx = new Proxy({
        createLinearGradient: () => ({ addColorStop() {} }),
        fillText: text => symbols.push(text)
    }, { get: (target, key) => key in target ? target[key] : () => {} });
    function makeNode() {
        const classes = new Set();
        return {
            style: {}, dataset: {}, attributes: {}, textContent: '', innerHTML: '', hidden: false,
            width: 476, height: 476, parentElement: { clientWidth: 500 },
            classList: { add: (...values) => values.forEach(v => classes.add(v)), remove: (...values) => values.forEach(v => classes.delete(v)), contains: value => classes.has(value), toggle: (value, on) => on ? classes.add(value) : classes.delete(value) },
            addEventListener() {}, appendChild() {}, remove() {}, focus() {}, setAttribute(key, value) { this.attributes[key] = value; },
            querySelector: () => null, getContext: () => ctx,
            getBoundingClientRect: () => ({ left: 10, top: 20, width: 476, height: 476 })
        };
    }
    const get = id => { if (!nodes.has(id)) nodes.set(id, makeNode()); return nodes.get(id); };
    const context = {
        document: { addEventListener() {}, getElementById: get, createElement: makeNode, querySelectorAll: () => [], querySelector: () => null },
        addEventListener() {}, location: { search: '', href: 'https://example.com/games/' + game + '.html' }, devicePixelRatio: 1,
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)) },
        setTimeout: (fn, delay) => { timers.set(++timerId, { fn, at: clock + delay }); return timerId; }, clearTimeout: id => timers.delete(id),
        setInterval() {}, clearInterval() {}, requestAnimationFrame() {}, cancelAnimationFrame() {},
        Date: class extends Date { static now() { return clock; } }, performance: { now: () => clock },
        URL, URLSearchParams, matchMedia: () => ({ matches: false }),
        SFX: { play() {} }, formatNumber: String, showToast() {}, updateStats: () => completions++,
        I18n: { currentLang: 'en' }, AdController: { refreshBottomAd() {}, showInterstitial() {} }
    };
    context.window = context;
    vm.createContext(context);
    for (const file of ['js/seed.js', 'js/duel.js', `games/${game}-logic.js`]) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
    }
    const run = code => vm.runInContext(code, context);
    function advance(ms) {
        const target = clock + ms;
        while (true) {
            const next = [...timers].filter(([, item]) => item.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
            if (!next) break;
            clock = next[1].at; timers.delete(next[0]); next[1].fn();
        }
        clock = target;
    }
    return { run, get, timers, symbols, advance, completions: () => completions };
}

test('PatternPop waits for an explicit ready action before showing a timed pattern', () => {
    const f = gameFixture('patternpop');
    f.run('switchMode("classic")');
    f.advance(10000);
    assert.equal(f.run('G.phase'), 'ready');
    assert.equal(f.timers.size, 0);
    assert.equal(f.get('pp-ready').hidden, false);
    f.run('startPatternPop()');
    assert.equal(f.get('pp-ready').hidden, true);
    f.advance(900);
    assert.equal(f.run('G.phase'), 'memorize');
    f.advance(2500);
    assert.equal(f.run('G.phase'), 'recall');
});

test('PatternPop draws different symbols for remembered pads and decoys, independent of color', () => {
    const f = gameFixture('patternpop');
    f.run('switchMode("classic"); G.cellStates[0][0] = "target"; G.cellStates[0][1] = "decoy"; drawGrid()');
    assert.ok(f.symbols.includes('◆'));
    assert.ok(f.symbols.includes('×'));
});

test('PatternPop keyboard selection stays on the board, ignores repeat selection and uses normal scoring', () => {
    const f = gameFixture('patternpop');
    f.run('switchMode("classic"); G.phase = "recall"; G.targets = [{r:0,c:1},{r:1,c:1}];');
    f.run('handlePatternKeyboard({key:"ArrowRight",preventDefault(){}}); handlePatternKeyboard({key:"Enter",preventDefault(){}})');
    assert.equal(f.run('G.tappedCorrect'), 1);
    f.run('handlePatternKeyboard({key:"Enter",repeat:true,preventDefault(){}}); handlePatternKeyboard({key:"Enter",preventDefault(){}})');
    assert.equal(f.run('G.tappedCorrect'), 1);
    f.run('handlePatternKeyboard({key:"ArrowDown",preventDefault(){}}); handlePatternKeyboard({key:" ",preventDefault(){}})');
    assert.equal(f.run('G.phase'), 'settling');
    f.advance(300);
    assert.ok(f.run('G.score') >= 200);
    assert.equal(f.run('G.lives'), 3);
});

test('PatternPop pointer mapping handles displayed scaling and ignores gaps between raised pads', () => {
    const f = gameFixture('patternpop');
    f.run('switchMode("classic"); G.phase = "recall"; G.targets = [{r:0,c:0},{r:1,c:1}]');
    f.get('pp-canvas').getBoundingClientRect = () => ({ left: 10, top: 20, width: 238, height: 238 });
    f.run('handleTap(10 + (G.gap + G.cellSize / 2) / 2, 20 + (G.gap + G.cellSize / 2) / 2)');
    assert.equal(f.run('G.tappedCorrect'), 1);
    f.run('handleTap(10 + (G.gap + G.cellSize + G.gap / 2) / 2, 20 + (G.gap + G.cellSize / 2) / 2)');
    assert.equal(f.run('G.lives'), 3);
    assert.equal(f.run('G.tapped.length'), 1);
});

test('PatternPop locks taps immediately after the final correct pad', () => {
    const f = gameFixture('patternpop');
    f.run('switchMode("classic"); G.phase = "recall"; G.targets = [{r:0,c:0}]; choosePatternCell(0,0); choosePatternCell(0,1)');
    assert.equal(f.run('G.lives'), 3);
    assert.equal(f.run('G.tapped.length'), 1);
});

test('PatternPop restart invalidates old memorize and completion callbacks', () => {
    const f = gameFixture('patternpop');
    f.run('switchMode("classic"); startPatternPop()');
    const old = [...f.timers.values()][0].fn;
    f.run('switchMode("daily")');
    old();
    f.advance(10000);
    assert.equal(f.run('G.phase'), 'ready');
    assert.equal(f.run('G.mode'), 'daily');
    assert.equal(f.run('G.round'), 1);
    assert.equal(f.completions(), 0);
});

test('PatternPop hints preserve previously selected pads and do not count them twice', () => {
    const f = gameFixture('patternpop');
    f.run('switchMode("classic"); G.phase = "recall"; G.targets = [{r:0,c:0},{r:1,c:1}]; choosePatternCell(0,0); usePatternPopHint()');
    f.advance(3750);
    assert.equal(f.run('G.phase'), 'recall');
    assert.equal(f.run('G.cellStates[0][0]'), 'correct');
    f.run('choosePatternCell(0,0)');
    assert.equal(f.run('G.tappedCorrect'), 1);
});

test('PatternPop completion is counted once and endless mode has no hidden finite life cap', () => {
    const f = gameFixture('patternpop');
    f.run('switchMode("classic"); endGame(); endGame()');
    assert.equal(f.completions(), 1);
    f.run('switchMode("endless"); G.phase = "recall"; G.targets = [{r:1,c:1}]; choosePatternCell(0,0)');
    assert.equal(f.run('G.lives'), Infinity);
});

test('NumVault progress counts proven positions across guesses without counting yellow or duplicate greens', () => {
    const f = gameFixture('numvault');
    assert.equal(f.run('JSON.stringify(getVaultConfirmedPositions([["green","yellow","gray","gray"],["green","gray","green","yellow"]],4))'), '[true,false,true,false]');
    assert.equal(f.run('JSON.stringify(getVaultConfirmedPositions([],3))'), '[false,false,false]');
});

test('QuickCalc streak checkpoints never change the challenge RNG, points or time', () => {
    const f = gameFixture('quickcalc');
    f.run('state.mode="blitz"; state.courseSeed=12345; startGame(); state.combo=5');
    const before = f.run('JSON.stringify([state.rng.state,state.score,state.timeLeft])');
    f.run('updateComboProgress()');
    assert.equal(f.run('JSON.stringify([state.rng.state,state.score,state.timeLeft])'), before);
    assert.equal(f.run('JSON.stringify(getQCComboProgress(5))'), '{"target":5,"filled":5,"milestone":true}');
    assert.equal(f.run('JSON.stringify(getQCComboProgress(6))'), '{"target":10,"filled":1,"milestone":false}');
    assert.equal(f.run('JSON.stringify(getQCComboProgress(0))'), '{"target":5,"filled":0,"milestone":false}');
});
