const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../games/cloudweft-logic.js');

function walkTo(state, level, target, phase) {
    let count = 0;
    while (!state.won && Math.hypot(state.x - target.x, state.z - target.z) > .2 && count < 4500) {
        const dx = target.x - state.x, dz = target.z - state.z, len = Math.hypot(dx, dz);
        const ux = dx / len, uz = dz / len;
        const ahead = level.surfaces.some(p => game.active(p, state.phase) &&
            game.contains(p, state.x + ux * .8, state.z + uz * .8) && Math.abs(p.y - state.y) < .45);
        const nearLight = level.hazards.some(h => {
            const pos = game.hazardAt(h, state.elapsed);
            return Math.hypot(pos.x - state.x, pos.z - state.z) < 1.6;
        });
        game.step(state, level, { x: ux, z: uz, jump: state.grounded && (!ahead || nearLight), glide: !state.grounded,
            dash: !state.grounded && state.vy < 1.5 && !ahead && state.dashCharge > 0,
            phase: phase !== undefined && state.phase !== phase }, 1 / 60);
        count++;
    }
    assert.ok(count < 4500, `route stuck at chapter ${state.chapter}, ${state.x},${state.z} heading to ${target.x},${target.z}`);
}

test('all three designed chapters and their daily mirrors can be completed through ordinary movement inputs', () => {
    for (const seed of [0, 31]) {
        for (let chapter = 0; chapter < 3; chapter++) {
            const level = game.createLevel(chapter, seed), state = game.createState(chapter, seed);
            for (let island = 1; island <= 5; island++) {
                walkTo(state, level, level.islands[island], (island - 1) % 2);
                const glyph = level.glyphs.find(g => Math.hypot(g.x - level.islands[island].x, g.z - level.islands[island].z) < 2);
                if (glyph && !state.glyphs.includes(glyph.id)) {
                    walkTo(state, level, glyph);
                    for(let frame=0;frame<30;frame++)game.step(state,level,{phase:state.phase!==glyph.phase,interact:true});
                    assert.ok(state.glyphs.includes(glyph.id),'a shrine attunes with matching phase and interaction');
                }
                if (island < 5) walkTo(state, level, level.islands[island]);
            }
            assert.equal(state.won, true, `chapter ${chapter} seed ${seed}`);
            assert.equal(state.glyphs.length, 3);
            assert.ok(state.elapsed < 240, 'a deliberate route is finishable without a long grind');
        }
    }
});

test('optional branch is reachable and its two relics remain collected after returning', () => {
    const level = game.createLevel(0), state = game.createState();
    walkTo(state, level, level.islands[1], 0);
    walkTo(state, level, level.islands[2], 1);
    walkTo(state, level, level.relics[0]);
    walkTo(state, level, level.islands[2]);
    walkTo(state, level, level.islands[6], 1);
    walkTo(state, level, level.relics[1]); walkTo(state, level, level.relics[2]);
    walkTo(state, level, level.islands[6]); walkTo(state, level, level.islands[2], 1);
    assert.equal(state.relics.length, 3);
    assert.equal(state.checkpoint, 'i2');
});

test('phase switch really removes bridge support; islands remain solid', () => {
    const level = game.createLevel(), bridge = level.bridges.find(b => b.link === 0 && Math.hypot(b.x, b.z) > 7);
    const state = game.createState();
    Object.assign(state, { x: bridge.x, z: bridge.z, y: bridge.y });
    game.step(state, level, { phase: true });
    assert.equal(state.phase, 1); assert.equal(state.grounded, false);
    game.rescue(state, level, false); game.step(state, level);
    assert.equal(state.grounded, true);
});

test('coyote jump works just after leaving a ledge, with no midair double jump', () => {
    const level = game.createLevel(), state = game.createState();
    Object.assign(state, { x: 3.53, z: 2, y: 0, grounded: false, coyote: .1 });
    game.step(state, level, { jump: true }); assert.ok(state.vy > 7);
    const first = state.vy; game.step(state, level, { jump: true }); assert.ok(state.vy < first);
});

