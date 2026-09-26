const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function load(game, reduced = false) {
    const elements = new Map(), drawing = [], gradients = [];
    const ctx = new Proxy({}, {
        get(target, key) {
            if (key in target) return target[key];
            if (key === 'createLinearGradient' || key === 'createRadialGradient') return (...args) => {
                gradients.push([key,...args]); return { addColorStop() {} };
            };
            return (...args) => drawing.push([key,...args]);
        }
    });
    function element(tag = 'div') {
        const el = { tagName: tag.toUpperCase(), children: [], style: {}, dataset: {}, className: '', attrs: {},
            textContent: '', width: 500, height: 302,
            appendChild(child) { this.children.push(child); return child; },
            setAttribute(name, value) { this.attrs[name] = value; },
            addEventListener() {}, removeEventListener() {}, remove() {},
            querySelector(selector) { return this.children.find(child => child.classList.contains(selector.slice(1))) || null; },
            getContext: () => ctx
        };
        Object.defineProperty(el,'id',{ get() { return this._id; }, set(value) { this._id=value; elements.set(value,this); } });
        el.classList = {
            contains: name => el.className.split(' ').includes(name),
            add(...names) { el.className = [...new Set([...el.className.split(' '),...names])].join(' '); },
            remove(...names) { el.className = el.className.split(' ').filter(name=>!names.includes(name)).join(' '); },
            toggle(name, on) { this[on ? 'add' : 'remove'](name); }
        };
        return el;
    }
    const document = { addEventListener() {}, createElement: element,
        getElementById(id) { if(!elements.has(id)) { const el=element(); el.id=id; } return elements.get(id); },
        querySelectorAll(selector) { return [...elements.values()].flatMap(el=>[el,...el.children]).filter(el=>el.classList.contains(selector.slice(1))); },
        body: element('body')
    };
    const context=vm.createContext({ document, window: { addEventListener() {}, innerWidth: 390, matchMedia: ()=>({matches:reduced}) },
        requestAnimationFrame:()=>1, cancelAnimationFrame() {}, setTimeout:()=>1, clearTimeout() {},
        performance:{now:()=>0}, SFX:{play(){}}, localStorage:{getItem:()=>null,setItem(){}},
        I18n:{currentLang:'en'}, console
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..','games',game+'-logic.js'),'utf8'),context);
    return { context, elements, document, ctx, drawing, gradients, run: code=>vm.runInContext(code,context) };
}

test('SortStack destination guidance respects matching, capacity, source, and locked tubes', () => {
    const env=load('sortstack');
    env.run('state.stacks=[[0,1],[1],[],[2],[1,1,1,1],[1]]; state.locked=[false,false,false,false,false,true]');
    assert.equal(env.run('JSON.stringify(getLegalStackTargets(0))'),'[1,2]');
    assert.equal(env.run('JSON.stringify(getLegalStackTargets(-1))'),'[]');
});

test('SortStack touch targets do not overlap and ignore space outside the shelf', () => {
    const env=load('sortstack');
    env.run('state.stacks=Array.from({length:12},()=>[])');
    for(let i=0;i<12;i++) for(const offset of [-25,0,25]) {
        assert.equal(env.run(`getStackAtPoint(getStackX(${i})+${offset},150)`),i);
    }
    assert.equal(env.run('getStackAtPoint(getStackX(0),299)'),-1);
    assert.equal(env.run('getStackAtPoint(-5,150)'),-1);
});

test('SortStack renders the ball still in a source tube while another ball moves', () => {
    const env=load('sortstack');
    env.run(`state.stacks=[[0],[]]; state.locked=[false,false]; state.animations=[{type:'arc',fromIdx:0,moving:true,color:1,cx:60,cy:50,startX:60,startY:50,endX:130,endY:200,elapsed:0,duration:250}]; render(10)`);
    assert.ok(env.gradients.filter(value=>value[0]==='createRadialGradient').length >= 2);
    assert.ok(env.drawing.some(value=>value[0]==='fillText' && value[1]==='1'));
    assert.ok(env.drawing.some(value=>value[0]==='fillText' && value[1]==='2'));
});

test('TileTurn cascade preview includes only relevant second-wave neighborhoods', () => {
    const env=load('tileturn');
    env.run('state.size=3; state.mode="cascade"; state.board=Array(9).fill(1)');
    assert.equal(env.run('getTileTurnPreview(4).length'),5);
    env.run('state.board=Array(9).fill(0)');
    assert.equal(env.run('getTileTurnPreview(4).length'),9);
    env.run('state.mode="classic"');
    assert.equal(env.run('JSON.stringify(getTileTurnPreview(0))'),'[0,3,1]');
});

test('TileTurn tiles are keyboard buttons with distinguishable states and an accurate goal', () => {
    const env=load('tileturn');
    env.run('state.size=2; state.mode="spectrum"; state.board=[0,1,2,2]; buildBoardDOM(); updateTileTurnGoal()');
    assert.equal(env.elements.get('tt-tile-0').tagName,'BUTTON');
    assert.equal(env.elements.get('tt-tile-0').textContent,'○');
    assert.equal(env.elements.get('tt-tile-1').textContent,'◆');
    assert.equal(env.elements.get('tt-tile-2').attrs['aria-pressed'],'true');
    assert.match(env.elements.get('tt-goal').textContent,/2\/4 ready/);
});

test('ColorFlow terminal numbers and feedback follow the actual board occupancy', () => {
    const env=load('colorflow');
    env.run(`state.size=2; state.colorsPresent=1; state.paths={1:[]}; state.boardContent=[{type:'marker',color:1,neighbors:[]},{type:'empty',color:null,neighbors:[]},{type:'empty',color:null,neighbors:[]},{type:'marker',color:1,neighbors:[]}]; buildBoardDOM(); updateMetaUI()`);
    assert.equal(env.elements.get('cf-cell-0').children[0].children[0].textContent,'1');
    assert.match(env.elements.get('cf-goal').textContent,/1 pairs left · 2 empty cells/);
    env.run('state.paths[1]=[0,3]; updateMetaUI()');
    assert.match(env.elements.get('cf-goal').textContent,/0 pairs left/);
});

test('PipeLink draws distinct A/B terminals and suppresses flowing dashes under reduced motion', () => {
    const env=load('pipelink',true);
    env.context.testCtx=env.ctx;
    env.run(`PipeLink.ctx=testCtx; PipeLink.canvas={width:200,height:200}; PipeLink.cellSize=100; PipeLink.size=2;
        PipeLink.sources=[{r:0,c:0,t:'A'},{r:1,c:0,t:'B'}]; PipeLink.dests=[{r:0,c:1,t:'A'},{r:1,c:1,t:'B'}];
        PipeLink.grid=[[{type:5,rot:0,colorA:true},{type:6,rot:0,colorA:true}],[{type:5,rot:0,colorB:true},{type:6,rot:0,colorB:true}]];
        PipeLink.drawBoard(500);`);
    assert.equal(env.drawing.filter(value=>value[0]==='fillText' && value[1]==='A').length,2);
    assert.equal(env.drawing.filter(value=>value[0]==='fillText' && value[1]==='B').length,2);
    assert.equal(env.ctx.lineDashOffset,0);
    assert.ok(env.gradients.length>=4);
});

test('PipeLink animation loop is safe before a level creates its board', () => {
    const env = load('pipelink');
    const errors = [];
    env.context.console = { error: (...args) => errors.push(args) };
    env.context.testCtx = env.ctx;
    env.run('PipeLink.ctx=testCtx; PipeLink.canvas={width:400,height:400}; PipeLink.cellSize=100; PipeLink.size=4; PipeLink.gameState="menu";');
    assert.doesNotThrow(() => env.run('PipeLink.drawBoard(); PipeLink.renderLoop(16); PipeLink.renderLoop(32);'));
    assert.equal(errors.length, 0);
    assert.equal(env.drawing.length, 0);
    env.run('PipeLink.grid=[[],[],[],[]]');
    assert.doesNotThrow(() => env.run('PipeLink.drawBoard()'));
    assert.equal(env.drawing.length, 0);
});
