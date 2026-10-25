const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/mosslight-logic.js');
const advance=(s,seconds,input={})=>{for(let i=0;i<Math.ceil(seconds/.05);i++)C.tick(s,input,.05);};
// Abilities are off in the survivor build; tests that cover their preserved code switch them on temporarily.
const withFeatures=(names,fn)=>{const before={...C.config.features};for(const name of names)C.config.features[name]=true;try{fn();}finally{Object.assign(C.config.features,before);}};
const dummy=(id,x,z,hp=20)=>({id,x,z,hp,maxHP:hp,alive:true,phase:'rest',timer:100,flash:0});

test('dated daily links validate UTC calendar dates and preserve an old route on later days',()=>{
    assert.equal(C.validDailyDate('2024-02-29'),true);
    for(const value of ['2026-02-29','2026-02-30','2026-13-01','2026-9-01','2026-09-26T00:00:00Z','not-a-date',null])assert.equal(C.validDailyDate(value),false);
    const url=new URL(C.resultURL('daily','2026-09-24','ko','https://puzzlevault.pages.dev/games/mosslight?mode=daily'));
    assert.equal(url.searchParams.get('date'),'2026-09-24');assert.equal(url.searchParams.get('lang'),'ko');
    const request=C.dailyRequest(url.search,'2026-10-01');assert.deepEqual(request,{daily:true,date:'2026-09-24'});
    const original=C.makeRun({mode:'daily',date:request.date,seed:C.dailySeedForDate(request.date)});
    const retry=C.makeRun({mode:original.mode,date:original.date,seed:C.dailySeedForDate(original.date)});
    assert.deepEqual(original.enemies,retry.enemies);assert.equal(retry.date,'2026-09-24');
    assert.deepEqual(C.dailyRequest('?mode=daily&date=2026-02-30','2026-10-01'),{daily:true,date:'2026-10-01'});
    assert.deepEqual(C.dailyRequest('?date=2026-09-24','2026-10-01'),{daily:false,date:'2026-10-01'});
    const story=new URL(C.resultURL('story','2026-09-24','en',url.href));assert.equal(story.searchParams.has('date'),false);assert.equal(story.searchParams.has('mode'),false);
});
test('explicit daily seed exactly matches the shared UTC seed algorithm',()=>{
    const fs=require('node:fs'),vm=require('node:vm');const source=fs.readFileSync(require('node:path').join(__dirname,'../js/seed.js'),'utf8');
    for(const date of ['2024-02-29','2026-09-24','2026-09-26','2027-01-01']){
        class FixedDate extends Date{constructor(){super(date+'T23:59:59Z');}}
        const shared=vm.runInNewContext(source+"\ngetDailySeed('mosslight')",{Date:FixedDate});
        assert.equal(C.dailySeedForDate(date),shared);
    }
    assert.equal(C.dailySeedForDate('2026-02-30'),null);
    assert.notEqual(C.dailySeedForDate('2026-09-24'),C.dailySeedForDate('2026-09-25'));
});