test('fall rescue uses last safe checkpoint, preserves collections and counts exactly once', () => {
    const level = game.createLevel(1), state = game.createState(1);
    Object.assign(state, { checkpoint: 'i3', y: -10, x: -40, glyphs: ['g0'], relics: ['r0'] });
    game.step(state, level);
    assert.equal(state.falls, 1); assert.equal(state.x, level.islands[3].x);
    assert.deepEqual(state.glyphs, ['g0']); assert.deepEqual(state.relics, ['r0']);
    game.step(state, level); assert.equal(state.falls, 1);
});

test('portal cannot complete without all glyphs and winning freezes the timer', () => {
    const level = game.createLevel(), state = game.createState();
    Object.assign(state, { x: level.portal.x, z: level.portal.z, y: level.portal.y });
    game.step(state, level); assert.equal(state.won, false);
    state.glyphs = ['g0', 'g1', 'g2']; game.step(state, level); assert.equal(state.won, true);
    const elapsed = state.elapsed; game.step(state, level, { x: 1 }); assert.equal(state.elapsed, elapsed);
});

test('checkpoint save validates data, deduplicates items and restores without counting a fall', () => {
    const state = game.createState(2, 31);
    Object.assign(state, { checkpoint: 'i4', phase: 1, elapsed: 50, falls: 2, glyphs: ['g0', 'g1'], relics: ['r0'] });
    const saved = game.serialize(state); saved.glyphs.push('g0', 'bogus');
    const restored = game.restore(saved);
    assert.ok(restored); assert.equal(restored.state.falls, 2); assert.equal(restored.state.y, restored.level.islands[4].y);
    assert.deepEqual(restored.state.glyphs, ['g0', 'g1']); assert.equal(restored.state.elapsed, 50);
    for (const override of [{ chapter: 12 }, { seed: -1 }, { elapsed: NaN }, { falls: -2 }, { checkpoint: 'b0-4' }, { phase: 5 }]) {
        assert.equal(game.restore({ ...saved, ...override }), null);
    }
});

test('daily mirroring preserves every bridge and pickup connection', () => {
    const a = game.createLevel(2, 30), b = game.createLevel(2, 31);
    assert.equal(a.surfaces.length, b.surfaces.length);
    a.islands.forEach((island, i) => { assert.equal(island.x, -b.islands[i].x); assert.equal(island.z, b.islands[i].z); });
    assert.deepEqual(a.links.map(l => [l.a, l.b, l.phase]), b.links.map(l => [l.a, l.b, l.phase]));
});

test('scoring and medals match the published rules without negative scores', () => {
    const state = game.createState(); Object.assign(state, { elapsed: 90, relics: ['r0', 'r1', 'r2', 'r3'] });
    assert.equal(game.score(state), 2930); assert.equal(game.medal(state), 'gold');
    state.falls = 1; assert.equal(game.medal(state), 'silver');
    state.falls = 4; assert.equal(game.medal(state), 'bronze');
    state.elapsed = 10000; assert.equal(game.score(state), 100);
});

test('five language dictionaries cover every UI string and include specific gameplay guidance', () => {
    const keys = Object.keys(game.COPY.en).sort();
    for (const code of ['ko', 'ja', 'zh', 'es']) {
        assert.deepEqual(Object.keys(game.COPY[code]).sort(), keys);
        assert.equal(game.COPY[code].guide.length, 4); assert.equal(game.COPY[code].faq.length, 3);
        assert.equal(game.COPY[code].chapterNames.length, 3);
    }
});

test('truthy primitive progress and malformed campaign results recover without crashing', () => {
    for (const value of ['bad', 42, true, [], null]) {
        assert.deepEqual(game.normalizeProgress(value), { unlocked: 1, best: {} });
    }
    assert.deepEqual(game.normalizeProgress({ unlocked: 2.9, best: { valid: 2345, invalid: '9999', negative: -1 } }),
        { unlocked: 2, best: { valid: 2345 } });
    const good = { chapter: 0, score: 2200, elapsed: 30, falls: 0, relics: 1, medal: 'silver' };
    assert.deepEqual(game.normalizeResults([null, 'bad', good], 1), [good]);
    assert.deepEqual(game.normalizeResults([good, { ...good, chapter: 2 }], 1), [good]);
});


