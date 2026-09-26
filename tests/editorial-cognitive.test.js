const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the shipping game rules with inert presentation services. The fixtures
// below are the teaching examples printed in cognitive-guides.json.
function gameRules(game) {
    const nodes = new Map(), timers = [];
    function node(id = '') {
        if (!nodes.has(id)) nodes.set(id, {
            id, style: {}, dataset: {}, textContent: '', innerHTML: '',
            classList: { add() {}, remove() {}, toggle() {} },
            setAttribute() {}, addEventListener() {}, appendChild() {}, remove() {},
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 })
        });
        return nodes.get(id);
    }
    const context = {
        document: { addEventListener() {}, getElementById: node, createElement: () => node(), querySelectorAll: () => [] },
        localStorage: { getItem: () => null, setItem() {} },
        setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
        addEventListener() {}, clearTimeout() {}, requestAnimationFrame() {}, cancelAnimationFrame() {},
        performance: { now: () => 0 }, URLSearchParams,
        SFX: { play() {} }, formatNumber: String, showToast() {}
    };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'games', game + '-logic.js'), 'utf8'), context);
    return { run: code => vm.runInContext(code, context), timers };
}

test('PatternPop teaching board matches round five and accepts its targets in reverse order', () => {
    const f = gameRules('patternpop');
    assert.equal(f.run('getGridSize(5)'), 4);
    assert.equal(f.run('getTargetCount(5)'), 6);
    assert.equal(f.run('getDecoyCount(5)'), 1);
    f.run(`resetState(); G.gridSize = 4; G.phase = 'recall';
        G.targets = [{r:0,c:0},{r:0,c:1},{r:1,c:3},{r:2,c:1},{r:2,c:2},{r:3,c:3}];
        G.decoys = [{r:1,c:1}]; initCellStates();
        drawGrid = () => {}; updatePatternProgress = () => {}; setPhaseBanner = () => {};
        [...G.targets].reverse().forEach(t => choosePatternCell(t.r,t.c));`);
    assert.equal(f.run('G.tappedCorrect'), 6);
    assert.equal(f.run('G.lives'), 3);
    assert.equal(f.run('G.phase'), 'settling');
});

test('PatternPop example decoy costs a life without finding a target', () => {
    const f = gameRules('patternpop');
    f.run(`resetState(); G.gridSize = 4; G.phase = 'recall'; G.canvas = {style:{}};
        G.targets = [{r:0,c:0},{r:0,c:1},{r:1,c:3},{r:2,c:1},{r:2,c:2},{r:3,c:3}];
        G.decoys = [{r:1,c:1}]; initCellStates();
        drawGrid = () => {}; updateUI = () => {};
        choosePatternCell(1,1);`);
    assert.equal(f.run('G.lives'), 2);
    assert.equal(f.run('G.tappedWrong'), 1);
    assert.equal(f.run('G.tappedCorrect'), 0);
});

function duelExample() {
    const f = gameRules('quickcalc');
    f.run(`state.mode = 'blitz'; state.isPlaying = true; state.waitingForNext = false;
        state.questionNum = 11; state.combo = 4; state.score = 0; state.timeLeft = 30000;
        state.currentProblem = {answer:'×', choices:['+','-','×','÷'], isOperator:true};
        advanceClock = () => true; createFloatingText = () => {};
        updateTimerBarDOM = () => {}; updateStatusUI = () => {};`);
    return f;
}

test('QuickCalc guide score comparison uses the actual award and wrong-answer handlers', () => {
    const clean = duelExample();
    clean.run('handleChoiceTap(2)');
    assert.equal(clean.run('state.score'), 1100);
    assert.equal(clean.run('state.combo'), 5);
    const mistaken = duelExample();
    mistaken.run('handleChoiceTap(0)');
    assert.equal(mistaken.run('state.questionNum'), 11);
    assert.equal(mistaken.run('state.timeLeft'), 27000);
    assert.equal(mistaken.run('state.combo'), 0);
    mistaken.run('handleChoiceTap(2)');
    assert.equal(mistaken.run('state.score'), 700);
});

test('QuickCalc exercise awards 350 and generated two-step example respects precedence', () => {
    const f = duelExample();
    f.run(`state.questionNum = 6; state.combo = 2;
        state.currentProblem = {answer:24, choices:[21,24,27,40], isOperator:false};
        handleChoiceTap(1);`);
    assert.equal(f.run('state.score'), 350);
    f.run(`const exampleInts = [1,12,3,4,1,3,3,3,16];
        randomFloat = () => 0.5;
        let exampleFloatCalls = 0;
        randomFloat = () => ++exampleFloatCalls === 1 ? 0.5 : 0.1;
        randomInt = () => exampleInts.shift(); shuffle = () => {};
        var generatedTeachingQuestion = generateProblem(16);`);
    assert.equal(f.run('generatedTeachingQuestion.display'), '12 + 3 × 4');
    assert.equal(f.run('generatedTeachingQuestion.answer'), 24);
    assert.equal(f.run('JSON.stringify(generatedTeachingQuestion.choices)'), '[24,27,21,40]');
});

