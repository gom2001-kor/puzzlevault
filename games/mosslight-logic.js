/* Mosslight Wardens — original game rules, world geometry and interface. No remote assets. */
(function (root) {
    'use strict';
    const ZONES = [
        { name: 'glade', ground: '#224d45', accent: '#86efac', obstacles: [[-4, 3, 1.1], [4, 0, 1.2], [-3, -5, 1], [6, -6, 1]], seeds: [[-6, 5], [6, 4], [-6, -2], [5, -4], [0, -7]], enemies: [[-5, 2], [5, 2], [-5, -4], [4, -6], [0, -5]] },
        { name: 'terrace', ground: '#253c59', accent: '#93c5fd', obstacles: [[-3, 4, 1.3], [3, 0, 1.1], [-4, -3, 1.1], [5, -6, 1.2]], seeds: [[-6, 6], [6, 5], [-6, -5], [6, -2], [0, -7]], enemies: [[-6, 2], [5, 3], [-6, -2], [5, -4], [-2, -7], [2, -7]] },
        { name: 'heart', ground: '#433953', accent: '#c4b5fd', obstacles: [[-4, 4, 1.2], [4, 4, 1.2], [-6, -3, 1.1], [6, -3, 1.1]], seeds: [[-6, 6], [6, 6], [-7, -1], [7, -1], [0, -7]], enemies: [[-5, 1], [5, 1], [-4, -6], [4, -6], [0, -5, true]] }
    ];
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
    function validDailyDate(value) {
        return typeof value === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(value) &&
            Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0,10) === value;
    }
    function dailySeedForDate(date) {
        if (!validDailyDate(date)) return null;
        // Matches getDailySeed('mosslight') while allowing an explicitly shared UTC date.
        let hash = 0; for (const char of 'mosslight:' + date) { hash = ((hash << 5) - hash) + char.charCodeAt(0); hash |= 0; }
        return Math.abs(hash);
    }
    function dailyRequest(search, today = new Date().toISOString().slice(0,10)) {
        const params = new URLSearchParams(search), daily = params.get('mode') === 'daily';
        return { daily, date: daily && validDailyDate(params.get('date')) ? params.get('date') : today };
    }
    function resultURL(mode, date, language, base) {
        const url = new URL('/games/mosslight.html', base); url.searchParams.set('lang', language);
        if (mode === 'daily') { url.searchParams.set('mode','daily'); if(validDailyDate(date))url.searchParams.set('date',date); }
        return url.href;
    }
    function makeRun(options = {}) {
        const zone = Number.isInteger(options.zone) ? clamp(options.zone, 0, 2) : 0;
        const upgrades = Array.isArray(options.upgrades) ? options.upgrades.filter(x => ['root', 'pulse', 'wind'].includes(x)).slice(0, zone) : [];
        const state = { phase: 'playing', zone, seed: (options.seed >>> 0) || 1, mode: options.mode === 'daily' ? 'daily' : 'story', date: options.date || '', roundId: options.roundId || '', recorded: false, upgrades, score: Math.max(0, Math.floor(options.score || 0)), elapsed: Math.max(0, options.elapsed || 0), kills: Math.max(0, Math.floor(options.kills || 0)), restored: zone, event: '', eventId: 0 };
        loadZone(state); return state;
    }
    function loadZone(s) {
        const random = rng(s.seed + s.zone * 991), spec = ZONES[s.zone];
        s.maxHP = 6 + s.upgrades.filter(x => x === 'root').length * 2;
        s.player = { x: 0, z: 7.4, hp: s.maxHP, facingX: 0, facingZ: -1, invuln: 0, dash: 0 };
        s.attackCD = 0; s.dashCD = 0; s.gardenCD = 0; s.gardenCharges = 2; s.gardenRegen = 0; s.pulse = 0; s.pulseRange = 0; s.gardens = []; s.collected = 0; s.beacon = { x: 0, z: -1, restored: false }; s.seeds = spec.seeds.map(([x,z], i) => ({ x, z, id: i, taken: false }));
        s.enemies = spec.enemies.map(([x,z,boss],i) => ({ id:i, x,z, boss:!!boss, hp:boss ? 18 : 3 + s.zone, maxHP:boss ? 18 : 3 + s.zone, phase:'stalk', timer:0.7+random(), aimX:0, aimZ:0, hit:false, alive:true, flash:0 }));
        s.phase = 'playing'; event(s, 'enter');
    }
    function event(s, name) { s.event = name; s.eventId++; }
    function canStand(s, x, z, radius = 0.34) {
        if (Math.abs(x) > 8.8 || Math.abs(z) > 8.8) return false;
        return !ZONES[s.zone].obstacles.some(([ox,oz,r]) => Math.hypot(x-ox,z-oz) < r + radius);
    }
    function move(s, actor, dx, dz) {
        if (canStand(s, actor.x+dx, actor.z)) actor.x += dx;
        if (canStand(s, actor.x, actor.z+dz)) actor.z += dz;
    }
    function inGarden(s) { return s.gardens.some(g => g.life > 0 && distance(g,s.player) < g.radius); }
    function attack(s) {
        if (s.phase !== 'playing' || s.attackCD > 0) return false;
        const charged = inGarden(s), power = 1 + (charged ? 1 : 0) + s.upgrades.filter(x=>x==='pulse').length;
        s.attackCD = charged ? .48 : .62; s.pulse = .24; s.pulseRange = charged ? 3 : 2.15;
        for (const e of s.enemies) if (e.alive && distance(e,s.player) <= s.pulseRange + (e.boss ? .5 : .2)) {
            e.hp -= power; e.flash=.2;
            if (e.hp <= 0) { e.hp=0; e.alive=false; s.kills++; s.score += e.boss ? 600 : 90 + s.zone * 30; }
        }
        event(s,charged ? 'charged' : 'pulse'); return true;
    }
    function dash(s) {
        if (s.phase !== 'playing' || s.dashCD > 0) return false;
        s.player.dash=.2; s.player.invuln=Math.max(s.player.invuln,.35); s.dashCD=s.upgrades.includes('wind') ? 1.4 : 2.3; event(s,'dash'); return true;
    }
    function plant(s) {
        if (s.phase !== 'playing' || s.gardenCharges <= 0 || s.gardenCD > 0) return false;
        s.gardenCharges--; s.gardenCD=1; s.gardens.push({x:s.player.x,z:s.player.z,life:14,radius:2.3}); event(s,'garden'); return true;
    }
    function interact(s) {
        if (s.phase !== 'playing' || distance(s.player,s.beacon) > 2.2) return false;
        if (s.collected < 5 || s.enemies.some(e=>e.alive)) { event(s,'locked'); return false; }
        s.beacon.restored=true; s.restored++; s.score+=500; s.phase=s.zone===2 ? 'won' : 'upgrade'; event(s,s.phase); return true;
    }
    function chooseUpgrade(s, upgrade) {
        if (s.phase !== 'upgrade' || !['root','pulse','wind'].includes(upgrade) || (upgrade === 'wind' && s.upgrades.includes('wind'))) return false;
        s.upgrades.push(upgrade); s.zone++; loadZone(s); return true;
    }
    function tick(s, input = {}, dt = 0) {
        if (s.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
        dt=Math.min(dt,.05); s.elapsed+=dt;
        for (const key of ['attackCD','dashCD','gardenCD','pulse']) s[key]=Math.max(0,s[key]-dt);
        s.player.invuln=Math.max(0,s.player.invuln-dt);
        s.gardenRegen+=dt; if(s.gardenRegen>=18){s.gardenRegen-=18;s.gardenCharges=Math.min(3,s.gardenCharges+1);}
        s.gardens=s.gardens.filter(g=>{g.life-=dt;return g.life>0;});
        if (inGarden(s)) s.player.hp=Math.min(s.maxHP,s.player.hp+dt*.48);
        let x=Number(input.x)||0,z=Number(input.z)||0,n=Math.hypot(x,z);
        if(n>0){x/=n;z/=n;s.player.facingX=x;s.player.facingZ=z;}
        if(s.player.dash>0){s.player.dash=Math.max(0,s.player.dash-dt);move(s,s.player,s.player.facingX*11*dt,s.player.facingZ*11*dt);}
        else move(s,s.player,x*3.8*dt,z*3.8*dt);
        for(const seed of s.seeds) if(!seed.taken&&distance(seed,s.player)<.85){seed.taken=true;s.collected++;s.score+=45;event(s,'seed');}
        for(const e of s.enemies){
            if(!e.alive)continue; e.flash=Math.max(0,e.flash-dt);e.timer-=dt;
            const d=distance(e,s.player),dx=(s.player.x-e.x)/(d||1),dz=(s.player.z-e.z)/(d||1);
            if(e.phase==='stalk'){
                if(d<8 && d>1.65)move(s,e,dx*dt*(e.boss?.95:1.35),dz*dt*(e.boss?.95:1.35));
                if(e.timer<=0&&d<4.3){e.phase='warn';e.timer=e.boss?1.1:.85;e.aimX=dx;e.aimZ=dz;e.hit=false;}
            }else if(e.phase==='warn'){
                if(e.timer<=0){e.phase='rush';e.timer=e.boss?.65:.42;}
            }else if(e.phase==='rush'){
                move(s,e,e.aimX*(e.boss?5:6)*dt,e.aimZ*(e.boss?5:6)*dt);
                if(!e.hit&&d<(e.boss?1.45:.92)&&s.player.invuln<=0){s.player.hp-=e.boss?1.5:1;s.player.invuln=1.15;e.hit=true;event(s,'hurt');}
                if(e.timer<=0){e.phase='rest';e.timer=e.boss?1.8:1.4;}
            }else if(e.timer<=0){e.phase='stalk';e.timer=.2;}
        }
        if(s.player.hp<=0){s.player.hp=0;s.phase='lost';event(s,'lost');}
    }
    function checkpoint(s) { return { version:1,zone:s.zone,upgrades:s.upgrades.slice(),seed:s.seed,score:s.score,kills:s.kills,elapsed:s.elapsed,mode:s.mode }; }
    function validCheckpoint(value) {
        if(!value||value.version!==1||value.mode!=='story'||!Number.isInteger(value.zone)||value.zone<0||value.zone>2||!Number.isInteger(value.seed)||value.seed<1||value.seed>4294967295)return null;
        if(!Array.isArray(value.upgrades)||value.upgrades.length!==value.zone||value.upgrades.some(x=>!['root','pulse','wind'].includes(x)))return null;
        for(const k of ['score','kills','elapsed'])if(!Number.isFinite(value[k])||value[k]<0||value[k]>1e7)return null;
        return { ...value,upgrades:value.upgrades.slice() };
    }
    function markRecorded(s){if(!['won','lost'].includes(s.phase)||s.recorded)return false;s.recorded=true;return true;}
    const Core={ZONES,makeRun,loadZone,canStand,move,inGarden,attack,dash,plant,interact,chooseUpgrade,tick,checkpoint,validCheckpoint,markRecorded,distance,validDailyDate,dailySeedForDate,dailyRequest,resultURL};
    if(typeof module!=='undefined'&&module.exports)module.exports=Core;
    root.MosslightCore=Core;
    if(typeof document==='undefined')return;

    const TEXT={
        en:{subtitle:'A small guardian. A forest worth saving.',eyebrow:'ORIGINAL 3D ACTION RPG',intro:'Carry five glowseeds to each beacon. Outwit crystal creatures, grow healing gardens and choose your guardian’s upgrades across three forest islands.',start:'Begin expedition',daily:'Daily expedition',resume:'Continue checkpoint',dailyNote:'Daily: the same seeded expedition for everyone today (UTC). Replays allowed; scores stay on your device.',checkpoint:'Expedition saves at the start of each island.',zone:'Island',glade:'The Waking Glade',terrace:'Rainstone Terrace',heart:'The Hollow Heart',health:'Vitality',seeds:'Glowseeds',foes:'Creatures',score:'Score',best:'Personal best',objective:'Collect 5 glowseeds · clear the creatures · restore the beacon',readyBeacon:'The beacon is ready — approach the central pillar and press Restore.',pulse:'Pulse',dash:'Dash',garden:'Garden',restore:'Restore',pause:'Pause',resumePlay:'Resume',restart:'New expedition',sound:'Sound',on:'On',off:'Off',help:'Controls & goal',controls:'Move: WASD / arrows · Pulse: Space / J · Dash: Shift / K · Garden: Q / L · Restore: E · Pause: P / Esc',touchHelp:'Hold the direction pad to move. Tap Pulse near a creature. Garden heals and doubles the base pulse damage while you stand inside it.',enter:'Find the five floating glowseeds. Watch amber warnings before creatures rush!',charged:'Garden pulse! Extra power from the living roots.',gardenEvent:'Garden planted: stand inside to heal and strengthen your pulse.',seedEvent:'Glowseed collected.',hurt:'Step aside when a creature turns amber. Dash makes you briefly invulnerable.',locked:'First collect all 5 glowseeds and clear every creature.',paused:'The forest can wait.',pausedText:'Your expedition is paused. Resume when you are ready.',upgrade:'A beacon blooms.',upgradeText:'Choose a permanent upgrade for this expedition. Your vitality refills on the next island.',root:'Deep roots',rootDesc:'+2 maximum vitality',pulseUpgrade:'Bright pulse',pulseDesc:'+1 damage to every pulse',wind:'Windstep',windDesc:'Dash cooldown: 2.3 → 1.4 seconds',won:'The forest is awake.',wonText:'Three beacons are burning again. The crystal guardian has returned to the roots. Your next expedition can follow a different build.',lost:'Rest beneath the roots.',lostText:'The expedition ended. Amber tells you when to dodge; a garden lets you heal and strike harder. Your island checkpoint is safe in Expedition mode.',retry:'Try again',share:'Share this expedition',back:'Back to camp',time:'Time',restored:'Beacons',build:'Your build',none:'No upgrades yet',saved:'Local progress only · no account required',webgl:'This browser could not start WebGL. Try a current browser with hardware acceleration enabled. The other PuzzleVault games are still available below.',wins:'Forests restored',modeDaily:'Daily',modeStory:'Expedition',guideTitle:'How to play Mosslight Wardens',faqTitle:'Questions from the trail',faq1q:'What does a garden do?',faq1a:'A garden lasts 14 seconds. Stand inside its visible green ring to recover vitality and add 1 pulse damage. You begin each island with two garden charges; another charge grows every 18 seconds, up to three. Glowseeds are separate quest items and are never spent on gardens.',faq2q:'What is saved, and how does Daily work?',faq2a:'Expedition saves your island entrance and chosen upgrades on this device. Continue restarts that island at full vitality. Daily always starts on island one, uses today’s UTC seed and can be replayed. Best scores and restored-forest counts are local, not a verified leaderboard.',faq3q:'Are there paid upgrades or copyrighted assets?',faq3a:'All islands and upgrades are free. The models, maps, effects and game code were created for PuzzleVault, with geometric shapes and synthesized audio. No downloaded game artwork, characters or music is used.',guide:'You are a lantern keeper crossing three floating forest islands. Each island has five glowseeds, a central beacon and crystal creatures guarding the paths. Walk over every floating gold seed to collect it. Defeat the creatures, approach the beacon, then press Restore to wake its roots. The counter above the world shows exactly what remains.\nMove with WASD, arrow keys or the direction pad. Pulse damages every creature within the expanding ring around you; you do not need to aim. Creatures turn amber before rushing in a fixed direction. Step sideways during that warning, or dash through danger, then strike while they recover. The final island has a larger guardian with more vitality and a longer rush.\nYour strongest tool is a living garden. Plant one, stay inside its green ring to heal, and pulse from its roots for extra damage. Charges regrow over time, so use them before your vitality becomes critical. Gardens do not spend the five glowseeds needed for a beacon.\nAfter the first two beacons, choose more vitality, stronger pulses or a faster dash. Each choice lasts for the expedition, and the next island starts at full vitality. Expedition mode keeps an island checkpoint locally. Daily starts a fresh, shared seeded course and permits practice replays. Pause whenever needed; hiding this tab also pauses the game. Finish the forest, compare your own builds and share your result with a friend.'},
        ko:{subtitle:'작은 수호자, 다시 빛날 숲.',eyebrow:'오리지널 3D 액션 RPG · 이끼빛 수호대',intro:'섬마다 빛씨앗 5개를 모아 봉화를 되살리세요. 수정 생물의 돌진을 피하고, 치유 정원을 심고, 나만의 능력을 골라 숲의 세 섬을 탐험하세요.',start:'탐험 시작',daily:'오늘의 탐험',resume:'저장한 섬부터 계속',dailyNote:'오늘의 탐험: UTC 날짜가 같으면 같은 시드로 진행합니다. 다시 도전할 수 있으며 기록은 이 기기에만 저장됩니다.',checkpoint:'일반 탐험은 각 섬의 시작 지점을 저장합니다.',zone:'섬',glade:'깨어나는 숲',terrace:'빗돌 정원',heart:'속 빈 숲의 심장',health:'생명력',seeds:'빛씨앗',foes:'수정 생물',score:'점수',best:'내 최고 기록',objective:'빛씨앗 5개 수집 → 수정 생물 모두 물리치기 → 중앙 봉화 복원',readyBeacon:'봉화를 복원할 수 있어요! 중앙 기둥 가까이에서 복원을 누르세요.',pulse:'빛 파동',dash:'돌진',garden:'정원',restore:'복원',pause:'일시정지',resumePlay:'계속하기',restart:'새 탐험',sound:'소리',on:'켜짐',off:'꺼짐',help:'조작과 목표',controls:'이동: WASD / 방향키 · 파동: Space / J · 돌진: Shift / K · 정원: Q / L · 복원: E · 정지: P / Esc',touchHelp:'방향 버튼을 길게 눌러 이동하세요. 생물 가까이에서 파동을 누르세요. 정원 안에서는 생명력이 회복되고 기본 파동 피해가 두 배가 됩니다.',enter:'떠 있는 빛씨앗 5개를 찾으세요. 적이 주황색으로 변하면 돌진을 준비한다는 뜻이에요!',charged:'정원의 힘! 파동이 더 강해졌어요.',gardenEvent:'정원을 심었어요. 초록 원 안에서 회복하고 강한 파동을 쓰세요.',seedEvent:'빛씨앗을 모았어요.',hurt:'적이 주황색일 때 옆으로 피하세요. 돌진 중에는 잠시 피해를 받지 않아요.',locked:'빛씨앗 5개를 모으고 모든 수정 생물을 물리쳐야 해요.',paused:'숲이 잠시 기다릴게요.',pausedText:'탐험이 멈췄어요. 준비되면 계속하세요.',upgrade:'봉화가 다시 빛나요.',upgradeText:'이번 탐험에서 사용할 능력을 하나 고르세요. 다음 섬에서는 생명력이 모두 회복됩니다.',root:'깊은 뿌리',rootDesc:'최대 생명력 +2',pulseUpgrade:'찬란한 파동',pulseDesc:'모든 파동 피해 +1',wind:'바람걸음',windDesc:'돌진 대기시간 2.3 → 1.4초',won:'숲이 깨어났어요.',wonText:'세 봉화가 다시 빛나고 수정 수호자는 뿌리로 돌아갔어요. 다음 탐험에서는 다른 능력 조합을 시도해 보세요.',lost:'뿌리 아래서 쉬어 가요.',lostText:'탐험이 끝났어요. 주황색 경고를 보고 피하고, 정원 안에서 회복하며 싸워 보세요. 일반 탐험의 섬 시작점은 저장되어 있어요.',retry:'다시 도전',share:'탐험 결과 공유',back:'야영지로',time:'시간',restored:'복원한 봉화',build:'선택한 능력',none:'아직 선택하지 않았어요',saved:'기기에만 저장 · 가입 없이 플레이',webgl:'이 브라우저에서 WebGL을 시작하지 못했어요. 최신 브라우저와 하드웨어 가속 설정을 확인해 주세요. 아래의 다른 퍼즐은 계속 즐길 수 있어요.',wins:'숲 복원 횟수',modeDaily:'오늘의 탐험',modeStory:'탐험',guideTitle:'Mosslight Wardens 플레이 방법',faqTitle:'탐험 안내',faq1q:'정원은 어떤 효과가 있나요?',faq1a:'정원은 14초 동안 유지됩니다. 초록 원 안에 서 있으면 생명력이 회복되고 파동 피해가 1 늘어납니다. 섬마다 정원 2개로 시작하며 18초마다 1개씩, 최대 3개까지 충전됩니다. 봉화용 빛씨앗은 별도 아이템이라 정원을 심어도 줄어들지 않습니다.',faq2q:'저장과 오늘의 탐험은 어떻게 작동하나요?',faq2a:'일반 탐험은 섬의 시작점과 선택한 능력을 이 기기에 저장합니다. 이어 하면 해당 섬을 생명력이 가득 찬 상태로 시작합니다. 오늘의 탐험은 UTC 날짜별 시드를 사용하고 항상 첫 섬에서 시작하며 반복할 수 있습니다. 기록은 서버에서 검증하는 순위표가 아닙니다.',faq3q:'유료 능력이나 외부 게임 소재가 있나요?',faq3a:'모든 섬과 능력은 무료입니다. 지형, 모델, 효과와 게임 코드는 PuzzleVault를 위해 만들었으며 기하학 도형과 합성 효과음을 사용합니다. 다른 게임에서 가져온 캐릭터, 그림, 음악은 사용하지 않습니다.',guide:'등불지기가 되어 공중에 떠 있는 숲의 세 섬을 탐험하세요. 각 섬에는 빛씨앗 다섯 개, 중앙 봉화, 길을 지키는 수정 생물이 있습니다. 금빛 씨앗 위로 걸어가면 자동으로 모을 수 있습니다. 모든 씨앗을 모으고 수정 생물을 물리친 뒤 봉화 가까이에서 복원을 누르세요. 화면 위의 숫자로 남은 목표를 확인할 수 있습니다.\nWASD, 방향키 또는 화면의 방향 버튼으로 이동합니다. 빛 파동은 주변 원 안에 있는 모든 적을 공격하므로 방향을 조준하지 않아도 됩니다. 수정 생물은 주황색으로 변한 뒤 정해진 방향으로 돌진합니다. 경고가 보일 때 옆으로 피하거나 돌진 기술로 빠져나온 뒤, 적이 쉬는 동안 공격하세요. 마지막 섬에는 생명력이 많고 더 길게 돌진하는 큰 수호자가 등장합니다.\n살아 있는 정원이 가장 중요한 도구입니다. 초록 원 안에서는 생명력이 회복되고 파동이 강해집니다. 충전량은 시간이 지나면 회복되므로 위급해지기 전에 활용하세요. 정원은 봉화에 필요한 빛씨앗을 소비하지 않습니다.\n처음 두 봉화를 되살리면 생명력, 파동 피해, 돌진 중 하나를 강화할 수 있습니다. 선택은 이번 탐험 동안 유지되며 다음 섬에서 생명력이 가득 찹니다. 일반 탐험에는 섬 시작점 저장이 있고 오늘의 탐험은 같은 날짜의 시드로 처음부터 도전합니다. 탭을 숨기면 자동으로 멈춥니다. 숲을 되살리고 다른 능력 조합에 도전하거나 결과를 친구에게 공유해 보세요.'},
        ja:{subtitle:'小さな守り手が、森を再び灯す。',eyebrow:'オリジナル3DアクションRPG',intro:'各島で光の種を5個集め、灯台を復元。結晶の生き物をかわし、癒やしの庭を育て、3つの島で能力を選びましょう。',start:'探検を始める',daily:'今日の探検',resume:'保存した島から',dailyNote:'今日の探検はUTCの日付ごとに同じシードです。何度でも挑戦でき、記録はこの端末に保存されます。',checkpoint:'通常の探検は各島の入口を保存します。',zone:'島',glade:'目覚めの林',terrace:'雨石の段丘',heart:'空洞の心臓',health:'生命力',seeds:'光の種',foes:'結晶',score:'得点',best:'自己ベスト',objective:'種5個を集める → 結晶を全て倒す → 中央の灯台を復元',readyBeacon:'灯台の準備完了！中央の柱の近くで復元を押しましょう。',pulse:'波動',dash:'ダッシュ',garden:'庭',restore:'復元',pause:'一時停止',resumePlay:'再開',restart:'新しい探検',sound:'音',on:'オン',off:'オフ',help:'操作と目標',controls:'移動: WASD / 矢印 · 波動: Space / J · ダッシュ: Shift / K · 庭: Q / L · 復元: E · 停止: P / Esc',touchHelp:'方向ボタンを長押しして移動。敵の近くで波動を使いましょう。庭の中では回復し、基本波動の威力が2倍になります。',enter:'浮いている種を5個探しましょう。敵が琥珀色になると突進の合図です！',charged:'庭の力で波動が強くなった！',gardenEvent:'庭が育ちました。緑の輪の中で回復し、強い波動を使えます。',seedEvent:'光の種を入手。',hurt:'敵が琥珀色になったら横へ。ダッシュ中は短時間無敵です。',locked:'種5個と全ての敵の撃破が必要です。',paused:'森は待っています。',pausedText:'探検は一時停止中です。',upgrade:'灯台に花が咲く。',upgradeText:'この探検の能力を1つ選択。次の島では全回復します。',root:'深い根',rootDesc:'最大生命力 +2',pulseUpgrade:'輝く波動',pulseDesc:'波動のダメージ +1',wind:'風の歩み',windDesc:'ダッシュ待ち時間 2.3 → 1.4秒',won:'森が目覚めました。',wonText:'3つの灯台が再び輝き、結晶の守り手は根に戻りました。次は違う能力の組み合わせを試しましょう。',lost:'根の下でひと休み。',lostText:'探検は終了。琥珀色の警告を見て避け、庭で回復しながら戦いましょう。通常の探検の保存地点は残っています。',retry:'再挑戦',share:'結果を共有',back:'キャンプへ',time:'時間',restored:'灯台',build:'選んだ能力',none:'まだありません',saved:'端末に保存 · 登録不要',webgl:'WebGLを開始できません。最新のブラウザとハードウェアアクセラレーションを確認してください。下の他のパズルも遊べます。',wins:'森の復元回数',modeDaily:'今日の探検',modeStory:'探検',guideTitle:'Mosslight Wardensの遊び方',faqTitle:'旅の質問',faq1q:'庭の効果は？',faq1a:'庭は14秒間持続。緑の輪の中で生命力が回復し波動ダメージが1増えます。各島で2回分から開始し18秒ごとに1回分、最大3回分まで回復。灯台用の種は消費しません。',faq2q:'保存と毎日の探検は？',faq2a:'通常は島の入口と選択した能力を端末に保存。続きはその島を全回復で開始します。毎日の探検はUTCの日付のシードで最初の島から何度でも遊べます。オンラインの検証済み順位表ではありません。',faq3q:'有料能力や外部素材は？',faq3a:'全て無料です。地形・モデル・効果・コードはPuzzleVault向けに制作。幾何学形状と合成音を使い、他のゲームの絵・キャラクター・音楽は使用していません。',guide:'灯りの守り手として空に浮かぶ3つの森の島を巡ります。各島で金色の種を5個拾い、結晶の敵を全て倒し、中央の灯台のそばで復元を押しましょう。残りの目標は画面上部で確認できます。\nWASD・矢印・方向パッドで移動。波動は周囲の敵を同時に攻撃します。敵は琥珀色に光ってから一定方向に突進するので、横に避けて休んでいる間に攻撃しましょう。最後の島には大きな守り手がいます。\n庭を植え、緑の輪の中で回復しながら強い波動を出しましょう。庭の回数は時間で回復し、灯台に必要な種は消費しません。\n最初の2つの灯台で生命力・波動・ダッシュの強化を選べます。次の島で生命力は全回復。通常の探検は島の入口を保存し、今日の探検はUTCの日付ごとに同じシードで始まります。タブを隠すと自動停止。森を復元し、能力の組み合わせを試して結果を共有しましょう。'},
        zh:{subtitle:'小小守护者，让森林重新发光。',eyebrow:'原创3D动作角色扮演',intro:'每座岛收集5颗光种，恢复灯塔。躲开水晶生物，种下治疗花园，在三座森林岛屿中选择自己的升级。',start:'开始探险',daily:'每日探险',resume:'从存档岛屿继续',dailyNote:'每日探险使用当天UTC日期的相同种子，可重复挑战。记录仅保存在此设备。',checkpoint:'普通探险在每座岛的入口保存。',zone:'岛屿',glade:'苏醒林地',terrace:'雨石阶地',heart:'空心森林',health:'生命',seeds:'光种',foes:'水晶生物',score:'得分',best:'个人最佳',objective:'收集5颗光种 → 击败所有生物 → 恢复中央灯塔',readyBeacon:'灯塔已准备好！靠近中央石柱并点击恢复。',pulse:'脉冲',dash:'冲刺',garden:'花园',restore:'恢复',pause:'暂停',resumePlay:'继续',restart:'新探险',sound:'声音',on:'开',off:'关',help:'操作与目标',controls:'移动：WASD / 方向键 · 脉冲：Space / J · 冲刺：Shift / K · 花园：Q / L · 恢复：E · 暂停：P / Esc',touchHelp:'长按方向键移动，在敌人附近点击脉冲。花园内可回血并使基础脉冲伤害翻倍。',enter:'寻找5颗漂浮光种。敌人变成琥珀色就是冲刺预警！',charged:'花园脉冲！根系让攻击更强。',gardenEvent:'花园已种下：在绿色圆环内回血并增强脉冲。',seedEvent:'收集到光种。',hurt:'敌人变琥珀色时向侧面躲避。冲刺时短暂无敌。',locked:'请先收集5颗光种并击败所有生物。',paused:'森林会等你。',pausedText:'探险已暂停，准备好后继续。',upgrade:'灯塔开花了。',upgradeText:'为本次探险选择一项升级。下座岛会恢复全部生命。',root:'深根',rootDesc:'最大生命 +2',pulseUpgrade:'明亮脉冲',pulseDesc:'所有脉冲伤害 +1',wind:'踏风',windDesc:'冲刺冷却 2.3 → 1.4秒',won:'森林苏醒了。',wonText:'三座灯塔重新点亮，水晶守护者回归根系。下次试试其他能力组合。',lost:'在树根下休息吧。',lostText:'探险结束。观察琥珀色预警，在花园里回血并增强攻击。普通探险的岛屿存档仍然保留。',retry:'再试一次',share:'分享探险结果',back:'返回营地',time:'时间',restored:'灯塔',build:'能力组合',none:'尚未选择',saved:'本地保存 · 无需账号',webgl:'此浏览器无法启动WebGL。请使用新版浏览器并检查硬件加速。下方的其他游戏仍可游玩。',wins:'森林恢复次数',modeDaily:'每日',modeStory:'探险',guideTitle:'Mosslight Wardens玩法',faqTitle:'探险问答',faq1q:'花园有什么作用？',faq1a:'花园持续14秒。站在绿色圆环内会回血并增加1点脉冲伤害。每岛以2次开始，每18秒回复1次，最多3次。花园不会消耗恢复灯塔所需的光种。',faq2q:'如何存档和进行每日探险？',faq2a:'普通模式将岛屿入口和升级保存在此设备，继续时以满生命重玩该岛。每日模式使用UTC日期的种子，总是从第一岛开始，可重复挑战。记录不是服务器验证的排行榜。',faq3q:'有付费升级或外部游戏素材吗？',faq3a:'所有岛屿与升级均免费。模型、地图、特效和代码为PuzzleVault原创制作，使用几何图形与合成音效，不使用其他游戏的图片、角色或音乐。',guide:'你是穿越三座漂浮森林岛的灯火守护者。每岛有5颗光种、中央灯塔和水晶生物。走过金色种子即可收集，清除全部敌人后，靠近灯塔点击恢复。顶部计数会显示剩余目标。\n使用WASD、方向键或方向面板移动。脉冲会攻击周围圆环中的所有敌人，无需瞄准。生物会先变成琥珀色，再沿固定方向冲刺。预警时侧移或冲刺躲避，趁它休息时攻击。最后一岛有更强的大守护者。\n种下花园并站在绿色圆环内，可以回血并增强脉冲。次数会随时间恢复，不消耗灯塔光种。\n前两座灯塔让你选择生命、攻击或冲刺升级，下一岛生命回满。普通探险保存岛屿入口，每日探险从当天UTC日期的相同种子重新开始。隐藏标签页会自动暂停。恢复森林、尝试不同组合，并与朋友分享结果。'},
        es:{subtitle:'Un pequeño guardián. Un bosque que merece volver.',eyebrow:'RPG DE ACCIÓN 3D ORIGINAL',intro:'Recoge cinco semillas de luz por isla y restaura los faros. Esquiva criaturas de cristal, planta jardines y elige mejoras durante tres islas.',start:'Iniciar expedición',daily:'Expedición diaria',resume:'Continuar partida',dailyNote:'Diaria: la misma semilla para la fecha UTC. Puedes repetir; las marcas quedan en este dispositivo.',checkpoint:'La expedición guarda al entrar en cada isla.',zone:'Isla',glade:'El claro despierto',terrace:'Terraza de lluvia',heart:'El corazón hueco',health:'Vitalidad',seeds:'Semillas',foes:'Criaturas',score:'Puntos',best:'Récord personal',objective:'Recoge 5 semillas · vence a las criaturas · restaura el faro',readyBeacon:'¡Faro listo! Acércate al pilar central y pulsa Restaurar.',pulse:'Pulso',dash:'Impulso',garden:'Jardín',restore:'Restaurar',pause:'Pausa',resumePlay:'Continuar',restart:'Nueva expedición',sound:'Sonido',on:'Sí',off:'No',help:'Controles y objetivo',controls:'Mover: WASD / flechas · Pulso: Espacio / J · Impulso: Mayús / K · Jardín: Q / L · Restaurar: E · Pausa: P / Esc',touchHelp:'Mantén una dirección para moverte. Pulsa cerca de una criatura. El jardín cura y duplica el daño base del pulso mientras estés dentro.',enter:'Busca las cinco semillas flotantes. ¡El color ámbar avisa de una embestida!',charged:'¡Pulso del jardín! Las raíces dan más fuerza.',gardenEvent:'Jardín plantado: entra en el círculo verde para curarte y potenciar el pulso.',seedEvent:'Semilla recogida.',hurt:'Muévete de lado cuando una criatura se vuelva ámbar. El impulso te protege brevemente.',locked:'Recoge las 5 semillas y vence a todas las criaturas primero.',paused:'El bosque puede esperar.',pausedText:'La expedición está en pausa.',upgrade:'Un faro florece.',upgradeText:'Elige una mejora para esta expedición. Recuperas toda la vitalidad en la siguiente isla.',root:'Raíces profundas',rootDesc:'+2 de vitalidad máxima',pulseUpgrade:'Pulso brillante',pulseDesc:'+1 de daño por pulso',wind:'Paso de viento',windDesc:'Espera del impulso: 2,3 → 1,4 s',won:'El bosque despierta.',wonText:'Los tres faros vuelven a brillar. El guardián de cristal regresa a las raíces. Prueba otra combinación en tu próxima expedición.',lost:'Descansa entre las raíces.',lostText:'La expedición terminó. Esquiva al ver el ámbar y usa jardines para curarte y atacar. El punto guardado de Expedición sigue disponible.',retry:'Reintentar',share:'Compartir expedición',back:'Volver al campamento',time:'Tiempo',restored:'Faros',build:'Tus mejoras',none:'Sin mejoras todavía',saved:'Guardado local · sin cuenta',webgl:'No se pudo iniciar WebGL. Prueba un navegador actual con aceleración por hardware. Los otros juegos siguen disponibles debajo.',wins:'Bosques restaurados',modeDaily:'Diaria',modeStory:'Expedición',guideTitle:'Cómo jugar a Mosslight Wardens',faqTitle:'Preguntas del camino',faq1q:'¿Para qué sirve el jardín?',faq1a:'Dura 14 segundos. Dentro del círculo verde recuperas vitalidad y haces 1 daño adicional por pulso. Empiezas cada isla con dos cargas; recuperas una cada 18 segundos, hasta tres. Las semillas del faro no se gastan.',faq2q:'¿Cómo se guarda y funciona la diaria?',faq2a:'Expedición guarda la entrada de la isla y las mejoras en este dispositivo. Continúas esa isla con vitalidad completa. La diaria usa la fecha UTC, empieza en la primera isla y permite repetir. Las marcas no forman una clasificación verificada.',faq3q:'¿Hay mejoras de pago o material de otros juegos?',faq3a:'Todas las islas y mejoras son gratuitas. Los mapas, modelos, efectos y código se crearon para PuzzleVault con formas geométricas y sonido sintetizado. No se utilizan personajes, imágenes ni música descargados de otros juegos.',guide:'Eres un guardián de linternas que cruza tres islas flotantes del bosque. Cada isla contiene cinco semillas de luz, un faro central y criaturas de cristal. Camina sobre las semillas doradas para recogerlas. Derrota a todas las criaturas y pulsa Restaurar cerca del faro. Los contadores indican lo que falta.\nMuévete con WASD, flechas o el panel de dirección. El pulso golpea a todas las criaturas cercanas sin apuntar. Las criaturas se vuelven ámbar antes de embestir en una dirección fija. Apártate de lado o usa el impulso; ataca mientras descansan. La última isla tiene un guardián mayor y más resistente.\nPlanta un jardín y permanece en su círculo verde para curarte y reforzar el pulso. Las cargas vuelven con el tiempo y no consumen semillas del faro.\nLos dos primeros faros permiten mejorar vitalidad, daño o impulso. Cada elección dura toda la expedición; la siguiente isla empieza con vitalidad completa. Expedición guarda la entrada de la isla; Diaria empieza de nuevo con la semilla de la fecha UTC. Al ocultar la pestaña, el juego se pausa. Restaura el bosque, prueba combinaciones y comparte tu resultado.'}
    };
    for(const [code,labels] of Object.entries({en:['Dated expedition','Today’s daily expedition'],ko:['날짜 지정 탐험','오늘의 탐험'],ja:['日付指定の探検','今日の探検'],zh:['指定日期探险','今日探险'],es:['Expedición por fecha','Expedición de hoy']})){TEXT[code].sharedDaily=labels[0];TEXT[code].todayDaily=labels[1];}
    for(const [code,note] of Object.entries({en:' A dated shared link reopens that UTC day’s course, even on a later day.',ko:' 날짜가 포함된 공유 링크는 나중에 열어도 해당 UTC 날짜의 탐험을 재현합니다.',ja:' 日付付きの共有リンクでは、後日でもそのUTC日付の探検を再現します。',zh:' 带日期的分享链接，即使以后打开，也会重现该UTC日期的路线。',es:' Un enlace compartido con fecha reproduce la ruta de ese día UTC, incluso más adelante.'}))TEXT[code].faq2a+=note;
    let state=null,renderer=null,last=0,frame=0,seenEvent=0,seenPhase='',overlayKind='start',soundEnabled=true,camera=[0,15,18],lastHud=0,adPending=false,contextLost=false;
    const keys=new Set(),held=new Set(),$=id=>document.getElementById(id),lang=()=>typeof I18n!=='undefined'&&TEXT[I18n.currentLang]?I18n.currentLang:'en',t=key=>TEXT[lang()][key]||TEXT.en[key]||key;
    const storage={get(k,fallback=null){try{const v=localStorage.getItem('pv_mosslight_'+k);return v===null?fallback:JSON.parse(v);}catch(_){return fallback;}},set(k,v){try{localStorage.setItem('pv_mosslight_'+k,JSON.stringify(v));}catch(_){}},remove(k){try{localStorage.removeItem('pv_mosslight_'+k);}catch(_){}}};
    const clock=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
    const sfx=name=>{if(soundEnabled&&typeof SFX!=='undefined')try{SFX.play(name);}catch(_){};};
    const makeId=()=>root.crypto&&typeof root.crypto.randomUUID==='function'?root.crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    function saved(){return validCheckpoint(storage.get('checkpoint'));}
    function start(mode='story',resume=false,courseDate=null){
        if(!renderer||adPending||contextLost)return;
        const date=mode==='daily'&&validDailyDate(courseDate)?courseDate:new Date().toISOString().slice(0,10),cp=resume&&mode==='story'?saved():null;
        const seed=mode==='daily'?dailySeedForDate(date):(Date.now()>>>0)||1;
        state=makeRun(cp?{...cp,roundId:makeId()}:{seed,mode,date,roundId:makeId()});
        seenEvent=0;seenPhase='';clearInput();camera=[0,15,18];hideOverlay();$('ml-canvas').focus({preventScroll:true});saveCheckpoint();updateHUD(true);sfx('tap');if(matchMedia('(max-width:600px)').matches)requestAnimationFrame(()=>document.querySelector('.ml-game').scrollIntoView({behavior:'auto',block:'start'}));
    }
    function saveCheckpoint(){if(state&&state.mode==='story'&&state.phase==='playing')storage.set('checkpoint',checkpoint(state));}
    function clearInput(){keys.clear();held.clear();document.querySelectorAll('[data-dir]').forEach(b=>b.classList.remove('pressed'));}
    function pause(){if(!state||!['playing','paused'].includes(state.phase)||(state.phase==='paused'&&contextLost))return;clearInput();state.phase=state.phase==='playing'?'paused':'playing';if(state.phase==='paused')showOverlay('pause');else hideOverlay();updateHUD(true);}
    function hideOverlay(){$('ml-overlay').hidden=true;overlayKind='';}
    function showOverlay(kind){overlayKind=kind;clearInput();$('ml-overlay').hidden=false;renderOverlay();}
    function button(label,fn,className=''){const b=document.createElement('button');b.type='button';b.textContent=label;b.className='ml-button '+className;b.addEventListener('click',fn);return b;}
    function renderOverlay(){
        const box=$('ml-overlay-content');box.replaceChildren();
        const title=document.createElement('h2'),p=document.createElement('p'),actions=document.createElement('div');actions.className='ml-overlay-actions';
        if(overlayKind==='start'){
            title.textContent='Mosslight Wardens';p.textContent=t('intro');const requested=dailyRequest(root.location.search);
            if(requested.daily){actions.append(button(`${t('sharedDaily')} · ${requested.date} UTC`,()=>start('daily',false,requested.date),'ml-primary'),button(t('start'),()=>start('story')));}
            else actions.append(button(t('start'),()=>start('story'),'ml-primary'));
            actions.append(button(t('todayDaily'),()=>start('daily')));if(saved())actions.append(button(t('resume'),()=>start('story',true)));
            const note=document.createElement('small');note.textContent=t('dailyNote')+' '+t('checkpoint');actions.append(note);
        }else if(overlayKind==='pause'){
            title.textContent=t('paused');p.textContent=t('pausedText');actions.append(button(t('resumePlay'),pause,'ml-primary'),button(t('back'),()=>{state=null;showOverlay('start');updateHUD(true);}));
        }else if(overlayKind==='upgrade'){
            title.textContent=t('upgrade');p.textContent=t('upgradeText');
            for(const [id,label,desc] of [['root','root','rootDesc'],['pulse','pulseUpgrade','pulseDesc'],['wind','wind','windDesc']]){
                const b=button('',()=>{if(!chooseUpgrade(state,id))return;saveCheckpoint();hideOverlay();updateHUD(true);sfx('clear');});const strong=document.createElement('strong'),small=document.createElement('span');strong.textContent=t(label);small.textContent=t(desc);b.append(strong,small);if(id==='wind'&&state.upgrades.includes('wind')){b.disabled=true;strong.textContent+=' ✓';}actions.append(b);
            }
        }else{
            const won=state&&state.phase==='won';title.textContent=t(won?'won':'lost');p.textContent=t(won?'wonText':'lostText');
            const stat=document.createElement('p');stat.className='ml-result-stats';stat.textContent=`${t('score')} ${state.score} · ${t('restored')} ${state.restored}/3 · ${t('time')} ${clock(state.elapsed)}`;actions.append(stat);
            actions.append(button(t('retry'),()=>start(state.mode,state.mode==='story'&&!won,state.date),'ml-primary'),button(t('share'),share),button(t('back'),()=>{state=null;showOverlay('start');updateHUD(true);}));
            const related=document.createElement('nav');related.className='ml-result-links';related.setAttribute('aria-label','More games');for(const [id,name] of [['cloudweft','Cloudweft Passage'],['colorflow','ColorFlow'],['numvault','NumVault']]){const a=document.createElement('a');a.href='/games/'+id+'.html';a.textContent=name;related.append(a);}actions.append(related);
        }
        box.append(title,p,actions);$('ml-overlay').setAttribute('aria-busy',String(adPending));if(!renderer||adPending||contextLost)actions.querySelectorAll('button').forEach(b=>b.disabled=true);
    }
    async function share(){if(!state||!['won','lost'].includes(state.phase))return;const url=resultURL(state.mode,state.date,lang(),location.href);const text=`🌿 Mosslight Wardens · ${t(state.mode==='daily'?'sharedDaily':'modeStory')}${state.mode==='daily'?' '+state.date+' UTC':''}\n${t('restored')} ${state.restored}/3 · ${t('score')} ${state.score} · ${clock(state.elapsed)}\n${state.upgrades.map(x=>t(x==='pulse'?'pulseUpgrade':x)).join(' + ')}\n${url}`;if(typeof shareResult==='function')await shareResult(text);}
    function translate(){document.querySelectorAll('[data-ml]').forEach(el=>el.textContent=t(el.dataset.ml));const guide=$('ml-guide-text');guide.replaceChildren();for(const text of t('guide').split('\n')){const p=document.createElement('p');p.textContent=text;guide.append(p);}for(const [id,label] of [['north','↑'],['west','←'],['south','↓'],['east','→']])$(`ml-${id}`).setAttribute('aria-label',({en:{north:'Move up',west:'Move left',south:'Move down',east:'Move right'},ko:{north:'위로 이동',west:'왼쪽 이동',south:'아래로 이동',east:'오른쪽 이동'},ja:{north:'上へ移動',west:'左へ移動',south:'下へ移動',east:'右へ移動'},zh:{north:'向上移动',west:'向左移动',south:'向下移动',east:'向右移动'},es:{north:'Mover arriba',west:'Mover izquierda',south:'Mover abajo',east:'Mover derecha'}})[lang()][id]);if(overlayKind)renderOverlay();updateHUD(true);}
    function updateHUD(force=false){
        const now=performance.now();if(!force&&now-lastHud<100)return;lastHud=now;
        $('ml-sound').textContent=`${t('sound')}: ${t(soundEnabled?'on':'off')}`;
        $('ml-best').textContent=`${t('best')}: ${Number(storage.get('best',0))||0} · ${t('wins')}: ${Number(storage.get('wins',0))||0}`;
        if(!state){$('ml-zone').textContent=`${t('zone')} 1 / 3 · ${t('glade')}`;$('ml-objective').textContent=t('objective');$('ml-vitality').textContent='6 / 6';$('ml-healthbar').style.width='100%';$('ml-seeds').textContent='0 / 5';$('ml-foes').textContent='5';$('ml-score').textContent='0';$('ml-build').textContent=t('none');}
        else{
            $('ml-zone').textContent=`${t('zone')} ${state.zone+1} / 3 · ${t(ZONES[state.zone].name)}${state.mode==='daily'?' · '+state.date+' UTC':''}`;
            const left=state.enemies.filter(e=>e.alive).length;$('ml-objective').textContent=t(left===0&&state.collected===5?'readyBeacon':'objective');$('ml-vitality').textContent=`${Math.ceil(state.player.hp*10)/10} / ${state.maxHP}`;$('ml-healthbar').style.width=(state.player.hp/state.maxHP*100)+'%';$('ml-seeds').textContent=state.collected+' / 5';$('ml-foes').textContent=left;$('ml-score').textContent=state.score;$('ml-build').textContent=state.upgrades.length?state.upgrades.map(x=>t(x==='pulse'?'pulseUpgrade':x)).join(' + '):t('none');
        }
        const play=state&&state.phase==='playing';for(const id of ['pulse','dash','garden','restore'])$('ml-'+id).disabled=!play||(id==='pulse'&&state.attackCD>0)||(id==='dash'&&state.dashCD>0)||(id==='garden'&&(state.gardenCharges===0||state.gardenCD>0))||(id==='restore'&&distance(state.player,state.beacon)>2.2);
        $('ml-pulse-cd').textContent=state&&state.attackCD>0?state.attackCD.toFixed(1)+'s':'Space / J';$('ml-dash-cd').textContent=state&&state.dashCD>0?state.dashCD.toFixed(1)+'s':'Shift / K';$('ml-garden-cd').textContent=state?`${state.gardenCharges}/3 · Q / L`:'2/3 · Q / L';$('ml-pause').disabled=!state||!['playing','paused'].includes(state.phase);$('ml-pause').textContent=t(state&&state.phase==='paused'?'resumePlay':'pause');
    }
    function finish(){if(!markRecorded(state))return;storage.set('best',Math.max(Number(storage.get('best',0))||0,state.score));if(state.phase==='won'){storage.set('wins',Math.max(0,Number(storage.get('wins',0))||0)+1);if(state.mode==='story')storage.remove('checkpoint');}if(state.mode==='daily')storage.set('daily_'+state.date,{score:state.score,won:state.phase==='won',seconds:Math.floor(state.elapsed)});if(typeof updateStats==='function')updateStats('mosslight',state.score,{roundId:state.roundId});sfx(state.phase==='won'?'win':'gameover');showOverlay('result');if(typeof AdController!=='undefined'){adPending=true;renderOverlay();Promise.resolve().then(()=>AdController.showInterstitial()).catch(()=>{}).finally(()=>{adPending=false;if(overlayKind==='result')renderOverlay();});}}
    function action(name){if(!state)return;const fn={pulse:attack,dash,garden:plant,restore:interact}[name];if(fn)fn(state);updateHUD(true);}
    const obj=(shape,x,y,z,sx,sy,sz,color,ry=0,opacity=1)=>({shape,x,y,z,sx,sy,sz,color,ry,opacity});
    function ring(objects,x,z,r,color,y=.12){for(let i=0;i<28;i++){const a=i*Math.PI*2/28;objects.push(obj('box',x+Math.sin(a)*r,y,z+Math.cos(a)*r,.17,.035,.38,color,a));}}
    function scene(s,time){
        const spec=ZONES[s.zone],objects=[];objects.push(obj('box',0,-.65,0,19,1.2,19,spec.ground));objects.push(obj('box',0,-1.7,0,17,1,17,'#1e293b'));objects.push(obj('box',0,-2.6,0,12,1,12,'#0f172a'));
        // Hand-placed stepping stones, roots and carved trail markers make the map legible.
        for(let i=0;i<9;i++)objects.push(obj('box',Math.sin(i*1.7)*.35,.02,7-i*1.7,.85,.07,.8,'#64748b',i*.23));
        for(const [x,z,r] of spec.obstacles){objects.push(obj('cylinder',x,.75,z,r*.68,1.5,r*.68,'#735b43'));objects.push(obj('cone',x,2.1,z,r*2.25,2.4,r*2.25,s.zone===1?'#059669':'#65a30d'));objects.push(obj('cone',x,3,z,r*1.65,1.8,r*1.65,'#86efac'));}
        for(let i=0;i<24;i++){const a=i*Math.PI/12,x=Math.sin(a)*9.05,z=Math.cos(a)*9.05;objects.push(obj('octa',x,.2,z,.5,.55,.5,i%3===0?spec.accent:'#475569',a));}
        for(const [x,z] of [[-7,7],[7,7],[-7,-7],[7,-7],[-8,2],[8,1]]){objects.push(obj('box',x,.15,z,.55,.3,.6,'#475569'));for(let i=0;i<3;i++)objects.push(obj('cone',x+(i-1)*.22,.52,z,.15,.55,.15,spec.accent));}
        const b=s.beacon;objects.push(obj('cylinder',b.x,.16,b.z,2,.3,2,'#64748b'));objects.push(obj('cylinder',b.x,.65,b.z,.8,1.2,.8,'#d97706'));objects.push(obj('octa',b.x,1.62,b.z,.8,1,.8,b.restored?'#fef3c7':spec.accent,time*.35));ring(objects,b.x,b.z,1.45,b.restored?'#fde68a':'#94a3b8');
        for(const seed of s.seeds)if(!seed.taken){objects.push(obj('octa',seed.x,.8+Math.sin(time*2+seed.id)*.13,seed.z,.42,.65,.42,'#fde68a',time));objects.push(obj('cylinder',seed.x,.045,seed.z,.55,.04,.55,'#d97706'));}
        for(const g of s.gardens){ring(objects,g.x,g.z,g.radius,g.life>3?'#86efac':'#fde68a');for(let i=0;i<8;i++){const a=i*Math.PI/4;objects.push(obj('cone',g.x+Math.cos(a)*1.65,.22,g.z+Math.sin(a)*1.65,.35,.45,.35,'#65a30d'));}}
        for(const e of s.enemies){if(!e.alive)continue;const scale=e.boss?1.5:1,col=e.flash>0?'#ffffff':e.phase==='warn'?'#f59e0b':e.phase==='rest'?'#94a3b8':s.zone===1?'#0891b2':'#7c3aed';objects.push(obj('octa',e.x,.55*scale,e.z,.85*scale,1.05*scale,.85*scale,col,time*.25+e.id));objects.push(obj('cone',e.x-.36*scale,.93*scale,e.z,.24*scale,.55*scale,.24*scale,spec.accent));objects.push(obj('cone',e.x+.36*scale,.93*scale,e.z,.24*scale,.55*scale,.24*scale,spec.accent));objects.push(obj('box',e.x,1.6*scale,e.z,1.15*scale,.075,.12,'#1e293b'));objects.push(obj('box',e.x-(1-e.hp/e.maxHP)*.575*scale,1.605*scale,e.z,1.15*scale*e.hp/e.maxHP,.08,.14,'#fca5a5'));
            if(e.phase==='warn'){ring(objects,e.x,e.z,e.boss?1.6:1,'#f59e0b');for(let i=1;i<5;i++)objects.push(obj('box',e.x+e.aimX*i*.55,.09,e.z+e.aimZ*i*.55,.25,.08,.35,'#fde68a',Math.atan2(e.aimX,e.aimZ)));}
        }
        const p=s.player,angle=Math.atan2(p.facingX,p.facingZ);objects.push(obj('cylinder',p.x,.045,p.z,.9,.04,.9,'#102f2a'));const blink=p.invuln>0&&Math.floor(time*16)%2===0;objects.push(obj('cone',p.x,.49,p.z,.76,.95,.76,blink?'#fef3c7':'#059669',angle));objects.push(obj('octa',p.x,1.04,p.z,.6,.66,.6,'#fde68a'));objects.push(obj('cone',p.x,1.38,p.z,.75,.5,.75,'#65a30d'));objects.push(obj('box',p.x+p.facingX*.36,1.08,p.z+p.facingZ*.36,.27,.1,.2,'#1e293b',angle));objects.push(obj('octa',p.x+.5,.6,p.z,.25,.38,.25,'#fef3c7',time));
        if(s.pulse>0)ring(objects,p.x,p.z,s.pulseRange*(1-s.pulse/.24),'#fef3c7',.25);
        return objects;
    }
    const preview=makeRun({seed:812});
    function loop(now){frame=requestAnimationFrame(loop);const dt=last?Math.min((now-last)/1000,.05):0;last=now;
        if(state&&state.phase==='playing'){
            const west=keys.has('a')||keys.has('arrowleft')||held.has('west'),east=keys.has('d')||keys.has('arrowright')||held.has('east'),north=keys.has('w')||keys.has('arrowup')||held.has('north'),south=keys.has('s')||keys.has('arrowdown')||held.has('south');
            tick(state,{x:Number(east)-Number(west),z:Number(south)-Number(north)},dt);
            if(keys.has(' ')||keys.has('j')||held.has('pulse'))attack(state);
            if(state.eventId!==seenEvent){seenEvent=state.eventId;const eventKey={seed:'seedEvent',garden:'gardenEvent',charged:'charged',hurt:'hurt',enter:'enter',locked:'locked'}[state.event];if(eventKey)$('ml-status').textContent=t(eventKey);if(state.event==='seed')sfx('correct');else if(state.event==='hurt')sfx('wrong');else if(state.event==='pulse'||state.event==='charged')sfx('tap');else if(state.event==='garden')sfx('hint');}
        }
        if(state&&state.phase!==seenPhase){seenPhase=state.phase;if(state.phase==='upgrade'){sfx('clear');showOverlay('upgrade');}else if(['won','lost'].includes(state.phase))finish();}
        if(renderer&&!contextLost){const active=state||preview,p=active.player;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,smoothing=reduced?1:Math.min(1,dt*5);const target=[p.x*.42,0,p.z*.42];camera[0]+=(target[0]-camera[0])*smoothing;camera[1]=17;camera[2]+=(target[2]+17-camera[2])*smoothing;renderer.render(scene(active,reduced?0:now/1000),{eye:camera,target:[camera[0],0,camera[2]-17],fov:49});}
        updateHUD();
    }
    function boot(){
        if(!$('ml-canvas'))return;try{renderer=new PV3D.Renderer($('ml-canvas'),{clear:'#102b2c'});}catch(_){$('ml-webgl').hidden=false;}
        $('ml-canvas').addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;clearInput();if(state&&state.phase==='playing')pause();else if(overlayKind)renderOverlay();});$('ml-canvas').addEventListener('webglcontextrestored',()=>{contextLost=false;last=0;if(overlayKind)renderOverlay();});
        try{soundEnabled=localStorage.getItem('pv_sound')!=='off';}catch(_){};
        $('ml-pause').addEventListener('click',pause);$('ml-sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;try{localStorage.setItem('pv_sound',soundEnabled?'on':'off');}catch(_){}if(typeof SFX!=='undefined')SFX.enabled=soundEnabled;updateHUD(true);});
        for(const name of ['pulse','dash','garden','restore'])$('ml-'+name).addEventListener('click',()=>action(name));
        for(const b of document.querySelectorAll('[data-dir]')){const dir=b.dataset.dir;b.addEventListener('pointerdown',e=>{if(!state||state.phase!=='playing')return;e.preventDefault();held.add(dir);b.classList.add('pressed');b.setPointerCapture(e.pointerId);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{held.delete(dir);b.classList.remove('pressed');});}
        $('ml-pulse').addEventListener('pointerdown',e=>{if(!state||state.phase!=='playing')return;held.add('pulse');e.currentTarget.setPointerCapture(e.pointerId);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('ml-pulse').addEventListener(ev,()=>held.delete('pulse'));
        document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;const k=e.key.toLowerCase();if(['p','escape'].includes(k)){if(state&&['playing','paused'].includes(state.phase)){e.preventDefault();if(!e.repeat)pause();}return;}if(!state||state.phase!=='playing')return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','j','shift','k','q','l','e'].includes(k)){e.preventDefault();keys.add(k);if(!e.repeat){if(['shift','k'].includes(k))action('dash');if(['q','l'].includes(k))action('garden');if(k==='e')action('restore');}}});
        document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));document.addEventListener('visibilitychange',()=>{clearInput();if(document.hidden&&state&&state.phase==='playing')pause();});root.addEventListener('blur',()=>{clearInput();if(state&&state.phase==='playing')pause();});root.addEventListener('pagehide',()=>{clearInput();if(state&&state.phase==='playing')pause();cancelAnimationFrame(frame);if(renderer&&renderer.dispose)renderer.dispose();});root.addEventListener('pageshow',e=>{if(!e.persisted)return;last=0;contextLost=false;try{renderer=new PV3D.Renderer($('ml-canvas'),{clear:'#102b2c'});}catch(_){renderer=null;$('ml-webgl').hidden=false;}if(overlayKind)renderOverlay();frame=requestAnimationFrame(loop);});
        root.addEventListener('langchange',translate);root.addEventListener('pvReady',translate);translate();showOverlay('start');frame=requestAnimationFrame(loop);
        root.PVMosslight=Object.freeze({getState:()=>state?JSON.parse(JSON.stringify(state)):null,start,pause});
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})(typeof window!=='undefined'?window:globalThis);