test('runes require an explicit grounded interaction in their matching phase', () => {
    const level=game.createLevel(),state=game.createState(),rune=level.glyphs[0];
    Object.assign(state,{x:rune.x,z:rune.z,y:rune.y-.9,phase:1-rune.phase});
    game.step(state,level,{interact:true});assert.equal(state.glyphs.length,0);
    game.step(state,level,{phase:true});assert.equal(state.glyphs.length,0,'walking over a matched rune does not attune it');
    game.step(state,level,{interact:true});assert.deepEqual(state.glyphs,[rune.id]);
    game.step(state,level,{interact:true});assert.equal(state.glyphs.length,1);
});

test('air dash spends one charge, cannot repeat in air, and refills on landing', () => {
    const level=game.createLevel(),state=game.createState();
    game.step(state,level,{jump:true,z:-1});
    game.step(state,level,{dash:true,z:-1});
    assert.equal(state.dashCharge,0);assert.ok(state.dashTimer>0);const first=state.dashTimer;
    game.step(state,level,{dash:true,z:-1});assert.ok(state.dashTimer<first);
    game.rescue(state,level,false);assert.equal(state.dashCharge,1);
    game.step(state,level,{dash:true});assert.equal(state.dashTimer,0,'a grounded button press does not spend the charge');
});

test('gliding limits descent only while energy remains and wind motes refill both abilities', () => {
    const level=game.createLevel(1),state=game.createState(1);
    Object.assign(state,{x:30,y:5,z:-20,vy:-5,grounded:false,coyote:0,dashCharge:0});
    game.step(state,level,{glide:true});assert.ok(state.vy>=-1.7);assert.ok(state.glideEnergy<1.5);
    state.glideEnergy=0;game.step(state,level,{glide:true});assert.ok(state.vy < -1.7);
    const mote=level.motes[0];Object.assign(state,{x:mote.x,z:mote.z,y:mote.y-.6,vy:0});
    game.step(state,level);assert.equal(state.dashCharge,1);assert.equal(state.glideEnergy,1.5);assert.ok(state.events.includes('recharge'));
    state.dashCharge=0;game.step(state,level);assert.equal(state.dashCharge,0,'mote has an eight-second cooldown');
    state.elapsed+=8;game.step(state,level);assert.equal(state.dashCharge,1);
});

test('each chapter has its own geometry while legacy checkpoint saves keep attuned runes', () => {
    assert.notDeepEqual(game.createLevel(0).islands.map(i=>[i.x,i.z]),game.createLevel(1).islands.map(i=>[i.x,i.z]));
    assert.notDeepEqual(game.createLevel(1).islands.map(i=>[i.x,i.z]),game.createLevel(2).islands.map(i=>[i.x,i.z]));
    const saved={version:1,chapter:1,seed:0,checkpoint:'i4',phase:1,glyphs:['g0','g1'],relics:['r0'],elapsed:51,falls:1};
    const resumed=game.restore(saved);assert.ok(resumed);assert.deepEqual(resumed.state.glyphs,['g0','g1']);assert.equal(resumed.state.dashCharge,1);
});

test('the optional traversal branch and all four relics are reachable in every chapter and mirror', () => {
    for(const seed of [0,31])for(let chapter=0;chapter<3;chapter++){
        const level=game.createLevel(chapter,seed),state=game.createState(chapter,seed);
        walkTo(state,level,level.islands[1],0);walkTo(state,level,level.islands[2],1);
        walkTo(state,level,level.relics[0]);walkTo(state,level,level.islands[2]);
        walkTo(state,level,level.islands[6],1);walkTo(state,level,level.relics[1]);walkTo(state,level,level.relics[2]);
        walkTo(state,level,level.islands[6]);walkTo(state,level,level.islands[2],1);
        walkTo(state,level,level.islands[3],0);walkTo(state,level,level.islands[4],1);walkTo(state,level,level.islands[5],0);
        walkTo(state,level,level.relics[3]);assert.equal(state.relics.length,4,`chapter ${chapter} mirror ${seed}`);
    }
});


test('air dashes preserve distance for diagonal and straight input', () => {
    const level=game.createLevel(),straight=game.createState(),diagonal=game.createState();
    for(const state of [straight,diagonal])Object.assign(state,{x:20,z:10,y:5,grounded:false,coyote:0});
    game.step(straight,level,{dash:true,x:1},1/60);game.step(diagonal,level,{dash:true,x:1,z:1},1/60);
    assert.ok(Math.abs(Math.hypot(straight.x-20,straight.z-10)-Math.hypot(diagonal.x-20,diagonal.z-10))<1e-10);
});