test('Mosslight seeded islands reproduce encounters without carrying daily upgrades',()=>{
    const a=C.makeRun({seed:4242,mode:'daily'}),b=C.makeRun({seed:4242,mode:'daily'});
    assert.deepEqual(a.enemies,b.enemies);assert.deepEqual(a.spawns,b.spawns);assert.equal(a.zone,0);assert.deepEqual(a.upgrades,[]);assert.equal(a.player.hp,6);
    assert.notEqual(C.makeRun({seed:4243,zone:1}).enemies[0].timer,C.makeRun({seed:4242,zone:1}).enemies[0].timer);
});
test('movement normalizes diagonals and cannot pass through trees or the island edge',()=>{
    const a=C.makeRun(),b=C.makeRun();a.enemies=[];b.enemies=[];const [startX,startZ]=[a.player.x,a.player.z];
    C.tick(a,{x:1,z:0},.05);C.tick(b,{x:1,z:-1},.05);
    assert.ok(Math.abs(Math.hypot(b.player.x-startX,b.player.z-startZ)-(a.player.x-startX))<1e-9);
    advance(a,12,{x:1});assert.ok(a.player.x<=8.8);
    a.player.x=-5.8;a.player.z=3;advance(a,2,{x:1});assert.ok(a.player.x<-5.4);
});
test('all island seeds, beacons and enemy starts are reachable through the collision map',()=>{
    for(let zone=0;zone<3;zone++){
        const s=C.makeRun({zone,upgrades:Array(zone).fill('root')});
        const seen=new Set(),queue=[[0,14]],step=.5;
        while(queue.length){const [x,z]=queue.shift(),key=x+','+z;if(seen.has(key)||!C.canStand(s,x*step,z*step))continue;seen.add(key);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([x+dx,z+dz]);}
        for(const point of [...s.seeds,...s.beacons,s.shrine,...s.enemies,...s.spawns])assert.ok([...seen].some(k=>{const [x,z]=k.split(',').map(Number);return Math.hypot(x*step-point.x,z*step-point.z)<.8;}),`zone ${zone}: ${point.x},${point.z}`);
    }
});
test('gardens (switched on) consume their own charges, heal, strengthen shots and expire',()=>withFeatures(['garden'],()=>{
    const s=C.makeRun();s.player.x=0;s.player.z=4;s.player.hp=3;s.collected=5;s.enemies=[dummy(0,2,4)];
    C.attack(s);assert.equal(s.shots[0].power,1);s.attackCD=0;s.shots=[];
    assert.equal(C.plant(s),true);assert.equal(s.gardenCharges,1);assert.equal(s.collected,5);
    C.attack(s);assert.equal(s.shots[0].power,2);advance(s,2);assert.ok(s.player.hp>3);
    advance(s,13);assert.equal(s.gardens.length,0);advance(s,4);assert.equal(s.gardenCharges,2);
}));
test('enemy attack warns first and dash (switched on) prevents damage during its invulnerable window',()=>withFeatures(['dash'],()=>{
    const s=C.makeRun({zone:1});s.player.x=0;s.player.z=0;const e={id:0,x:1,z:0,hp:3,maxHP:3,alive:true,boss:false,phase:'stalk',timer:0,flash:0};s.enemies=[e];
    C.tick(s,{},.05);assert.equal(e.phase,'warn');assert.equal(s.player.hp,6);advance(s,.5);assert.equal(s.player.hp,6);
    e.phase='rush';e.timer=.3;e.x=.4;e.aimX=-1;e.aimZ=0;e.hit=false;C.dash(s);C.tick(s,{},.05);assert.equal(s.player.hp,6);
    s.player.invuln=0;s.player.dash=0;e.x=s.player.x+.3;e.z=s.player.z;e.hit=false;C.tick(s,{},.05);assert.equal(s.player.hp,5);
}));
test('pause freezes damage, movement, garden lifetime and cooldowns',()=>{
    const s=C.makeRun();C.plant(s);C.dash(s);s.phase='paused';const before=JSON.stringify(s);advance(s,60,{x:1});assert.equal(JSON.stringify(s),before);assert.equal(C.attack(s),false);assert.equal(C.plant(s),false);
});
test('only movement is an input: abilities are off by default and the combo state is gone',()=>{
    assert.deepEqual(C.config.features,{dash:false,garden:false,attune:false,bloom:false});
    const s=C.makeRun();s.energy=100;s.player.x=0;s.player.z=-1;
    for(const action of [C.dash,C.plant,C.bloom,C.interact])assert.equal(action(s),false);
    assert.equal(s.beacons[0].lit,false);assert.equal(s.energy,100);assert.ok(!('combo' in s)&&!('comboTimer' in s));
});
test('the lantern fires every 0.8 seconds at the nearest creature in range and never without one',()=>{
    const s=C.makeRun();s.player.x=0;s.player.z=4;const near=dummy(0,1.5,4),far=dummy(1,-5.8,4);s.enemies=[far,near];
    C.tick(s,{},.05);assert.equal(s.shots.length,1);assert.ok(s.shots[0].vx>0&&Math.abs(s.shots[0].vz)<1e-9);
    let fired=1,previous=s.attackCD;for(let i=1;i<78;i++){C.tick(s,{},.05);if(s.attackCD>previous)fired++;previous=s.attackCD;}
    assert.equal(fired,5);assert.ok(near.hp<20);assert.equal(far.hp,20);
    const idle=C.makeRun();idle.player.x=0;idle.player.z=4;idle.enemies=[dummy(0,0,-3)];advance(idle,3);
    assert.equal(idle.shots.length,0);assert.equal(idle.enemies[0].hp,20);assert.equal(idle.attackCD,0);
});
test('beacons light after 2 seconds inside their ring, leaving resets the timer, and three beacons win',()=>{
    const s=C.makeRun({zone:1});s.enemies=[];const [a,b,c]=s.beacons;assert.equal(s.beacons.length,3);
    s.player.x=a.x+1.4;s.player.z=a.z;advance(s,1.5);assert.equal(a.lit,false);
    s.player.x=a.x+1.6;C.tick(s,{},.05);assert.equal(a.charge,0);
    s.player.x=a.x;advance(s,1.9);assert.equal(a.lit,false);advance(s,.15);assert.equal(a.lit,true);assert.equal(s.restored,1);assert.equal(s.phase,'playing');assert.equal(s.event,'beacon');
    for(const beacon of [b,c]){s.player.x=beacon.x;s.player.z=beacon.z;advance(s,2.05);}
    assert.equal(s.phase,'won');assert.equal(s.restored,3);assert.ok(s.score>=1500);assert.equal(C.markRecorded(s),true);
});
test('losing all vitality ends the run and a retry rebuilds the same island from scratch',()=>{
    const s=C.makeRun({zone:1,seed:7});s.player.hp=1;s.hazards=[{x:s.player.x,z:s.player.z,radius:2,delay:0,life:.5,hit:false}];C.tick(s,{},.05);
    assert.equal(s.phase,'lost');assert.equal(s.player.hp,0);
    const again=C.makeRun({zone:s.zone,seed:8});assert.equal(again.phase,'playing');assert.equal(again.zone,1);assert.equal(again.player.hp,6);assert.equal(again.restored,0);
    assert.ok(again.beacons.every(b=>!b.lit&&b.charge===0));assert.equal(again.shots.length,0);
});
test('windstep cannot be selected twice because its cooldown does not stack',()=>{
    const s=C.makeRun({zone:1,upgrades:['wind']});s.phase='upgrade';assert.equal(C.chooseUpgrade(s,'wind'),false);assert.equal(C.chooseUpgrade(s,'pulse'),true);
});
test('checkpoint parser rejects malformed values and rebuilds a clean island entrance',()=>{
    const s=C.makeRun({zone:1,seed:555,upgrades:['pulse'],score:1200,elapsed:90});const cp=C.checkpoint(s);
    assert.deepEqual(C.validCheckpoint(cp),cp);assert.equal(C.validCheckpoint({...cp,zone:99}),null);assert.equal(C.validCheckpoint({...cp,upgrades:['fake']}),null);assert.equal(C.validCheckpoint({...cp,score:NaN}),null);assert.equal(C.validCheckpoint({...cp,elapsed:-1}),null);assert.equal(C.validCheckpoint({...cp,mode:'daily'}),null);assert.equal(C.validCheckpoint({...cp,seed:0}),null);
    assert.ok(C.validCheckpoint(C.checkpoint(C.makeRun({zone:2}))),'an island entered without upgrades is a valid checkpoint');
    const restored=C.makeRun(C.validCheckpoint(cp));assert.equal(restored.score,1200);assert.equal(restored.player.hp,6);assert.equal(restored.collected,0);assert.equal(restored.player.z,7.4);
});
test('only genuine end states can be recorded and each end records once',()=>{
    const s=C.makeRun();assert.equal(C.markRecorded(s),false);s.phase='paused';assert.equal(C.markRecorded(s),false);s.phase='upgrade';assert.equal(C.markRecorded(s),false);s.phase='lost';assert.equal(C.markRecorded(s),true);assert.equal(C.markRecorded(s),false);
});

