const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/mosslight-logic.js');
const advance=(s,seconds,input={})=>{for(let i=0;i<Math.ceil(seconds/.05);i++)C.tick(s,input,.05);};

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
    assert.deepEqual(a.enemies,b.enemies);assert.equal(a.zone,0);assert.deepEqual(a.upgrades,[]);assert.equal(a.player.hp,6);
    assert.notEqual(C.makeRun({seed:4243}).enemies[0].timer,a.enemies[0].timer);
});
test('movement normalizes diagonals and cannot pass through trees or the island edge',()=>{
    const a=C.makeRun(),b=C.makeRun();a.enemies=[];b.enemies=[];
    C.tick(a,{x:1,z:0},.05);C.tick(b,{x:1,z:-1},.05);
    assert.ok(Math.abs(Math.hypot(b.player.x,b.player.z-7.4)-a.player.x)<1e-9);
    advance(a,12,{x:1});assert.ok(a.player.x<=8.8);
    a.player.x=-5.8;a.player.z=3;advance(a,2,{x:1});assert.ok(a.player.x<-5.4);
});
test('all island seeds, beacons and enemy starts are reachable through the collision map',()=>{
    for(let zone=0;zone<3;zone++){
        const s=C.makeRun({zone,upgrades:Array(zone).fill('root')});
        const seen=new Set(),queue=[[0,14]],step=.5;
        while(queue.length){const [x,z]=queue.shift(),key=x+','+z;if(seen.has(key)||!C.canStand(s,x*step,z*step))continue;seen.add(key);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([x+dx,z+dz]);}
        for(const point of [...s.seeds,s.beacon,...s.enemies])assert.ok([...seen].some(k=>{const [x,z]=k.split(',').map(Number);return Math.hypot(x*step-point.x,z*step-point.z)<.8;}),`zone ${zone}: ${point.x},${point.z}`);
    }
});
test('gardens consume their own charges, heal, increase pulse damage and expire',()=>{
    const s=C.makeRun();s.player.x=0;s.player.z=0;s.player.hp=3;s.collected=5;s.enemies=[{id:0,x:1,z:0,hp:20,maxHP:20,alive:true,boss:false,phase:'rest',timer:100,flash:0}];
    C.attack(s);assert.equal(s.enemies[0].hp,19);s.attackCD=0;
    assert.equal(C.plant(s),true);assert.equal(s.gardenCharges,1);assert.equal(s.collected,5);
    C.attack(s);assert.equal(s.enemies[0].hp,17);advance(s,2);assert.ok(s.player.hp>3);
    advance(s,13);assert.equal(s.gardens.length,0);advance(s,4);assert.equal(s.gardenCharges,2);
});
test('enemy attack warns first and dash prevents damage during its invulnerable window',()=>{
    const s=C.makeRun();s.player.x=0;s.player.z=0;const e={id:0,x:1,z:0,hp:3,maxHP:3,alive:true,boss:false,phase:'stalk',timer:0,flash:0};s.enemies=[e];
    C.tick(s,{},.05);assert.equal(e.phase,'warn');assert.equal(s.player.hp,6);advance(s,.5);assert.equal(s.player.hp,6);
    e.phase='rush';e.timer=.3;e.x=.4;e.aimX=-1;e.aimZ=0;e.hit=false;C.dash(s);C.tick(s,{},.05);assert.equal(s.player.hp,6);
    s.player.invuln=0;s.player.dash=0;e.x=s.player.x+.3;e.z=s.player.z;e.hit=false;C.tick(s,{},.05);assert.equal(s.player.hp,5);
});
test('pause freezes damage, movement, garden lifetime and cooldowns',()=>{
    const s=C.makeRun();C.plant(s);C.dash(s);s.phase='paused';const before=JSON.stringify(s);advance(s,60,{x:1});assert.equal(JSON.stringify(s),before);assert.equal(C.attack(s),false);assert.equal(C.plant(s),false);
});
test('beacons require every seed and enemy, upgrades refill health, third beacon wins',()=>{
    const s=C.makeRun();s.player.x=0;s.player.z=-1;assert.equal(C.interact(s),false);s.collected=5;assert.equal(C.interact(s),false);
    for(let zone=0;zone<3;zone++){
        s.player.x=0;s.player.z=-1;s.collected=5;
        // Defeat with actual pulses, including the final guardian; never mark enemies dead directly.
        for(const e of s.enemies){s.player.x=e.x;s.player.z=e.z;while(e.alive){s.attackCD=0;C.attack(s);}}
        s.player.x=0;s.player.z=-1;assert.equal(C.interact(s),true);assert.equal(s.restored,zone+1);
        if(zone<2){assert.equal(s.phase,'upgrade');assert.equal(C.chooseUpgrade(s,'root'),true);assert.equal(s.player.hp,8+zone*2);assert.equal(s.phase,'playing');}
    }
    assert.equal(s.phase,'won');assert.equal(s.kills,16);assert.ok(s.score>3000);assert.equal(C.chooseUpgrade(s,'root'),false);
});
test('windstep cannot be selected twice because its cooldown does not stack',()=>{
    const s=C.makeRun({zone:1,upgrades:['wind']});s.phase='upgrade';assert.equal(C.chooseUpgrade(s,'wind'),false);assert.equal(C.chooseUpgrade(s,'pulse'),true);
});
test('checkpoint parser rejects malformed values and rebuilds a clean island entrance',()=>{
    const s=C.makeRun({zone:1,seed:555,upgrades:['pulse'],score:1200,elapsed:90});const cp=C.checkpoint(s);
    assert.deepEqual(C.validCheckpoint(cp),cp);assert.equal(C.validCheckpoint({...cp,zone:99}),null);assert.equal(C.validCheckpoint({...cp,upgrades:['fake']}),null);assert.equal(C.validCheckpoint({...cp,score:NaN}),null);assert.equal(C.validCheckpoint({...cp,elapsed:-1}),null);assert.equal(C.validCheckpoint({...cp,mode:'daily'}),null);assert.equal(C.validCheckpoint({...cp,seed:0}),null);
    const restored=C.makeRun(C.validCheckpoint(cp));assert.equal(restored.score,1200);assert.equal(restored.player.hp,6);assert.equal(restored.collected,0);assert.equal(restored.player.z,7.4);
});
test('only genuine end states can be recorded and each end records once',()=>{
    const s=C.makeRun();assert.equal(C.markRecorded(s),false);s.phase='paused';assert.equal(C.markRecorded(s),false);s.phase='upgrade';assert.equal(C.markRecorded(s),false);s.phase='lost';assert.equal(C.markRecorded(s),true);assert.equal(C.markRecorded(s),false);
});
