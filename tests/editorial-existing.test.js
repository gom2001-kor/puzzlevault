const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Execute the shipped game rules; only browser presentation and timers are stubbed.
function game(name) {
    const nodes = new Map();
    const node = () => ({ style: {}, classList: { add() {}, remove() {}, contains() { return false; } },
        addEventListener() {}, getContext() { return {}; }, scrollTo() {}, appendChild() {} });
    const context = vm.createContext({
        document: { addEventListener() {}, querySelectorAll() { return []; },
            getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); } },
        window: { addEventListener() {}, matchMedia() { return { matches: true }; } },
        localStorage: { getItem() { return null; }, setItem() {} },
        Date: class extends Date { static now() { return 20000; } },
        setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
        cancelAnimationFrame() {}, requestAnimationFrame() {},
        SFX: { play() {} }, showToast() {}, formatNumber: String
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'games', `${name}-logic.js`), 'utf8'), context);
    return { run: source => vm.runInContext(source, context), nodes };
}

test('NumVault guide feedback, forced final deduction and duplicate example match actual evaluator', () => {
    const g = game('numvault');
    for (const [guess, feedback] of [
        [[1,2,3,4], ['gray','yellow','gray','gray']],
        [[2,0,5,6], ['yellow','green','yellow','gray']],
        [[7,0,8,2], ['yellow','green','gray','green']],
        [[5,0,7,2], ['green','green','green','green']]
    ]) assert.equal(g.run(`JSON.stringify(evaluateGuess(${JSON.stringify(guess)},[5,0,7,2]))`), JSON.stringify(feedback));
    assert.equal(g.run(`JSON.stringify(evaluateGuess([5,5,0,0],[5,0,0,2]))`), '["green","gray","green","yellow"]');
    assert.equal(g.run(`JSON.stringify((()=>{const matches=[];for(let n=0;n<10000;n++){const code=String(n).padStart(4,'0').split('').map(Number);if(new Set(code).size!==4)continue;if([[1,2,3,4],[2,0,5,6],[7,0,8,2]].every((guess,i)=>JSON.stringify(evaluateGuess(guess,code))===JSON.stringify([['gray','yellow','gray','gray'],['yellow','green','yellow','gray'],['yellow','green','gray','green']][i])))matches.push(code.join(''));}return matches;})())`), '["5072"]');
    assert.equal(g.run(`resetState();G.guesses=Array(4).fill([]);G.difficulty=DIFFICULTIES.medium;G.startTime=0;G.endTime=45000;calcScore()`), 3600);
});

test('GridSmash guide placement clears exactly two lines for 240 points', () => {
    const g = game('gridsmash');
    g.run(`resetState();addPlacementFeedback=()=>{};updateUI=()=>{};drawGrid=()=>{};showComboPopup=()=>{};
      G.pieces=[{cells:[[0,0],[0,1],[1,0],[1,1]]},{cells:[[0,0]]},{cells:[[0,0]]}];
      G.currentPieceColors=['#2563EB','#059669','#D97706'];
      for(let r=0;r<2;r++)for(let c=0;c<8;c++)G.grid[r][c]={color:'#93C5FD'};
      G.grid[9][0]={color:'#93C5FD'};`);
    assert.equal(g.run('canPlace(G.pieces[0],0,8)'), true);
    g.run('placePiece(G.pieces[0],0,8,0)');
    assert.equal(g.run('G.score'), 240);
    assert.equal(g.run('G.linesCleared'), 2);
    assert.equal(g.run('G.grid.flat().filter(Boolean).length'), 1);
    assert.equal(g.run('G.grid[9][0] !== null'), true);
});

test('SortStack guide four moves obey legal destinations and finish three colors', () => {
    const g = game('sortstack');
    g.run(`state.stacks=[[0,0,0,1],[1,1,1,0],[2,2,2],[2],[]];state.locked=Array(5).fill(false);
      state.colorsCount=3;state.movesLimit=Infinity;updateUI=()=>{};winGame=()=>{state.isGameOver=true;};`);
    assert.equal(g.run('getLegalStackTargets(1).includes(2)'), false);
    for (const [from, to] of [[3,2],[1,4],[0,1],[4,0]]) {
        assert.equal(g.run(`getLegalStackTargets(${from}).includes(${to})`), true);
        g.run(`executeMove(${from},${to},state.stacks[${from}].at(-1));state.animations.pop().onComplete();`);
    }
    assert.equal(g.run('isSolved()'), true);
    assert.equal(g.run('state.movesMade'), 4);
    assert.equal(g.run('state.stacks.length'), 8);
    assert.equal(g.run('state.locked.filter(Boolean).length'), 3);
});

test('ColorFlow guide routes are legal, and actual coverage, win and scoring distinguish both finishes', () => {
    for (const [third, coverage, score] of [
        [[10,15,20,21,22,23,24],68,650],
        [[10,11,12,13,14,19,18,17,16,15,20,21,22,23,24],100,1620]
    ]) {
        const routes = [[0,1,2,3,4],[5,6,7,8,9],third];
        const cells = routes.flat();
        assert.equal(new Set(cells).size, cells.length, 'paths do not cross');
        for (const route of routes) for (let i=1;i<route.length;i++) {
            const a=route[i-1], b=route[i];
            assert.equal(Math.abs(Math.floor(a/5)-Math.floor(b/5))+Math.abs(a%5-b%5),1);
        }
        const g = game('colorflow');
        g.run(`state.size=5;state.colorsPresent=3;state.isPlaying=true;state.startTime=0;
          state.boardContent=Array.from({length:25},()=>({type:'empty',color:null,neighbors:[]}));
          state.paths={};const routes=${JSON.stringify(routes)};
          routes.forEach((route,i)=>{state.paths[i+1]=route;route.forEach((cell,j)=>{state.boardContent[cell]={type:j===0||j===route.length-1?'marker':'path',color:i+1,neighbors:[]};});});
          updateMetaUI();checkWinState();`);
        assert.equal(g.run('state.coverage'),coverage);
        assert.equal(g.run('state.connectedPairs'),3);
        assert.equal(g.run('state.isPlaying'),false);
        assert.equal(g.nodes.get('cf-res-total').textContent, score);
    }
});