test('casters warn then fire three aimed bolts; pausing freezes the volley',()=>{
    const s=C.makeRun();s.player.x=0;s.player.z=0;const e={id:1,x:0,z:-5,hp:4,maxHP:4,alive:true,type:'caster',phase:'stalk',timer:0,flash:0};s.enemies=[e];
    C.tick(s,{},.05);assert.equal(e.phase,'warn');assert.equal(s.projectiles.length,0);advance(s,.9);assert.equal(s.projectiles.length,3);assert.equal(s.player.hp,6);
    assert.ok(s.projectiles.some(p=>Math.abs(p.vx)<.01&&p.vz>0));s.phase='paused';const before=JSON.stringify(s);advance(s,4);assert.equal(JSON.stringify(s),before);
});
test('brute ground strikes have a visible delay and only damage within the marked circle',()=>{
    const s=C.makeRun({zone:1});s.player.x=0;s.player.z=0;const e={id:0,x:1.5,z:0,hp:8,maxHP:8,alive:true,type:'brute',phase:'stalk',timer:0,flash:0};s.enemies=[e];
    C.tick(s,{},.05);assert.equal(e.attackType,'slam');assert.equal(s.hazards.length,1);assert.ok(s.hazards[0].delay>1);assert.equal(s.player.hp,6);advance(s,.7);assert.equal(s.player.hp,6);
    s.player.x=-4;advance(s,.7);assert.equal(s.player.hp,6);
    s.hazards=[{x:s.player.x,z:s.player.z,radius:2,delay:0,life:.5,hit:false}];C.tick(s,{},.05);assert.equal(s.player.hp,4.5);advance(s,.3);assert.equal(s.player.hp,4.5);
});
test('Bloom (switched on) requires full energy, clears bolts, heals and staggers targets exactly once',()=>withFeatures(['bloom'],()=>{
    const s=C.makeRun();s.player.x=0;s.player.z=0;s.player.hp=3;s.enemies=[{id:0,x:2,z:0,hp:20,maxHP:20,alive:true,phase:'warn',timer:.4,flash:0}];s.projectiles=[{x:4,z:0,vx:-2,vz:0,life:3}];
    assert.equal(C.bloom(s),false);s.energy=100;assert.equal(C.bloom(s),true);assert.equal(s.energy,0);assert.equal(s.enemies[0].hp,16);assert.equal(s.enemies[0].phase,'rest');assert.equal(s.projectiles.length,0);assert.equal(s.player.hp,4);assert.ok(s.player.invuln>0);assert.equal(C.bloom(s),false);
}));
test('optional shrine (switched on) needs three victories, offers one blessing and resets on the next island',()=>withFeatures(['attune','garden'],()=>{
    const s=C.makeRun();s.player.x=s.shrine.x;s.player.z=s.shrine.z;assert.equal(C.interact(s),false);assert.equal(s.phase,'playing');
    s.zoneKills=3;assert.equal(C.interact(s),true);assert.equal(s.phase,'shrine');const before=JSON.stringify(s);advance(s,10);assert.equal(JSON.stringify(s),before);assert.equal(C.chooseBoon(s,'fake'),false);
    s.player.hp=2;assert.equal(C.chooseBoon(s,'renewal'),true);assert.equal(s.player.hp,4);assert.equal(s.gardenCharges,3);assert.equal(s.energy,60);assert.equal(C.chooseBoon(s,'flare'),false);
    s.gardenCharges=0;s.enemies=[];advance(s,12.1);assert.equal(s.gardenCharges,1);s.phase='upgrade';C.chooseUpgrade(s,'pulse');assert.equal(s.boon,'');assert.equal(s.shrine.used,false);assert.equal(s.zoneKills,0);
}));
test('Wildflare improves Bloom damage and the final guardian changes attack below half health',()=>withFeatures(['attune','bloom'],()=>{
    const s=C.makeRun({zone:2,upgrades:['root','pulse']});s.phase='shrine';assert.equal(C.chooseBoon(s,'flare'),true);s.energy=100;
    const boss=s.enemies.find(e=>e.boss);s.enemies=[boss];s.player.x=boss.x;s.player.z=boss.z+2;const hp=boss.hp;C.bloom(s);assert.equal(boss.hp,hp-6);
    boss.hp=boss.maxHP/2;boss.phase='stalk';C.tick(s,{},.05);assert.equal(boss.rage,true);assert.equal(boss.phase,'rest');assert.equal(s.event,'rage');
    advance(s,1.75);C.tick(s,{},.05);assert.equal(boss.attackType,'slam');assert.equal(s.hazards.length,2);advance(s,1.1);assert.equal(s.projectiles.length,5);
}));