test('TileTurn central cross solves the teaching board while the tempting corner does not', () => {
    const f = gameRules('tileturn');
    f.run(`var centerBoard = [1,0,1,0,0,0,1,0,1];
        var cornerBoard = [...centerBoard];
        applyTapLogic(centerBoard,4,3,'classic');
        applyTapLogic(cornerBoard,0,3,'classic');`);
    assert.equal(f.run('centerBoard.every(value => value === 1)'), true);
    assert.equal(f.run('JSON.stringify(cornerBoard)'), '[0,1,1,1,0,0,1,0,1]');
    assert.equal(f.run('cornerBoard.filter(Boolean).length'), 5);
});

test('TileTurn shipping Cascade callback changes diagonals through B1 and cancels overlapping pulses', () => {
    for (const overlap of [false, true]) {
        const f = gameRules('tileturn');
        f.run(`state.board = Array(16).fill(1); state.board[4] = 0;
            ${overlap ? 'state.board[1] = 0;' : ''}
            state.size = 4; state.mode = 'cascade'; state.isPlaying = true;
            state.history = []; state.moves = 0;
            updateMoveCounter = () => {}; updateTileTurnGoal = () => {};
            handleTileTap(5);`);
        const secondStep = f.timers.find(item => item.delay === 300);
        assert.ok(secondStep, 'actual game schedules the second cascade step');
        secondStep.callback();
        assert.equal(f.run('state.board[0]'), overlap ? 1 : 0, 'A1 keeps its state only when two sources overlap');
        assert.equal(f.run('state.board[8]'), 0, 'C1 receives B1 pulse');
        assert.equal(f.run('state.board[5]'), overlap ? 0 : 1, 'B2 receives one or two return pulses');
    }
});

test('TileTurn Spectrum example uses two advances to green and three to restore a cross', () => {
    const f = gameRules('tileturn');
    f.run(`var spectrumExample = Array(9).fill(0);
        applyTapLogic(spectrumExample,4,3,'spectrum');
        applyTapLogic(spectrumExample,4,3,'spectrum');`);
    assert.equal(f.run('spectrumExample[4]'), 2);
    assert.equal(f.run('spectrumExample[0]'), 0, 'the diagonal is outside the cross');
    f.run(`applyTapLogic(spectrumExample,4,3,'spectrum')`);
    assert.equal(f.run('spectrumExample.every(value => value === 0)'), true);
});

test('All cognitive guides provide localized complete examples and safe structural markup', () => {
    const guides = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts/content/cognitive-guides.json'), 'utf8'));
    assert.equal(guides.length, 3);
    for (const guide of guides) {
        const englishWords = guide.locales.en.body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
        assert.ok(englishWords >= 500 && englishWords <= 1000);
        for (const lang of ['en','ko','ja','zh','es']) {
            const entry = guide.locales[lang];
            assert.ok(entry.title && entry.description && entry.body);
            assert.match(entry.body, /<figure class="guide-figure">/);
            assert.match(entry.body, /<caption>/);
            assert.match(entry.body, /<details><summary>/);
            assert.ok(entry.body.includes(`/games/${guide.game}.html?lang=${lang}`));
            assert.doesNotMatch(entry.body, /<(?:script|iframe)|\sid=/i);
        }
    }
});

test('The welcome replacement gives all ten games a localized concrete starting point', () => {
    const entry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts/content/welcome-post.json'), 'utf8'));
    assert.equal(entry.slug, 'welcome-to-puzzlevault');
    const words = entry.locales.en.body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 550 && words <= 750);
    for (const lang of ['en','ko','ja','zh','es']) {
        const body = entry.locales[lang].body;
        for (const game of ['numvault','gridsmash','patternpop','sortstack','quickcalc','tileturn','colorflow','pipelink','mergechain','hexmatch']) {
            assert.ok(body.includes(`/games/${game}.html?lang=${lang}`));
        }
        assert.match(body, /<caption>/);
        assert.match(body, /tileturn-cross-and-cascade-guide\.html/);
        assert.match(body, /quickcalc-accuracy-and-duel-guide\.html/);
    }
});
