const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function game(name) {
    const noop = () => {};
    const element = () => ({ style: {}, textContent: '', classList: { add: noop, remove: noop }, addEventListener: noop });
    const context = vm.createContext({
        document: { addEventListener: noop, getElementById: element, querySelectorAll: () => [] },
        matchMedia: () => ({ matches: true }), SFX: { play: noop },
        requestAnimationFrame: () => 1, cancelAnimationFrame: noop, clearInterval: noop,
        setTimeout: () => 1, clearTimeout: noop, localStorage: { getItem: () => null, setItem: noop },
        formatNumber: String, URLSearchParams
    });
    context.window = context;
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/canvas-depth.js'), 'utf8'), context);
    const source = fs.readFileSync(path.join(__dirname, '../games/' + name + '-logic.js'), 'utf8');
    vm.runInContext(source.replace(/\ninit(?:HexMatch|MergeChain)\(\);\s*$/, ''), context);
    return code => vm.runInContext(code, context);
}

test('GridSmash placement preview finds intersecting full lines without mutating grid or RNG', () => {
    const run = game('gridsmash');
    const result = run(`
        resetState();
        for (let i = 0; i < 10; i++) { if (i !== 4) G.grid[4][i] = {color:'#93C5FD'}; if (i !== 4) G.grid[i][4] = {color:'#93C5FD'}; }
        G.rng = { next() { throw new Error('Preview consumed a random draw'); } };
        const before = JSON.stringify(G.grid);
        const preview = getPlacementPreview({cells:[[0,0]]}, 4, 4);
        JSON.stringify({ preview, unchanged: JSON.stringify(G.grid) === before });
    `);
    assert.deepEqual(JSON.parse(result), { preview: { valid: true, rows: [4], cols: [4] }, unchanged: true });
    assert.equal(run('getPlacementPreview({cells:[[0,0]]}, 4, 3).valid'), false);
    assert.equal(run('getPlacementPreview({cells:[[0,0],[0,1]]}, 9, 9).valid'), false);
    assert.equal(run("getPlacementPreview({cells:[[0,0]],special:'crystal'}, 4, 4).rows.length"), 0);
});

test('GridSmash keyboard placement uses normal validation and scoring', () => {
    const run = game('gridsmash');
    run(`resetState(); drawGrid = () => {}; renderDock = () => {}; updateUI = () => {};
        G.pieces = [{cells:[[0,0],[0,1]],special:null},{cells:[[0,0]],special:null},{cells:[[0,0]],special:null}];
        G.currentPieceColors = ['#93C5FD','#86EFAC','#FDE68A'];
        function press(key) { handleBoardKey({key,preventDefault(){}}); }
        press('1'); press('r');
        for(let i=0;i<20;i++) { press('ArrowRight'); press('ArrowDown'); }
    `);
    assert.equal(run('G.dragGridPos.row'), 8);
    assert.equal(run('G.dragGridPos.col'), 9);
    run("press('Enter');");
    assert.equal(run('G.score'), 20);
    assert.equal(run('G.piecesPlaced[0]'), true);
    assert.equal(run('Boolean(G.grid[8][9] && G.grid[9][9])'), true);
    assert.equal(run('G.dragPiece'), null);
});

test('GridSmash does not end a run when an available rotation still fits', () => {
    const run = game('gridsmash');
    run(`resetState(); G.grid = Array.from({length:10},()=>Array.from({length:10},()=>({color:'#93C5FD'})));
        G.grid[3][4] = G.grid[4][4] = G.grid[5][4] = null;
        const piece = {cells:[[0,0],[0,1],[0,2]],special:null};
        const before = JSON.stringify(piece);
    `);
    assert.equal(run('canPieceFitAnywhere(piece)'), true);
    assert.equal(run('JSON.stringify(piece) === before'), true);
    run("G.grid[4][4]={color:'#93C5FD'};");
    assert.equal(run('canPieceFitAnywhere(piece)'), false);
});

test('HexMatch pointer coordinates stay correct on a high-density scaled canvas', () => {
    const run = game('hexmatch');
    run(`generateValidCells(); initGrid(); const listeners = {};
        H.canvas = {width:800,height:880,style:{},getBoundingClientRect:()=>({left:10,top:20,width:200,height:220}),addEventListener:(type,fn)=>listeners[type]=fn};
        setupInput(); const point = hexToPixel(1,0);
        listeners.pointerdown({clientX:10+point.x/2,clientY:20+point.y/2,preventDefault(){}});
    `);
    assert.equal(run('Kc(H.selection[0])'), '1,0');
    run('listeners.pointercancel();');
    assert.equal(run('H.selection.length'), 0);
    assert.equal(run('H.turn'), 0);
});