// Beacon charging rule (all islands) and the island 1 opening (see ZONES[0] in mosslight-logic.js).
test('a creature within 3 of a beacon pauses its charge without resetting it, on every island',()=>{
    const s=C.makeRun({zone:1});s.enemies=[];const b=s.beacons[0];s.player.x=b.x;s.player.z=b.z;
    advance(s,1);assert.ok(Math.abs(b.charge-1)<1e-6);
    // Three tough creatures stand near the beacon; the automatic pulse hits them but cannot clear them.
    s.enemies=[dummy(0,b.x+1,b.z,99),dummy(1,b.x-2,b.z,99),dummy(2,b.x,b.z+2.5,99)];
    advance(s,3);assert.equal(b.blocked,true);assert.ok(Math.abs(b.charge-1)<1e-6);assert.equal(b.lit,false);
    for(const e of s.enemies)e.x=b.x+3.5+e.id;
    advance(s,.5);assert.equal(b.blocked,false);assert.ok(Math.abs(b.charge-1.5)<1e-6);
    advance(s,.55);assert.equal(b.lit,true);
    const t=C.makeRun({zone:1});t.enemies=[];const c=t.beacons[1];t.player.x=c.x;t.player.z=c.z;advance(t,1.5);t.player.x+=2;C.tick(t,{},.05);assert.equal(c.charge,0);
});
test('island 1 starts 4 from the first beacon on a clear path, with guards waiting at beacons 2 and 3',()=>{
    const s=C.makeRun({seed:9}),[first,second,third]=s.beacons;
    assert.ok(Math.abs(C.distance(s.player,first)-4)<1e-9);
    for(let i=0;i<=40;i++){const x=s.player.x+(first.x-s.player.x)*i/40,z=s.player.z+(first.z-s.player.z)*i/40;assert.ok(C.canStand(s,x,z),`blocked at ${x},${z}`);}
    const near=b=>s.enemies.filter(e=>C.distance(e,b)<C.config.beaconClearRadius);
    assert.equal(near(first).length,1);assert.equal(near(first)[0].hp,2);assert.ok(C.distance(near(first)[0],first)<2);
    assert.equal(near(second).length,3);assert.equal(near(third).length,3);
    // Guards are regular creatures: normal speed and attacks; beacon 3 mixes a brute with stalkers.
    assert.ok(near(second).every(e=>e.type==='stalker'&&e.hp>=3&&e.hp<=4));assert.deepEqual(near(third).map(e=>e.type+e.hp).sort(),['brute8','stalker4','stalker4']);
    assert.ok([...near(second),...near(third)].every(e=>!e.speed&&e.timer<90));
    // Each leg between beacons is 4-6 s of walking at the player's 3.8 units per second.
    for(const [a,b] of [[first,second],[second,third]]){const seconds=C.distance(a,b)/3.8;assert.ok(seconds>=4&&seconds<=6,`${seconds.toFixed(2)} s`);}
    assert.equal(s.spawns.length,0);
});
test('walking straight to the first beacon lights it 2 s after the pulse clears its creature, with no damage before',()=>{
    const s=C.makeRun({seed:9}),first=s.beacons[0],weak=s.enemies[0];s.hazards=[{x:first.x,z:first.z,radius:2,delay:0,life:60,hit:false}];
    let died=-1,arrived=-1;
    while(!first.lit&&s.time<15){
        C.tick(s,C.distance(s.player,first)>.3?{z:-1}:{},.05);
        if(died<0&&!weak.alive)died=s.time;if(arrived<0&&C.distance(s.player,first)<=C.config.beaconRadius)arrived=s.time;
        if(!first.lit)assert.equal(s.player.hp,6);
    }
    assert.ok(died>0);assert.equal(first.lit,true);
    assert.ok(Math.abs(first.litAt-(Math.max(died,arrived)+2))<.11,`lit ${first.litAt}, died ${died}, arrived ${arrived}`);
    C.tick(s,{},.05);assert.equal(s.player.hp,4.5);
});
test('after the first beacon a creature enters every 7 s from the edge farthest from the player, two at a time from 30 s',()=>{
    const s=C.makeRun({seed:9});s.enemies=[];s.player.hp=999;
    advance(s,10);assert.equal(s.enemies.length,0,'nothing streams before the first beacon');
    const first=s.beacons[0];s.player.x=first.x;s.player.z=first.z;while(!first.lit)C.tick(s,{},.05);
    const waves=[];let seen=0;
    while(s.time<first.litAt+36){C.tick(s,{},.05);if(s.enemies.length>seen){waves.push({at:+(s.time-first.litAt).toFixed(2),time:s.time,added:s.enemies.slice(seen).map(e=>({x:e.x,z:e.z,hunt:e.hunt}))});seen=s.enemies.length;}}
    assert.deepEqual(waves.map(w=>Math.round(w.at)),[7,14,21,28,35]);
    for(const w of waves)assert.equal(w.added.length,w.time>=30?2:1,`wave at ${w.time.toFixed(1)} s`);
    const firstIn=waves[0].added[0];assert.ok(Math.hypot(firstIn.x+8.2,firstIn.z+8.2)<.2,'enters at the far corner (-8.2, -8.2)');assert.equal(firstIn.hunt,true);
});
test('a hunting creature closes in from beyond 10 units, and standing still at a beacon ends in defeat',()=>{
    const s=C.makeRun({seed:9});s.enemies=[];s.beacons[0].lit=true;s.streamAt=s.time+.05;C.tick(s,{},.05);
    const hunter=s.enemies[0],before=C.distance(hunter,s.player);assert.ok(before>10);advance(s,2);assert.ok(C.distance(hunter,s.player)<before-1);
    const t=C.makeRun({seed:9}),b=t.beacons[0];
    while(t.phase==='playing'&&t.time<120)C.tick(t,C.distance(t.player,b)>.3?{x:b.x-t.player.x,z:b.z-t.player.z}:{},1/60);
    assert.equal(t.beacons[0].lit,true);assert.equal(t.phase,'lost');
});

