const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function game(name) {
    const noop = () => {};
    const element = () => ({ style: {}, textContent: '', classList: { add: noop, remove: noop }, addEventListener: noop });
    const context = vm.createContext({
        document: { addEventListener: noop, getElementById: element },
        setTimeout: () => 1, clearTimeout: noop, requestAnimationFrame: () => 1,
        localStorage: { getItem: () => null, setItem: noop }, SFX: { play: noop },
        formatNumber: String
    });
    context.window = context;
    let source = fs.readFileSync(path.join(__dirname, '../games/' + name + '-logic.js'), 'utf8');
    source = source.replace(/\ninit(?:HexMatch|MergeChain)\(\);\s*$/, '');
    vm.runInContext(source, context);
    return code => vm.runInContext(code, context);
}

test('PipeLink editorial circuit requires reciprocal ports and the stated three taps', () => {
    const run = game('pipelink');
    run(`
        PipeLink.size = 4;
        PipeLink.grid = Array.from({length:4}, () => Array.from({length:4}, () => ({type:0,rot:0,locked:false})));
        const tile = (r,c,type,rot,locked=false) => PipeLink.grid[r][c] = {type,rot,locked};
        tile(1,0,5,0,true); tile(1,1,1,0); tile(1,2,2,0);
        tile(2,2,2,0); tile(2,3,6,0,true);
        PipeLink.sources = [{r:1,c:0,t:'A'}]; PipeLink.dests = [{r:2,c:3,t:'A'}];
        PipeLink.dualMode = false; PipeLink.gameState = 'playing'; PipeLink.moves = 0;
        PipeLink.updateUI = () => {};
        PipeLink.handleLevelClear = () => { PipeLink.gameState = 'clear'; };
        PipeLink.updateConnectionLogic();
    `);
    assert.equal(run('PipeLink.grid[2][3].colorA'), false);
    run('PipeLink.rotateTile(1,1,1); PipeLink.rotateTile(1,2,1);');
    assert.equal(run('PipeLink.grid[2][3].colorA'), false, 'downward exit alone cannot receive power from the left');
    run('PipeLink.rotateTile(1,2,1);');
    assert.equal(run('PipeLink.moves'), 3);
    assert.equal(run('PipeLink.grid[2][3].colorA'), true);
    assert.equal(run('PipeLink.gameState'), 'clear');
    assert.equal(run('PipeLink.grid.flat().filter(c => !c.locked && c.type !== 0 && c.type !== 4).length'), 3);
});

test('MergeChain editorial drop guide distinguishes matching first contact from the higher collision', () => {
    const run = game('mergechain');
    const result = JSON.parse(run(`JSON.stringify((() => {
        const balls = [{x:70,y:475,val:4,radius:25},{x:230,y:470,val:8,radius:30}];
        const a = getDropGuide(70,25,balls), b = getDropGuide(230,25,balls);
        return {a:{y:a.y,val:a.target.val},b:{y:b.y,val:b.target.val}};
    })())`));
    assert.deepEqual(result, { a: { y: 425, val: 4 }, b: { y: 415, val: 8 } });
});

test('MergeChain editorial arithmetic uses the actual consecutive-merge multiplier', () => {
    const run = game('mergechain');
    run(`
        updateUI = () => {}; createParticles = () => {}; showChainPopup = () => {};
        M.score = 0; M.chain = 0; M.balls = [];
        function pair(value) { return {b1:{val:value,x:60,y:400,vx:0,vy:0},b2:{val:value,x:100,y:400,vx:0,vy:0}}; }
        processMerges([pair(2)]); processMerges([pair(4)]);
    `);
    assert.equal(run('M.score'), 20);
    assert.equal(run('M.chain'), 2);
    run('M.score=0; M.chain=0; processMerges([pair(4)]); processMerges([pair(8)]);');
    assert.equal(run('M.score'), 40);
    run('M.score=0; M.chain=0; processMerges([pair(2)]); M.chain=0; processMerges([pair(4)]);');
    assert.equal(run('M.score'), 12);
});

test('HexMatch editorial rainbow path is contiguous, rejects coral and places its bomb at the stated index', () => {
    const run = game('hexmatch');
    run(`
        generateValidCells(); H.grid = {}; H.bombs=[]; H.score=0;
        const path = [-2,-1,0,1,2].map(q => ({q,r:0,s:-q}));
        for (const cell of path) H.grid[Kc(cell)] = {color:cell.q===0?'rainbow':'blue',isRainbow:cell.q===0,isBomb:false};
        H.grid['1,-1'] = {color:'coral',isRainbow:false,isBomb:false};
        H.selColor='blue'; createParticles = () => {}; showScorePopup = () => {};
    `);
    assert.equal(run('path.every((c,i) => isValid(c.q,c.r) && (!i || cubeDistance(path[i-1],c)===1))'), true);
    assert.equal(run('matchesColor({q:0,r:0})'), true);
    assert.equal(run('matchesColor({q:1,r:-1})'), false);
    run('processTurn(path);');
    assert.equal(run('H.score'), 120);
    assert.equal(run("H.grid['0,0'].isBomb"), true);
    assert.equal(run('chainPoints(6)'), 300);
    assert.equal(run('chainPoints(7)'), 600);
    assert.equal(run('chainPoints(8)'), 600);
    run(`
        H.grid = {}; H.bombs=[]; H.score=0;
        const six = [-3,-2,-1,0,1,2].map(q=>({q,r:0,s:-q}));
        for(const c of six) H.grid[Kc(c)]={color:'blue',isRainbow:false,isBomb:false};
        processTurn(six);
    `);
    assert.equal(run("H.grid['0,0'].isBomb"), true, 'fourth selected cell receives a six-chain bomb before gravity');
});
