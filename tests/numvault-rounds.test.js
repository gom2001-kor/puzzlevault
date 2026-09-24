const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
    let clock = 0, timerId = 0;
    const timers = new Map(), intervals = new Map(), storage = new Map(), nodes = new Map();
    const completions = [], results = [];
    function node() {
        const classes = new Set();
        return { style: {}, textContent: '', innerHTML: '', disabled: false,
            classList: { add: (...values) => values.forEach(value => classes.add(value)), remove: (...values) => values.forEach(value => classes.delete(value)) },
            appendChild() {}, addEventListener() {} };
    }
    const context = vm.createContext({
        document: {
            addEventListener() {}, createElement: node,
            getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); },
            querySelector() { return null; }, querySelectorAll() { return []; }
        },
        window: { addEventListener() {}, location: { search: '' } },
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)) },
        setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: clock + delay }); return id; },
        clearTimeout(id) { timers.delete(id); },
        setInterval(fn) { const id = ++timerId; intervals.set(id, fn); return id; },
        clearInterval(id) { intervals.delete(id); },
        SFX: { play() {} }, updateStats: (gameId, score) => completions.push({ gameId, score }),
        getTodayUTC: () => '2026-09-24', getDailyNumber: () => 267,
        updateStreak() {}, formatNumber: String, showToast() {}, URLSearchParams
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../games/numvault-logic.js'), 'utf8'), context);
    context.showTestResult = (won, score) => results.push({ won, score });
    vm.runInContext(`
        renderGrid = () => {};
        renderTracker = () => {};
        renderNumpad = () => {};
        showResult = showTestResult;
        startGame('free', 'medium');
        G.code = [1, 2, 3, 4];
    `, context);
    function advance(ms) {
        const target = clock + ms;
        while (true) {
            const next = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
            if (!next) break;
            clock = next[1].at;
            timers.delete(next[0]);
            next[1].fn();
        }
        clock = target;
    }
    return { run: code => vm.runInContext(code, context), advance, completions, results, intervals };
}

test('rapid submissions on the final attempt record exactly one completion', () => {
    const f = fixture();
    f.run(`
        G.guesses = Array.from({ length: 5 }, () => [5,6,7,8]);
        G.currentInput = [5,6,7,8];
        submitGuess();
        inputDigit(9);
    `);
    assert.equal(f.run('G.currentInput.length'), 0);
    f.run('G.currentInput = [5,6,7,8]; submitGuess();');
    assert.equal(f.run('G.guesses.length'), 6);
    f.advance(2000);
    assert.equal(f.completions.length, 1);
    assert.equal(f.results.length, 1);
    assert.equal(f.run('loadStats().played'), 1);
    f.run('onGameEnd(false);');
    assert.equal(f.completions.length, 1);
});

test('restarting during a pending winning flip cannot complete or change the new round', () => {
    const f = fixture();
    f.run(`G.currentInput = [...G.code]; submitGuess(); startGame('free', 'easy'); G.code = [7,8,9];`);
    f.advance(3000);
    assert.equal(f.completions.length, 0);
    assert.equal(f.results.length, 0);
    assert.equal(f.run('G.gameState'), 'playing');
    assert.equal(f.run('G.guesses.length'), 0);
    assert.equal(f.run('JSON.stringify(G.code)'), '[7,8,9]');
    assert.equal(f.run('G.submitting'), false);
});

test('returning to difficulty selection invalidates pending flips', () => {
    const f = fixture();
    f.run('G.currentInput = [...G.code]; submitGuess(); showDifficultySelect();');
    f.advance(3000);
    assert.equal(f.completions.length, 0);
    assert.equal(f.results.length, 0);
    assert.equal(f.run('G.gameState'), 'menu');
});

test('a completed round cannot show its delayed result over a restarted game', () => {
    const f = fixture();
    f.run('G.currentInput = [...G.code]; submitGuess();');
    f.advance(1100);
    assert.equal(f.completions.length, 1);
    f.run("startGame('free', 'medium');");
    f.advance(2000);
    assert.equal(f.results.length, 0);
    assert.equal(f.run('G.gameState'), 'playing');
});

test('Speed keeps multiple solved codes in one run and records its ending once', () => {
    const f = fixture();
    f.run("startGame('speed', 'easy'); G.currentInput = [...G.code]; submitGuess();");
    f.advance(950);
    assert.equal(f.run('G.speedSolved'), 1);
    assert.equal(f.run('G.gameState'), 'playing');
    assert.equal(f.completions.length, 0);
    f.run('onGameEnd(true);');
    assert.equal(f.run('G.speedSolved'), 1);
    f.run('G.currentInput = [...G.code]; submitGuess();');
    f.advance(950);
    assert.equal(f.run('G.speedSolved'), 2);
    assert.equal(f.run('G.speedScore'), 200);
    assert.equal(f.completions.length, 0);
    f.run("G.gameState = 'lost'; onGameEnd(false); onGameEnd(false);");
    f.advance(1000);
    assert.equal(f.completions.length, 1);
    assert.equal(f.completions[0].score, 200);
    assert.equal(f.results.length, 1);
});

test('Speed timeout during a pending correct flip cannot revive the finished run', () => {
    const f = fixture();
    f.run("startGame('speed', 'easy'); G.currentInput = [...G.code]; submitGuess(); G.speedTimer = 0.05;");
    [...f.intervals.values()][0]();
    f.advance(3000);
    assert.equal(f.run('G.gameState'), 'lost');
    assert.equal(f.run('G.speedSolved'), 0);
    assert.equal(f.completions.length, 1);
    assert.equal(f.results.length, 1);
});