// Feedback ("juice") events and the gameplay parts of them (knockback, orbs, invulnerability); see config.juice.
test('a pulse hit pushes the creature back along the shot, flashes it white and reports the hit',()=>{
    const s=C.makeRun({zone:1});s.player.x=0;s.player.z=4;const e=dummy(0,2,4,10);s.enemies=[e];
    while(e.hp===10&&s.time<2)C.tick(s,{},.01);
    assert.equal(e.hp,9);assert.ok(Math.abs(e.x-(2+C.config.juice.knockback.distance))<.02,`x ${e.x}`);assert.ok(e.flash>0&&e.flash<=C.config.juice.knockback.flash);
    const hit=s.fx.find(f=>f.type==='hit');assert.ok(hit&&Math.abs(hit.dx-1)<1e-9&&Math.abs(hit.dz)<1e-9);
});
test('a defeated creature drops an orb that flies to a player within 2 and is counted, not shown',()=>{
    const s=C.makeRun({zone:1});s.player.x=0;s.player.z=4;const e=dummy(0,4,4,1);s.enemies=[e];
    while(e.alive&&s.time<2)C.tick(s,{},.01);
    assert.ok(s.fx.some(f=>f.type==='defeat'&&f.enemy.id===0));assert.equal(s.orbs.length,1);
    advance(s,1);assert.equal(s.orbs.length,1);assert.equal(s.xp,0);
    s.player.x=s.orbs[0].x-1.8;advance(s,.5);assert.equal(s.orbs.length,0);assert.equal(s.xp,1);assert.ok(s.fx.some(f=>f.type==='orb'));
});
test('taking a hit grants 0.5 s of invulnerability and reports it; a lit beacon reports itself',()=>{
    const s=C.makeRun({zone:1});s.enemies=[];s.hazards=[{x:s.player.x,z:s.player.z,radius:2,delay:0,life:.05,hit:false}];C.tick(s,{},.05);
    assert.equal(s.player.hp,4.5);assert.ok(Math.abs(s.player.invuln-C.config.juice.hurt.invuln)<1e-9);assert.ok(s.fx.some(f=>f.type==='hurt'));
    const b=s.beacons[0];s.player.x=b.x;s.player.z=b.z;advance(s,2.05);assert.equal(b.lit,true);assert.ok(s.fx.some(f=>f.type==='beacon'&&f.x===b.x&&f.z===b.z));
});