test('MergeChain guide finds first circular contact and leaves physics state untouched', () => {
    const run = game('mergechain');
    assert.equal(run('getDropGuide(150,20,[]).y'), 480);
    assert.equal(run('getDropGuide(-40,20,[]).x'), 20);
    assert.equal(run('getDropGuide(400,20,[]).x'), 280);
    const result = JSON.parse(run(`
        const balls = [{x:150,y:430,radius:25,val:4},{x:150,y:250,radius:20,val:2},{x:150,y:100,radius:25,val:4,merged:true}];
        const before = JSON.stringify(balls);
        const guide = getDropGuide(150,20,balls);
        JSON.stringify({y:guide.y,target:guide.target.val,unchanged:JSON.stringify(balls)===before});
    `));
    assert.deepEqual(result, { y: 210, target: 2, unchanged: true });
    assert.equal(run('getDropGuide(150,20,[{x:180,y:300,radius:30,val:2}]).y'), 260);
});

test('MergeChain keyboard/drop clamp cannot spawn a ball outside the vessel or after game over', () => {
    const run = game('mergechain');
    run(`M.isPlaying = true; M.currentCooldown = 0; M.mouseX = -10; M.nextVal = 16; M.rng = {next:()=>0}; updateUI = () => {}; dropBall();`);
    assert.equal(run('M.balls[0].x'), 36);
    assert.equal(run('M.balls[0].val'), 16);
    run('M.isPlaying = false; dropBall();');
    assert.equal(run('M.balls.length'), 1);
});

test('HexMatch hint returns an ordered traceable path, including three-cell fallback for a branched group', () => {
    const run = game('hexmatch');
    const result = JSON.parse(run(`
        generateValidCells(); H.grid = {};
        [[0,0],[1,0],[0,-1],[-1,1]].forEach(([q,r]) => H.grid[K(q,r)] = {color:'coral'});
        const before = JSON.stringify(H.grid);
        const hint = findHint();
        JSON.stringify({length:hint.length,unique:new Set(hint.map(Kc)).size,adjacent:hint.slice(1).every((cell,i)=>cubeDistance(cell,hint[i])===1),unchanged:before===JSON.stringify(H.grid)});
    `));
    assert.deepEqual(result, { length: 3, unique: 3, adjacent: true, unchanged: true });
    run("H.grid={}; H.grid[K(0,0)]={color:'coral'}; H.grid[K(1,0)]={isRainbow:true}; H.grid[K(2,0)]={color:'coral'}; H.grid[K(3,0)]={color:'coral'};");
    assert.equal(run('findHint().length'), 4);
    run('H.grid[K(1,0)] = {isBomb:true};');
    assert.equal(run('findHint()'), null);
});

test('HexMatch chain preview uses real scoring and cancelling does not create a turn', () => {
    const run = game('hexmatch');
    assert.deepEqual(JSON.parse(run('JSON.stringify([1,2,3,4,5,6,7,12].map(chainPoints))')), [0,0,30,60,120,300,600,600]);
    run("H.grid={}; H.grid[K(0,0)]={isRainbow:true}; H.grid[K(1,0)]={color:'blue'};");
    assert.equal(run('selectionColor([{q:0,r:0},{q:1,r:0}])'), 'blue');
    assert.equal(run('selectionColor([{q:0,r:0}])'), null);
    run('H.state=GameState.SELECTING; H.selection=[{q:0,r:0}]; H.selColor="blue"; cancelSelection();');
    assert.equal(run('H.selection.length'), 0);
    assert.equal(run('H.state'), run('GameState.IDLE'));
    assert.equal(run('H.turn'), 0);
    assert.equal(run('H.score'), 0);
});

test('visual effects do not change seeded gameplay or create particles with reduced motion', () => {
    const merge = game('mergechain');
    merge("createParticles(100,100,'#FDE68A');");
    assert.equal(merge('M.particles.length'), 0);
    const hex = game('hexmatch');
    hex("createParticles(0,0,'#F43F5E',20);");
    assert.equal(hex('H.particles.length'), 0);
});