// Visibility behind trees (config.camera, config.visibility).
test('the steeper camera tilts by config.camera.pitch, keeps the ground at the bottom edge, and can be switched off',()=>{
    const legacy=C.cameraPose(2,3,false),steep=C.cameraPose(2,3,true);
    assert.deepEqual(legacy.eye.map(v=>+v.toFixed(6)),[1.56,11.8,14.84]);assert.deepEqual(legacy.look.map(v=>+v.toFixed(6)),[1.56,.25,1.34]);
    assert.ok(Math.abs(steep.pitch*180/Math.PI-C.config.camera.pitch)<1e-9);
    const tilt=C.config.camera.pitch-legacy.pitch*180/Math.PI;assert.ok(tilt>=5&&tilt<=10,`tilt ${tilt.toFixed(2)} deg`);
    const half=C.config.camera.fov*Math.PI/360,bottom=pose=>pose.look[2]+pose.distance*Math.cos(pose.pitch)-pose.distance*Math.sin(pose.pitch)/Math.tan(pose.pitch+half);
    assert.ok(Math.abs(bottom(steep)-bottom(legacy))<1e-9,'same ground reach at the bottom of the view');
    assert.deepEqual(Object.keys(C.config.visibility).filter(k=>typeof C.config.visibility[k]==='boolean').sort(),['fade','fadeDepthWrite','silhouette','steepCamera']);assert.equal(C.config.visibility.fadeDepthWrite,false,'faded occluders write no depth by default');
});
test('camera rays detect ellipsoid occluders between the eye and a target only',()=>{
    const eye=[0,14,12],player=[0,.9,0],tree={x:0,y:3,z:3,rx:2,ry:1.5,rz:2};
    assert.equal(C.segmentHitsEllipsoid(eye,player,tree),true);
    assert.equal(C.segmentHitsEllipsoid(eye,player,{...tree,x:5}),false,'off to the side');
    assert.equal(C.segmentHitsEllipsoid(eye,player,{...tree,z:-4,y:1}),false,'behind the target');
});
