/* Cloudweft Passage — original geometry, course design and game logic for PuzzleVault. */
(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else { root.Cloudweft = api; if (root.document) api.boot(); }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    const SAVE_VERSION = 1;
    const SPEED = 4.8, GRAVITY = 19, JUMP = 7.7;
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

    function createLevel(chapter = 0, seed = 0) {
        chapter = clamp(Math.trunc(chapter) || 0, 0, 2);
        const mirror = seed && seed % 2 ? -1 : 1;
        const courses = [
            [[0, 0], [-6, -14], [5, -28], [-7, -42], [5, -56], [0, -71], [18, -29]],
            [[0, 0], [8, -13], [0, -27], [-10, -40], [1, -55], [9, -69], [13, -31]],
            [[0, 0], [-8, -12], [-1, -27], [10, -39], [2, -55], [-8, -70], [-15, -29]]
        ];
        const raw = courses[chapter];
        const islands = raw.map(([x, z], i) => ({ id: 'i' + i, kind: 'island', x: x * mirror, z,
            y: i === 6 ? 1.2 : i * .55, w: i === 0 ? 7 : 6, d: i === 5 ? 7 : 6, ry: 0 }));
        const bridges = [], links = [];
        function connect(a, b, phase, index) {
            const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
            const ux = dx / len, uz = dz / len, start = 2.65, end = len - 2.65;
            const count = Math.ceil((end - start) / .8), size = (end - start) / count;
            const gap = chapter > 0 && (index === 1 || index === 3 || index === 5) ? Math.floor(count / 2) : -20;
            const gapSize = chapter === 2 ? (index === 5 ? 4 : 3) : (index === 5 ? 3 : 2);
            const link = { a: a.id, b: b.id, phase, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2,
                y: (a.y + b.y) / 2, ry: Math.atan2(dx, dz), len: end - start, gap, gapSize, index };
            links.push(link);
            for (let j = 0; j < count; j++) {
                if (j >= gap && j < gap + gapSize) continue;
                const t = (start + (j + .5) * size) / len;
                bridges.push({ id: 'b' + index + '-' + j, kind: 'bridge', phase, x: a.x + dx * t,
                    z: a.z + dz * t, y: a.y + (b.y - a.y) * t, w: index === 5 ? 1.75 : 2.2,
                    d: size + .06, ry: Math.atan2(ux, uz), link: index });
            }
        }
        for (let i = 0; i < 5; i++) connect(islands[i], islands[i + 1], i % 2, i);
        connect(islands[2], islands[6], 1, 5);
        const glyphs = [1, 3, 4].map((id, i) => ({ id: 'g' + i, kind: 'glyph',
            x: islands[id].x + (i === 1 ? -1 : 1) * mirror, z: islands[id].z, y: islands[id].y + .9, phase: (i + chapter) % 2 }));
        const relics = [2, 6, 6, 5].map((id, i) => ({ id: 'r' + i, kind: 'relic',
            x: islands[id].x + (i % 2 ? -1.6 : 1.6) * mirror,
            z: islands[id].z + (i === 2 ? -1.6 : .8), y: islands[id].y + .65 }));
        const hazards = chapter === 0 ? [] : [links[2], ...(chapter === 2 ? [links[4]] : [])].map((l, i) => ({
            x: l.x, z: l.z, y: l.y + .6, axisX: Math.cos(l.ry), axisZ: -Math.sin(l.ry),
            offset: (seed % 31) / 10 + i, period: 2.7 + i * .8, range: 2.5
        }));
        const motes = links.filter(l => l.gap > 0).map((l, i) => ({ id: 'm' + i, x: l.x, y: l.y + 1.25, z: l.z }));
        return { chapter, seed, islands, bridges, links, glyphs, relics, hazards, motes,
            surfaces: islands.concat(bridges), portal: islands[5] };
    }

    function contains(surface, x, z, inset = 0) {
        const dx = x - surface.x, dz = z - surface.z, c = Math.cos(surface.ry), s = Math.sin(surface.ry);
        return Math.abs(dx * c - dz * s) <= surface.w / 2 - inset &&
            Math.abs(dx * s + dz * c) <= surface.d / 2 - inset;
    }
    function active(surface, phase) { return surface.kind === 'island' || surface.phase === phase; }
    function hazardAt(hazard, elapsed) {
        const offset = Math.sin(elapsed * Math.PI * 2 / hazard.period + hazard.offset) * hazard.range;
        return { x: hazard.x + hazard.axisX * offset, z: hazard.z + hazard.axisZ * offset, y: hazard.y };
    }
    function createState(chapter = 0, seed = 0) {
        return { chapter, seed, x: 0, z: 1.3, y: 0, vy: 0, phase: 0, grounded: true, coyote: .13,
            jumpBuffer: 0, phaseCooldown: 0, invulnerable: 0, checkpoint: 'i0', glyphs: [], relics: [],
            elapsed: 0, falls: 0, won: false, events: [], facing: Math.PI, dashCharge: 1, dashTimer: 0,
            dashX: 0, dashZ: -1, glideEnergy: 1.5, gliding: false, motes: {}, distanceWalked: 0 };
    }
    function rescue(state, level, countFall = true) {
        const cp = level.islands.find(i => i.id === state.checkpoint) || level.islands[0];
        Object.assign(state, { x: cp.x, z: cp.z + 1, y: cp.y, vy: 0, grounded: true,
            coyote: .13, jumpBuffer: 0, invulnerable: 1.8, dashCharge: 1, dashTimer: 0, glideEnergy: 1.5, gliding: false });
        if (countFall) state.falls++;
        state.events.push('rescue');
    }
    function step(state, level, input = {}, dt = 1 / 60) {
        if (state.won) return state;
        dt = clamp(Number(dt) || 0, 0, .04);
        state.events = [];
        state.elapsed += dt;
        state.invulnerable = Math.max(0, state.invulnerable - dt);
        state.phaseCooldown = Math.max(0, state.phaseCooldown - dt);
        if (input.phase && state.phaseCooldown === 0) {
            state.phase = 1 - state.phase; state.phaseCooldown = .35; state.events.push('phase');
        }
        if (input.jump) state.jumpBuffer = .16;
        else state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
        state.coyote = state.grounded ? .13 : Math.max(0, state.coyote - dt);
        if (state.jumpBuffer > 0 && state.coyote > 0) {
            state.vy = JUMP; state.grounded = false; state.coyote = 0; state.jumpBuffer = 0; state.events.push('jump');
        }
        let ix = clamp(Number(input.x) || 0, -1, 1), iz = clamp(Number(input.z) || 0, -1, 1);
        const mag = Math.hypot(ix, iz); if (mag > 1) { ix /= mag; iz /= mag; }
        if (mag > .01) state.facing = Math.atan2(ix, iz);
        if (input.dash && !state.grounded && state.dashCharge > 0) {
            state.dashCharge = 0; state.dashTimer = .23;
            state.dashX = mag > .01 ? ix / Math.hypot(ix, iz) : Math.sin(state.facing);
            state.dashZ = mag > .01 ? iz / Math.hypot(ix, iz) : Math.cos(state.facing);
            state.vy = Math.max(state.vy, 1.1); state.events.push('dash');
        }
        const dashing = state.dashTimer > 0;
        state.dashTimer = Math.max(0, state.dashTimer - dt);
        state.gliding = !state.grounded && !dashing && !!input.glide && state.vy < 0 && state.glideEnergy > 0;
        if (state.gliding) state.glideEnergy = Math.max(0, state.glideEnergy - dt);
        const oldY = state.y;
        const dx = (dashing ? state.dashX * 12.5 : ix * SPEED) * dt;
        const dz = (dashing ? state.dashZ * 12.5 : iz * SPEED) * dt;
        state.x += dx; state.z += dz; state.distanceWalked += Math.hypot(dx, dz);
        // In chapter three, a marked wind gate nudges the courier sideways on its bridge.
        if (level.chapter === 2 && Math.abs(state.z - level.links[3].z) < 1.3 && !state.grounded)
            state.x += Math.sin(state.elapsed * 2) * .45 * dt;
        const surfaces = level.surfaces.filter(p => active(p, state.phase) && contains(p, state.x, state.z));
        const walk = state.grounded && surfaces.filter(p => p.y <= oldY + .22 && p.y >= oldY - .32)
            .sort((a, b) => b.y - a.y)[0];
        if (walk && state.vy <= 0) { state.y = walk.y; state.vy = 0; state.grounded = true; }
        else {
            state.grounded = false; state.vy -= GRAVITY * (dashing ? .22 : 1) * dt;
            if (state.gliding) state.vy = Math.max(state.vy, -1.7);
            state.y += state.vy * dt;
            const landing = state.vy <= 0 && surfaces.filter(p => oldY >= p.y - .12 && state.y <= p.y)
                .sort((a, b) => b.y - a.y)[0];
            if (landing) { state.y = landing.y; state.vy = 0; state.grounded = true; }
        }
        if (state.grounded) {
            state.dashCharge = 1; state.glideEnergy = 1.5; state.gliding = false;
            const island = level.islands.find(i => contains(i, state.x, state.z, .4) && Math.abs(i.y - state.y) < .2);
            if (island && island.id !== state.checkpoint) { state.checkpoint = island.id; state.events.push('checkpoint'); }
        }
        for (const item of level.glyphs.concat(level.relics)) {
            const list = item.kind === 'glyph' ? state.glyphs : state.relics;
            if (!list.includes(item.id) && distance(state, item) < 1.25 && Math.abs(state.y + .7 - item.y) < 1.4 &&
                (item.kind !== 'glyph' || (input.interact && state.grounded && state.phase === item.phase))) {
                list.push(item.id); state.events.push(item.kind);
            }
        }
        for (const mote of level.motes) {
            if ((state.motes[mote.id] === undefined || state.elapsed - state.motes[mote.id] > 8) &&
                distance(state, mote) < 1.05 && Math.abs(state.y + .6 - mote.y) < 1.2) {
                state.motes[mote.id] = state.elapsed; state.dashCharge = 1; state.glideEnergy = 1.5; state.events.push('recharge');
            }
        }
        if (state.invulnerable <= 0 && level.hazards.some(h => {
            const p = hazardAt(h, state.elapsed);
            return distance(state, p) < .68 && Math.abs(state.y + .5 - p.y) < .65;
        })) rescue(state, level);
        if (state.y < -9 || Math.abs(state.x) > 60 || state.z > 30 || state.z < -105) rescue(state, level);
        if (state.glyphs.length === 3 && distance(state, level.portal) < 1.35 &&
            Math.abs(state.y - level.portal.y) < .8) { state.won = true; state.events.push('win'); }
        return state;
    }
    function score(state) { return Math.max(100, Math.round(2200 + state.relics.length * 250 - state.elapsed * 3 - state.falls * 100)); }
    function medal(state) { return state.falls === 0 && state.relics.length === 4 && state.elapsed < 160 ? 'gold' : state.falls <= 3 ? 'silver' : 'bronze'; }
    function seedForDate(date) {
        let hash = 0;
        for (const char of 'cloudweft:' + date) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
        return Math.abs(hash);
    }
    function normalizeProgress(value) {
        const object = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        const best = object.best && typeof object.best === 'object' && !Array.isArray(object.best) ? object.best : {};
        return { unlocked: clamp(Math.trunc(Number(object.unlocked)) || 1, 1, 3),
            best: Object.fromEntries(Object.entries(best).filter(([key, score]) => key.length < 100 && Number.isFinite(score) && score >= 0 && score <= 9600).slice(-200)) };
    }
    function normalizeResults(value, beforeChapter = 3) {
        if (!Array.isArray(value)) return [];
        const result = [];
        for (const r of value.slice(0, 3)) {
            if (!r || typeof r !== 'object' || !Number.isInteger(r.chapter) || r.chapter < 0 || r.chapter >= beforeChapter ||
                result.some(other => other.chapter === r.chapter) || !Number.isFinite(r.score) || r.score < 100 || r.score > 3200 ||
                !Number.isFinite(r.elapsed) || r.elapsed < 0 || r.elapsed > 86400 || !Number.isInteger(r.falls) || r.falls < 0 || r.falls > 10000 ||
                !Number.isInteger(r.relics) || r.relics < 0 || r.relics > 4 || !['gold', 'silver', 'bronze'].includes(r.medal)) continue;
            result.push({ chapter: r.chapter, score: r.score, elapsed: r.elapsed, falls: r.falls, relics: r.relics, medal: r.medal });
        }
        return result.sort((a, b) => a.chapter - b.chapter);
    }
    function serialize(state) {
        return { version: SAVE_VERSION, chapter: state.chapter, seed: state.seed, checkpoint: state.checkpoint,
            phase: state.phase, glyphs: state.glyphs.slice(), relics: state.relics.slice(), elapsed: state.elapsed, falls: state.falls };
    }
    function restore(saved) {
        if (!saved || saved.version !== SAVE_VERSION || !Number.isInteger(saved.chapter) || saved.chapter < 0 || saved.chapter > 2 ||
            !Number.isSafeInteger(saved.seed) || saved.seed < 0 || !Number.isFinite(saved.elapsed) || saved.elapsed < 0 ||
            saved.elapsed > 86400 || !Number.isInteger(saved.falls) || saved.falls < 0 || saved.falls > 10000) return null;
        const level = createLevel(saved.chapter, saved.seed);
        if (!level.islands.some(i => i.id === saved.checkpoint) || ![0, 1].includes(saved.phase)) return null;
        const state = createState(saved.chapter, saved.seed);
        state.glyphs = Array.isArray(saved.glyphs) ? [...new Set(saved.glyphs.filter(id => level.glyphs.some(g => g.id === id)))] : [];
        state.relics = Array.isArray(saved.relics) ? [...new Set(saved.relics.filter(id => level.relics.some(r => r.id === id)))] : [];
        Object.assign(state, { checkpoint: saved.checkpoint, phase: saved.phase, elapsed: saved.elapsed, falls: saved.falls });
        rescue(state, level, false); state.events = [];
        return { state, level };
    }

    function boot() {
        if (typeof document === 'undefined') return;
        const init = () => startBrowser();
        if (window.pvReady) init(); else window.addEventListener('pvReady', init, { once: true });
    }

    /* UI strings are local to this game: changing language never resets an expedition. */
    const COPY = {
        "en": {
            "subtitle": "Fold the sky. Deliver the dawn.",
            "badge": "ORIGINAL 3D ADVENTURE",
            "intro": "A little sky courier. Two overlapping worlds. One broken route home.",
            "description": "Explore three handcrafted sky gardens. Attune sun and moon shrines, dash through broken bridges and glide toward hidden relics.",
            "play": "Begin the journey",
            "daily": "Daily expedition",
            "resume": "Continue saved journey",
            "practice": "Chapter practice",
            "chapter": "Chapter",
            "chapterNames": [
                "The Apricot Dawn",
                "The Azure Gardens",
                "The Violet Observatory"
            ],
            "goal": "Attune 3 island runes, then enter the sky gate.",
            "glyph": "Runes",
            "relic": "Relics",
            "time": "Time",
            "falls": "Rescues",
            "sun": "SUN",
            "moon": "MOON",
            "phase": "Fold sky",
            "jump": "Jump",
            "pause": "Pause",
            "paused": "Journey paused",
            "continue": "Continue",
            "restart": "Restart chapter",
            "menu": "Journey menu",
            "hint": "Route hint",
            "sound": "Sound",
            "lowMotion": "Gentle motion",
            "keys": "Move: WASD / arrows · Jump / hold to glide: Space · Dash: Shift · Fold: E · Attune: F · Pause: Esc",
            "touchHint": "Jump and keep holding to glide. Dash once in the air; land or collect a wind mote to recharge.",
            "foldTip": "SUN bridges have circle marks; MOON bridges have paired strokes. Faded bridges cannot hold you. Fold on a safe island.",
            "checkpoint": "Island checkpoint saved",
            "rescued": "Back at your last island. Your glyphs are safe.",
            "glyphFound": "Island rune attuned. A beam now guides the sky home.",
            "relicFound": "Secret relic recovered",
            "nextIsland": "Follow the solid marked bridge. Attune nearby shrines in their matching world; fold on islands to reveal the next bridge.",
            "gapTip": "The Azure Gardens have broken crossings and sentry lights. Jump, air dash, then hold Jump to glide. Wind motes refill both abilities.",
            "windTip": "The Violet Observatory has wide gaps, crosswinds and a difficult relic branch. Time the sentries and chain a dash through a wind mote.",
            "portalReady": "Three runes are glowing. Follow the remaining bridge to the circular sky gate.",
            "missing": "The sky gate needs three attuned runes. Find the shrines on islands 2, 4 and 5; match the marked world and use Attune.",
            "cleared": "Beacon restored",
            "complete": "The dawn has a way home",
            "next": "Next chapter",
            "again": "Play again",
            "share": "Share this journey",
            "resultText": "The courier has reunited the three beacons. Your sky route is complete.",
            "chapterText": "A new beacon is glowing. The next crossing is waiting.",
            "score": "Score",
            "localBest": "Best on this device",
            "gold": "Dawn keeper",
            "silver": "Sky navigator",
            "bronze": "Brave courier",
            "locked": "Complete the previous chapter to unlock.",
            "saveNotice": "Progress is saved on this device. Clearing browser data removes it.",
            "webgl": "This adventure needs WebGL. Try an up-to-date browser with hardware acceleration, or enjoy the other puzzles below.",
            "loading": "Preparing your sky route…",
            "practiceLabel": "Practice",
            "dailyLabel": "Daily",
            "campaignLabel": "Journey",
            "guideTitle": "How to play Cloudweft Passage",
            "faqTitle": "Questions before your first flight",
            "guide": [
                "Carry dawn through three original sky gardens: Apricot Dawn teaches the overlapping SUN and MOON paths, Azure Gardens introduces broken crossings and sentries, and Violet Observatory combines wide gaps, crosswind and a harder optional relic branch. Each chapter has a different island arrangement and atmosphere. Its exit opens after you attune the shrines on the second, fourth and fifth main islands.",
                "Move with WASD or arrow keys. Tap Space to jump; keep holding it while descending to glide for up to 1.5 seconds. Press Shift in the air for one forward dash. Landing or touching a white wind mote restores the dash and glide energy. A mote returns after eight active seconds. Touch controls offer a direction pad, Jump (hold to glide), Air dash, Fold sky and Attune. The camera follows with up leading deeper into the route.",
                "Press E / Fold sky to change worlds from a safe island. SUN bridges and shrines use circles; MOON uses paired strokes. Faded bridge previews are not solid. Stand close to a shrine, match its world, and press F / Attune to light it; simply walking over it is not enough. Every island saves a checkpoint. Falling keeps attuned runes and relics, returns you to that checkpoint and refills your flight energy. There is no life limit or paid retry.",
                "Four optional mint relics reward exploration in each chapter. Two are on the side island reached from the third main island. A chapter score starts at 2,200, adds 250 per relic, and subtracts three points per active second and 100 per rescue, with a minimum of 100. Gold needs all four relics, no rescues, and a finish under 160 seconds; up to three rescues earns silver otherwise. Daily mode mirrors the safe course on some days and changes sentry timing. Scores are local, and shared results are self-reported."
            ],
            "faq": [
                [
                    "Is this a full 3D game?",
                    "Yes. The islands, bridges and courier are rendered as real 3D meshes with WebGL. It runs locally in your browser without external models or downloads."
                ],
                [
                    "What happens if I fall or close the page?",
                    "A fall returns you to your latest island with collected items intact. Continue saved journey restores the latest saved checkpoint on this device. A new journey replaces that active save."
                ],
                [
                    "Can I play without ads or an account?",
                    "Yes. No account, payment or ad viewing is required to complete any chapter. The daily route can be replayed. Sharing sends a result and link; there is no online leaderboard."
                ]
            ],
            "dash": "Air dash",
            "attune": "Attune",
            "flight": "Flight energy",
            "ready": "Ready",
            "spent": "Land / recharge",
            "moveTip": "First steps: follow the stone path. Move with WASD / arrows and tap Space to jump. Your first rune waits across the SUN bridge.",
            "runeTip": "Stand beside the rune. Match its SUN (circle) or MOON (two strokes) mark with Fold, then press Attune / F.",
            "dashTip": "Flight unlocked from the start: jump, then Shift / Air dash to burst forward. One charge refills on landing or at a glowing wind mote.",
            "glideTip": "Hold Jump / Space while falling to open your glider. Flight energy lasts 1.5 seconds. White wind motes refill it in midair.",
            "recharge": "Wind mote collected — dash and glider recharged."
        },
        "ko": {
            "subtitle": "구름결 여정",
            "badge": "오리지널 3D 어드벤처",
            "intro": "작은 하늘 배달부, 겹쳐진 두 세계, 집으로 이어지는 마지막 길.",
            "description": "세 개의 하늘 정원을 탐험하세요. 해와 달의 룬을 밝히고, 끊어진 다리를 공중 돌진으로 건너며 숨겨진 유물까지 활공하세요.",
            "play": "여정 시작",
            "daily": "오늘의 탐험",
            "resume": "저장한 여정 계속",
            "practice": "챕터 연습",
            "chapter": "챕터",
            "chapterNames": [
                "살구빛 새벽",
                "푸른 하늘 정원",
                "보랏빛 관측소"
            ],
            "goal": "섬의 룬 3개를 밝히고 하늘 관문으로 가세요.",
            "glyph": "룬",
            "relic": "유물",
            "time": "시간",
            "falls": "구조",
            "sun": "해",
            "moon": "달",
            "phase": "하늘 접기",
            "jump": "점프",
            "pause": "일시정지",
            "paused": "잠시 쉬어가세요",
            "continue": "계속하기",
            "restart": "챕터 다시 시작",
            "menu": "여정 메뉴",
            "hint": "길 찾기 힌트",
            "sound": "소리",
            "lowMotion": "움직임 줄이기",
            "keys": "이동: WASD / 방향키 · 점프 / 길게 눌러 활공: Space · 돌진: Shift · 전환: E · 룬 밝히기: F · 정지: Esc",
            "touchHint": "점프를 누른 채 내려오면 활공해요. 공중 돌진은 한 번 사용하며, 착지하거나 바람 구슬을 모으면 충전돼요.",
            "foldTip": "해의 다리는 동그라미, 달의 다리는 두 줄로 표시돼요. 흐릿한 다리는 걸을 수 없어요. 전환은 안전한 섬에서 하세요.",
            "checkpoint": "섬 체크포인트 저장",
            "rescued": "마지막 섬으로 돌아왔어요. 모은 문양은 그대로예요.",
            "glyphFound": "섬의 룬을 밝혔어요. 빛줄기가 하늘의 길을 이어요.",
            "relicFound": "숨겨진 유물을 찾았어요",
            "nextIsland": "표시가 선명한 다리를 따라가세요. 룬과 같은 하늘에서 룬을 밝히고, 섬에서 하늘을 전환해 다음 다리를 찾으세요.",
            "gapTip": "푸른 정원에는 끊어진 다리와 순찰등이 있어요. 점프와 공중 돌진 뒤 점프를 길게 눌러 활공하세요. 바람 구슬은 두 능력을 충전해요.",
            "windTip": "보랏빛 관측소에는 넓은 틈과 옆바람, 어려운 유물 갈림길이 있어요. 순찰등을 피하며 바람 구슬을 통해 돌진을 이어가세요.",
            "portalReady": "룬 3개가 빛나요. 남은 다리를 따라 둥근 하늘 관문으로 가세요.",
            "missing": "관문에는 룬 3개가 필요해요. 두 번째·네 번째·다섯 번째 섬에서 룬의 해·달 표시를 맞추고 룬 밝히기를 누르세요.",
            "cleared": "봉화를 되살렸어요",
            "complete": "새벽이 돌아올 길을 찾았어요",
            "next": "다음 챕터",
            "again": "다시 플레이",
            "share": "여정 공유",
            "resultText": "배달부가 세 봉화를 이어 주었어요. 하늘을 건너는 여정이 완성됐어요.",
            "chapterText": "새 봉화에 불이 켜졌어요. 다음 다리가 기다립니다.",
            "score": "점수",
            "localBest": "이 기기의 최고 기록",
            "gold": "새벽의 수호자",
            "silver": "하늘 길잡이",
            "bronze": "용감한 배달부",
            "locked": "이전 챕터를 완료하면 열려요.",
            "saveNotice": "진행 상황은 이 기기에 저장됩니다. 브라우저 데이터를 지우면 함께 삭제됩니다.",
            "webgl": "이 게임에는 WebGL이 필요합니다. 최신 브라우저에서 하드웨어 가속을 켜거나 아래의 다른 퍼즐을 즐겨 주세요.",
            "loading": "하늘길을 준비하고 있어요…",
            "practiceLabel": "연습",
            "dailyLabel": "오늘의 탐험",
            "campaignLabel": "여정",
            "guideTitle": "Cloudweft Passage 플레이 방법",
            "faqTitle": "첫 비행 전에 알아두세요",
            "guide": [
                "서로 다른 섬 배치와 분위기를 가진 세 개의 하늘 정원을 여행합니다. 살구빛 새벽에서 해와 달의 길을 배우고, 푸른 하늘 정원에서는 끊어진 다리와 순찰등을 만납니다. 보랏빛 관측소에는 넓은 틈과 옆바람, 더 어려운 선택형 유물 갈림길이 있습니다. 각 챕터의 두 번째·네 번째·다섯 번째 주요 섬에서 룬을 밝히면 마지막 관문이 열립니다.",
                "WASD나 방향키로 이동하고 Space로 점프합니다. 내려오는 동안 Space를 누르고 있으면 최대 1.5초 동안 활공합니다. 공중에서 Shift를 누르면 전방으로 한 번 돌진합니다. 착지하거나 흰 바람 구슬을 모으면 돌진과 활공 에너지가 모두 충전됩니다. 바람 구슬은 실제 플레이 시간 8초 뒤 다시 나타납니다. 터치 화면에는 방향 패드, 점프(길게 눌러 활공), 공중 돌진, 하늘 접기, 룬 밝히기가 있습니다.",
                "안전한 섬에서 E 또는 하늘 접기로 세계를 전환합니다. 해의 다리와 룬에는 동그라미, 달에는 두 줄이 있습니다. 흐릿한 다리는 걸을 수 없습니다. 룬 옆에서 표시와 같은 세계를 선택한 다음 F 또는 룬 밝히기를 눌러야 룬이 켜집니다. 지나가기만 해서는 켜지지 않습니다. 모든 섬은 체크포인트이며, 떨어지면 모은 룬과 유물을 유지한 채 마지막 섬으로 돌아와 비행 에너지도 충전됩니다. 목숨 제한이나 유료 재도전은 없습니다.",
                "챕터마다 선택 수집품인 초록 유물 네 개가 있습니다. 두 개는 세 번째 본섬에서 옆 다리로 연결된 작은 섬에 숨겨져 있습니다. 챕터 점수는 2,200점에서 시작해 유물당 250점을 더하고 실제 플레이 시간 1초당 3점, 구조 한 번당 100점을 뺍니다. 최저 점수는 100점입니다. 유물 네 개를 모두 모으고 구조 없이 160초 안에 완료하면 금메달, 그 외 구조 세 번 이하라면 은메달을 받습니다. 오늘의 탐험은 일부 날짜에 코스를 좌우 반전하고 순찰등의 출발 시점을 바꾸며, 안전한 길의 연결은 유지합니다. 기록은 기기에 저장되고 공유 결과는 이용자가 직접 보내는 기록입니다."
            ],
            "faq": [
                [
                    "실제 3D 게임인가요?",
                    "네. 섬과 다리, 배달부를 WebGL의 입체 메시로 그립니다. 외부 게임 모델을 사용하지 않으며 브라우저 안에서 실행됩니다."
                ],
                [
                    "떨어지거나 창을 닫으면 어떻게 되나요?",
                    "떨어지면 수집품을 유지한 채 마지막 섬으로 돌아옵니다. 저장한 여정 계속을 선택하면 이 기기에 마지막으로 저장한 체크포인트에서 이어집니다. 새 여정을 시작하면 진행 중인 저장을 교체합니다."
                ],
                [
                    "광고 시청이나 가입 없이 할 수 있나요?",
                    "네. 모든 챕터를 완료하는 데 가입, 결제, 광고 시청이 필요하지 않습니다. 오늘의 코스도 반복해서 즐길 수 있습니다. 공유는 결과와 링크만 보내며 온라인 순위표는 없습니다."
                ]
            ],
            "dash": "공중 돌진",
            "attune": "룬 밝히기",
            "flight": "비행 에너지",
            "ready": "사용 가능",
            "spent": "착지 / 충전",
            "moveTip": "첫걸음: 돌길을 따라가세요. WASD / 방향키로 이동하고 Space로 점프해요. 첫 룬은 해의 다리 건너편에 있어요.",
            "runeTip": "룬 옆에서 해(동그라미)·달(두 줄) 표시와 같은 하늘로 전환한 뒤, 룬 밝히기 / F를 누르세요.",
            "dashTip": "점프한 뒤 Shift / 공중 돌진으로 빠르게 전진해요. 착지하거나 빛나는 바람 구슬에 닿으면 다시 사용할 수 있어요.",
            "glideTip": "내려올 때 점프 / Space를 길게 누르면 1.5초 동안 활공해요. 흰 바람 구슬을 모으면 공중에서도 에너지가 채워져요.",
            "recharge": "바람 구슬 발견! 돌진과 활공 에너지를 충전했어요."
        },
        "ja": {
            "subtitle": "折り重なる空の道",
            "badge": "オリジナル3Dアドベンチャー",
            "intro": "小さな空の配達人。重なる二つの世界。帰り道をつなぐ旅。",
            "description": "3つの空の庭を探索。太陽と月の祠に共鳴し、途切れた橋をダッシュで渡り、隠された遺物へ滑空しよう。",
            "play": "旅を始める",
            "daily": "今日の冒険",
            "resume": "保存した旅を続ける",
            "practice": "チャプター練習",
            "chapter": "チャプター",
            "chapterNames": [
                "杏色の夜明け",
                "蒼の空中庭園",
                "紫の観測所"
            ],
            "goal": "島のルーンを3個灯し、空の門へ進もう。",
            "glyph": "ルーン",
            "relic": "遺物",
            "time": "時間",
            "falls": "救助",
            "sun": "太陽",
            "moon": "月",
            "phase": "空を折る",
            "jump": "ジャンプ",
            "pause": "一時停止",
            "paused": "ひと休み",
            "continue": "続ける",
            "restart": "章をやり直す",
            "menu": "旅のメニュー",
            "hint": "道のヒント",
            "sound": "音",
            "lowMotion": "動きを抑える",
            "keys": "移動: WASD / 矢印 · ジャンプ / 長押しで滑空: Space · ダッシュ: Shift · 切替: E · 共鳴: F · 停止: Esc",
            "touchHint": "ジャンプを押し続けて下降すると滑空。空中ダッシュは1回、着地か風の玉で回復します。",
            "foldTip": "太陽の橋は丸、月の橋は二本線。薄い橋には乗れません。安全な島で切り替えましょう。",
            "checkpoint": "島のチェックポイントを保存",
            "rescued": "最後の島へ戻りました。集めた物はそのままです。",
            "glyphFound": "島のルーンに共鳴しました。光が空の道を結びます。",
            "relicFound": "秘密の遺物を発見",
            "nextIsland": "くっきりした印の橋を進み、祠と同じ世界で共鳴。島で切り替えて次の道を開きましょう。",
            "gapTip": "蒼の庭には橋の切れ目と巡回する光があります。ジャンプ、ダッシュ、長押しで滑空。風の玉で回復しましょう。",
            "windTip": "紫の観測所には広い切れ目と横風、難しい遺物の脇道。風の玉を通ってダッシュをつなぎましょう。",
            "portalReady": "3つのルーンが点灯。残る橋をたどって丸い空の門へ。",
            "missing": "門には3つのルーンが必要です。2・4・5番目の島で印の世界に合わせて共鳴してください。",
            "cleared": "灯台が復活",
            "complete": "夜明けの帰り道がつながった",
            "next": "次の章",
            "again": "もう一度",
            "share": "旅を共有",
            "resultText": "配達人が三つの灯台をつなぎました。空の旅は完了です。",
            "chapterText": "新しい灯台が輝いています。次の橋へ進みましょう。",
            "score": "スコア",
            "localBest": "この端末の最高記録",
            "gold": "夜明けの守り手",
            "silver": "空の案内人",
            "bronze": "勇敢な配達人",
            "locked": "前の章をクリアすると開きます。",
            "saveNotice": "進行はこの端末に保存されます。ブラウザーデータを消すと削除されます。",
            "webgl": "このゲームにはWebGLが必要です。最新ブラウザーのハードウェアアクセラレーションを有効にするか、下のパズルをお楽しみください。",
            "loading": "空の道を準備中…",
            "practiceLabel": "練習",
            "dailyLabel": "デイリー",
            "campaignLabel": "旅",
            "guideTitle": "Cloudweft Passage の遊び方",
            "faqTitle": "初めての飛行について",
            "guide": [
                "配置と雰囲気の異なる3つの空中庭園を旅します。杏色の夜明けで太陽と月の道を学び、蒼の空中庭園で途切れた橋と巡回する光に出会います。紫の観測所では広い切れ目、横風、任意の難しい遺物の脇道が登場。各章の主要ルートの2・4・5番目の島でルーンに共鳴すると最後の門が開きます。",
                "WASDまたは矢印で移動し、Spaceでジャンプ。下降中にSpaceを押し続けると最大1.5秒滑空できます。空中でShiftを押すと前方に1回ダッシュ。着地するか白い風の玉に触れると両方回復し、玉はプレイ時間8秒で戻ります。タッチ操作は方向パッド、ジャンプ（長押しで滑空）、空中ダッシュ、空の切替、共鳴です。",
                "安全な島でEまたは空の切替を押します。太陽の橋と祠には丸、月には二本線があります。薄い橋は足場になりません。祠に近づき、印と同じ世界に合わせてFまたは共鳴を押してください。歩いて触れるだけでは点灯しません。各島でチェックポイントを保存。落下してもルーンと遺物を保ったまま最後の島へ戻り、飛行エネルギーも回復します。残機制限や有料の再挑戦はありません。",
                "各章に緑の遺物が4つあり、2つは3番目の本島からつながる脇の島にあります。得点は2,200に遺物1つにつき250を足し、プレイ1秒につき3、救助1回につき100を引き、最低100です。遺物4つ、救助なし、160秒未満で金。それ以外は救助3回以下で銀です。毎日のコースは日によって左右反転し、巡回灯の初期位置が変わりますが、道の接続は保たれます。記録は端末内のみで、共有記録は自己申告です。"
            ],
            "faq": [
                [
                    "本物の3Dですか？",
                    "はい。島、橋、配達人はWebGLの立体メッシュです。外部ゲームのモデルを使わず、ブラウザー内で動きます。"
                ],
                [
                    "落下やページを閉じた場合は？",
                    "落下では集めた物を保持して最後の島へ戻ります。「保存した旅を続ける」でこの端末のチェックポイントを再開できます。新しい旅は進行中の保存を置き換えます。"
                ],
                [
                    "広告視聴やアカウントは必要？",
                    "いいえ。全章を無料・登録なし・広告視聴なしでクリアできます。毎日のコースも繰り返せます。共有は結果とリンクのみで、オンラインランキングはありません。"
                ]
            ],
            "dash": "空中ダッシュ",
            "attune": "共鳴",
            "flight": "飛行エネルギー",
            "ready": "使用可能",
            "spent": "着地で回復",
            "moveTip": "まず石の道へ。WASD / 矢印で移動、Spaceでジャンプ。最初のルーンは太陽の橋の先です。",
            "runeTip": "祠のそばで太陽（丸）か月（二本線）の印に世界を合わせ、共鳴 / Fを押してください。",
            "dashTip": "ジャンプ後にShift / 空中ダッシュで前進。着地か白く光る風の玉で再使用できます。",
            "glideTip": "下降中にジャンプ / Spaceを長押しすると1.5秒滑空。白い風の玉で空中でも回復します。",
            "recharge": "風の玉でダッシュと滑空を回復！"
        },
        "zh": {
            "subtitle": "折叠天空之路",
            "badge": "原创3D冒险",
            "intro": "小小天空信使，两个重叠的世界，一条等待修复的归途。",
            "description": "探索三座手工设计的空中花园，点亮日月祭坛，冲过断桥，滑翔寻找隐藏遗物。",
            "play": "开始旅程",
            "daily": "每日探险",
            "resume": "继续保存的旅程",
            "practice": "章节练习",
            "chapter": "章节",
            "chapterNames": [
                "杏色黎明",
                "蔚蓝空中花园",
                "紫色观测站"
            ],
            "goal": "点亮三座岛屿符文，再进入天空之门。",
            "glyph": "符文",
            "relic": "遗物",
            "time": "时间",
            "falls": "救援",
            "sun": "日",
            "moon": "月",
            "phase": "折叠天空",
            "jump": "跳跃",
            "pause": "暂停",
            "paused": "旅程已暂停",
            "continue": "继续",
            "restart": "重玩本章",
            "menu": "旅程菜单",
            "hint": "路线提示",
            "sound": "声音",
            "lowMotion": "减少动态",
            "keys": "移动: WASD / 方向键 · 跳跃 / 按住滑翔: Space · 冲刺: Shift · 切换: E · 点亮: F · 暂停: Esc",
            "touchHint": "下降时按住跳跃即可滑翔。空中冲刺一次，落地或收集风之球后充能。",
            "foldTip": "太阳桥有圆形标记，月亮桥有双线标记。虚影桥无法站立，请在安全岛屿切换。",
            "checkpoint": "已保存岛屿检查点",
            "rescued": "已返回上一座岛，收集品仍然保留。",
            "glyphFound": "岛屿符文已点亮，光束连接归途。",
            "relicFound": "发现隐藏遗物",
            "nextIsland": "沿实心标记桥前进，在相同世界点亮祭坛。在岛上切换以找到下一座桥。",
            "gapTip": "蔚蓝花园有断桥与巡逻光球。跳起、冲刺，再按住跳跃滑翔。风之球可补充两种能力。",
            "windTip": "紫色观测站有更宽的缺口、横风与较难的遗物支路。看准巡逻光球，借风之球连续冲刺。",
            "portalReady": "三枚符文已点亮，沿剩余桥梁前往圆形天空之门。",
            "missing": "天空之门需要三枚符文。前往第2、4、5座主岛，匹配日月标记后按点亮。",
            "cleared": "灯塔已点亮",
            "complete": "黎明找到了回家的路",
            "next": "下一章",
            "again": "再玩一次",
            "share": "分享旅程",
            "resultText": "信使连起了三座灯塔。天空旅程圆满完成。",
            "chapterText": "新的灯塔正在发光，下一座桥等待着你。",
            "score": "得分",
            "localBest": "本机最佳",
            "gold": "黎明守护者",
            "silver": "天空领航员",
            "bronze": "勇敢信使",
            "locked": "完成上一章即可解锁。",
            "saveNotice": "进度保存在此设备。清除浏览器数据会删除进度。",
            "webgl": "此冒险需要WebGL。请使用新版浏览器并开启硬件加速，或体验下方其他谜题。",
            "loading": "正在准备天空路线…",
            "practiceLabel": "练习",
            "dailyLabel": "每日",
            "campaignLabel": "旅程",
            "guideTitle": "Cloudweft Passage 玩法",
            "faqTitle": "首次飞行须知",
            "guide": [
                "旅程包含三座布局与气氛不同的空中花园。杏色黎明教授日月道路，蔚蓝空中花园加入断桥与巡逻光球，紫色观测站包含更宽缺口、横风和可选的高难遗物支路。每章点亮主路第2、4、5座岛上的符文后，终点之门才会打开。",
                "使用WASD或方向键移动，Space跳跃。下降时按住Space最多滑翔1.5秒。空中按Shift可向前冲刺一次。落地或触碰白色风之球会恢复冲刺与滑翔能量，风之球在8秒有效游戏时间后重现。触屏提供方向键、跳跃（按住滑翔）、空中冲刺、切换天空与点亮按钮。",
                "在安全岛上按E或切换天空改变世界。太阳桥与祭坛标有圆形，月亮标有双线，虚影桥不能站立。靠近祭坛，匹配其世界，再按F或点亮；仅走过不会激活。所有岛屿都有检查点。坠落后保留符文与遗物，回到上次岛屿并恢复飞行能量。没有生命次数限制，也无需付费重试。",
                "每章有4件可选绿色遗物，其中2件位于第三座主岛旁的支线岛。得分以2,200为基础，每件遗物加250，实际游玩每秒减3，每次救援减100，最低100。收齐4件遗物、没有救援并在160秒内完成可获得金牌，否则救援3次以内为银牌。每日路线会在部分日期左右镜像并调整巡逻灯的起始位置，但路线连接保持安全。成绩只存于本机，分享成绩为玩家自行报告。"
            ],
            "faq": [
                [
                    "这是真正的3D吗？",
                    "是的。岛屿、桥梁和信使用WebGL立体网格渲染，无外部游戏模型，直接在浏览器运行。"
                ],
                [
                    "掉落或关闭页面会怎样？",
                    "掉落后保留收集品并返回最近的岛。继续保存的旅程可从本机最近的检查点开始。新旅程会替换进行中的存档。"
                ],
                [
                    "需要看广告或注册吗？",
                    "不需要。所有章节均无需注册、付费或观看广告。每日路线可以重玩。分享仅发送成绩和链接，没有在线排行榜。"
                ]
            ],
            "dash": "空中冲刺",
            "attune": "点亮",
            "flight": "飞行能量",
            "ready": "可使用",
            "spent": "落地充能",
            "moveTip": "第一步：沿石路前进，用WASD / 方向键移动，Space跳跃。第一个符文在太阳桥的另一端。",
            "runeTip": "站在祭坛旁，切换到符文标记的太阳（圆形）或月亮（双线）世界，再按点亮 / F。",
            "dashTip": "跳起后按Shift / 空中冲刺快速向前。落地或触碰白色风之球即可再次使用。",
            "glideTip": "下降时按住跳跃 / Space可滑翔1.5秒。白色风之球能在空中恢复能量。",
            "recharge": "收集风之球，冲刺与滑翔已充能！"
        },
        "es": {
            "subtitle": "El camino del cielo plegado",
            "badge": "AVENTURA 3D ORIGINAL",
            "intro": "Un pequeño mensajero. Dos mundos superpuestos. Un camino de vuelta por reparar.",
            "description": "Explora tres jardines celestes artesanales. Sintoniza santuarios solares y lunares, cruza puentes rotos y planea hacia reliquias ocultas.",
            "play": "Comenzar el viaje",
            "daily": "Expedición diaria",
            "resume": "Continuar viaje guardado",
            "practice": "Practicar capítulo",
            "chapter": "Capítulo",
            "chapterNames": [
                "El Alba Albaricoque",
                "Los Jardines Azules",
                "El Observatorio Violeta"
            ],
            "goal": "Sintoniza 3 runas y entra en la puerta del cielo.",
            "glyph": "Runas",
            "relic": "Reliquias",
            "time": "Tiempo",
            "falls": "Rescates",
            "sun": "SOL",
            "moon": "LUNA",
            "phase": "Plegar cielo",
            "jump": "Saltar",
            "pause": "Pausa",
            "paused": "Viaje en pausa",
            "continue": "Continuar",
            "restart": "Reiniciar capítulo",
            "menu": "Menú del viaje",
            "hint": "Pista de ruta",
            "sound": "Sonido",
            "lowMotion": "Movimiento suave",
            "keys": "Mover: WASD / flechas · Saltar / mantener para planear: Espacio · Impulso: Shift · Cambiar: E · Sintonizar: F · Pausa: Esc",
            "touchHint": "Mantén Saltar al descender para planear. Un impulso en el aire; aterriza o recoge una esfera de viento para recargar.",
            "foldTip": "Los puentes SOL tienen círculos; LUNA, dos rayas. Los puentes tenues no son sólidos. Cambia en una isla segura.",
            "checkpoint": "Punto de control guardado",
            "rescued": "De vuelta en tu última isla. Conservas lo recogido.",
            "glyphFound": "Runa sintonizada. Su luz conecta el camino del cielo.",
            "relicFound": "Reliquia secreta encontrada",
            "nextIsland": "Sigue el puente sólido marcado. Sintoniza los santuarios en su mundo y cambia de cielo en las islas para descubrir el siguiente puente.",
            "gapTip": "Los Jardines Azules tienen puentes rotos y luces centinela. Salta, impulsa y mantén Saltar para planear. Las esferas recargan ambas habilidades.",
            "windTip": "El Observatorio Violeta tiene huecos amplios, viento lateral y un desvío difícil. Calcula el paso de los centinelas y encadena impulsos con esferas.",
            "portalReady": "Las tres runas brillan. Sigue el último puente hasta la puerta circular.",
            "missing": "La puerta necesita tres runas. En las islas 2, 4 y 5, iguala la marca del mundo y pulsa Sintonizar.",
            "cleared": "Faro restaurado",
            "complete": "El alba encuentra el camino a casa",
            "next": "Siguiente capítulo",
            "again": "Jugar de nuevo",
            "share": "Compartir viaje",
            "resultText": "El mensajero ha unido los tres faros. Tu viaje por el cielo está completo.",
            "chapterText": "Un nuevo faro brilla. El siguiente cruce te espera.",
            "score": "Puntos",
            "localBest": "Mejor en este dispositivo",
            "gold": "Guardián del alba",
            "silver": "Navegante del cielo",
            "bronze": "Mensajero valiente",
            "locked": "Completa el capítulo anterior para desbloquearlo.",
            "saveNotice": "El progreso se guarda en este dispositivo. Borrar los datos del navegador lo elimina.",
            "webgl": "Esta aventura requiere WebGL. Usa un navegador actualizado con aceleración gráfica o prueba los otros puzles de abajo.",
            "loading": "Preparando tu ruta celeste…",
            "practiceLabel": "Práctica",
            "dailyLabel": "Diario",
            "campaignLabel": "Viaje",
            "guideTitle": "Cómo jugar a Cloudweft Passage",
            "faqTitle": "Antes de tu primer vuelo",
            "guide": [
                "Viaja por tres jardines celestes con disposiciones y ambientes diferentes. El Alba Albaricoque enseña las rutas SOL y LUNA; los Jardines Azules añaden puentes rotos y centinelas; el Observatorio Violeta combina huecos más amplios, viento lateral y un desvío opcional difícil. La salida de cada capítulo se abre al sintonizar las runas de las islas principales 2, 4 y 5.",
                "Muévete con WASD o las flechas y salta con Espacio. Mantenlo al descender para planear hasta 1,5 segundos. Pulsa Shift en el aire para un impulso frontal. Aterrizar o tocar una esfera blanca recarga impulso y planeador; las esferas reaparecen tras ocho segundos activos. En pantalla táctil hay direcciones, Saltar (mantener para planear), Impulso aéreo, Cambiar cielo y Sintonizar.",
                "Pulsa E / Cambiar cielo desde una isla segura. SOL usa círculos en puentes y santuarios; LUNA, dos rayas. Los puentes tenues no sostienen al personaje. Acércate a la runa, iguala su mundo y pulsa F / Sintonizar; pasar por encima no basta. Cada isla guarda un punto de control. Las caídas conservan runas y reliquias, te devuelven a la última isla y recargan el vuelo. No hay límite de vidas ni reintentos de pago.",
                "Cada capítulo tiene cuatro reliquias verdes opcionales; dos están en la isla lateral conectada a la tercera isla principal. La puntuación parte de 2.200, suma 250 por reliquia y resta 3 por segundo activo y 100 por rescate, con un mínimo de 100. Consigues oro con las cuatro reliquias, ningún rescate y menos de 160 segundos; en otro caso, hasta tres rescates dan plata. La expedición diaria refleja la ruta algunos días y cambia la fase inicial de las luces, sin romper los caminos. Las marcas son locales y los resultados compartidos son autodeclarados."
            ],
            "faq": [
                [
                    "¿Es un juego 3D real?",
                    "Sí. Las islas, los puentes y el mensajero son mallas 3D renderizadas con WebGL. Funciona en el navegador sin modelos de otros juegos."
                ],
                [
                    "¿Qué ocurre al caer o cerrar la página?",
                    "Al caer vuelves a tu última isla y conservas los objetos. Continuar viaje guardado restaura el último punto guardado en este dispositivo. Un nuevo viaje sustituye la partida activa."
                ],
                [
                    "¿Necesito ver anuncios o registrarme?",
                    "No. Puedes terminar todos los capítulos sin cuenta, pago ni anuncios. La ruta diaria se puede repetir. Compartir envía el resultado y un enlace; no hay clasificación en línea."
                ]
            ],
            "dash": "Impulso aéreo",
            "attune": "Sintonizar",
            "flight": "Energía de vuelo",
            "ready": "Listo",
            "spent": "Aterriza / recarga",
            "moveTip": "Primeros pasos: sigue las piedras. Muévete con WASD / flechas y salta con Espacio. La primera runa está tras el puente SOL.",
            "runeTip": "Acércate a la runa, iguala su marca SOL (círculo) o LUNA (dos rayas) y pulsa Sintonizar / F.",
            "dashTip": "Salta y pulsa Shift / Impulso aéreo para avanzar. Aterrizar o tocar una esfera blanca de viento recarga el impulso.",
            "glideTip": "Mantén Saltar / Espacio al caer para planear 1,5 segundos. Las esferas blancas recargan la energía en el aire.",
            "recharge": "Esfera de viento: impulso y planeador recargados."
        }
    };

    function startBrowser() {
        const $ = id => document.getElementById(id), canvas = $('sf-canvas');
        if (!canvas || canvas.dataset.started) return;
        canvas.dataset.started = 'true';
        let renderer, state = createState(), level = createLevel(), running = false, paused = false;
        let mode = 'campaign', seed = 0, results = [], roundId = '', last = 0, accumulator = 0, saveClock = 0;
        let runDate = new Date().toISOString().slice(0, 10), adPending = false, contextLost = false;
        const params = new URLSearchParams(window.location.search);
        const requestedDaily = params.get('mode') === 'daily';
        const requestedDate = params.get('date');
        const validDate = value => typeof value === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
        let frame = 0, toastUntil = 0, lastHud = -1, resultShown = false;
        let cameraX = 0, cameraZ = 0, cameraY = 0, jumpQueued = false, phaseQueued = false, dashQueued = false, interactQueued = false, jumpHeld = false;
        const keys = new Set(), touchKeys = new Map();
        const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; } };
        const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* private mode */ } };
        const removeSave = () => { try { localStorage.removeItem('pv_cloudweft_active'); } catch (_) { /* private mode */ } };
        const progress = normalizeProgress(read('pv_cloudweft_progress', null));
        let lowMotion = read('pv_cloudweft_low_motion', window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        let muted = false;
        try { muted = localStorage.getItem('pv_sound') === 'off'; } catch (_) { /* default */ }
        const lang = () => typeof I18n !== 'undefined' && COPY[I18n.currentLang] ? I18n.currentLang : 'en';
        const text = key => COPY[lang()][key] || COPY.en[key] || key;
        const sound = type => { if (!muted && typeof SFX !== 'undefined') { try { SFX.play(type); } catch (_) { /* audio unavailable */ } } };
        const clearInput = () => { keys.clear(); touchKeys.clear(); jumpQueued = phaseQueued = dashQueued = interactQueued = jumpHeld = false; document.querySelectorAll('.sf-pad button').forEach(b => b.classList.remove('pressed')); };
        function notice(message) { $('sf-notice').textContent = message; toastUntil = performance.now() + 5000; }
        function localize() {
            document.querySelectorAll('[data-sf]').forEach(el => { el.textContent = text(el.dataset.sf); });
            $('sf-guide-copy').replaceChildren(...text('guide').map(p => { const el = document.createElement('p'); el.textContent = p; return el; }));
            $('sf-faq-copy').replaceChildren(...text('faq').map(([q, a]) => {
                const d = document.createElement('details'), s = document.createElement('summary'), p = document.createElement('p');
                s.textContent = q; p.textContent = a; d.append(s, p); return d;
            }));
            $('sf-motion').setAttribute('aria-pressed', String(lowMotion));
            $('sf-sound').setAttribute('aria-pressed', String(!muted));
            $('sf-sound').textContent = (muted ? '🔇 ' : '🔊 ') + text('sound');
            $('sf-canvas').setAttribute('aria-label', text('goal'));
            const directionNames = { en: ['Move forward', 'Move left', 'Move back', 'Move right'], ko: ['앞으로 이동', '왼쪽으로 이동', '뒤로 이동', '오른쪽으로 이동'], ja: ['前へ移動', '左へ移動', '後ろへ移動', '右へ移動'], zh: ['向前移动', '向左移动', '向后移动', '向右移动'], es: ['Avanzar', 'Mover a la izquierda', 'Retroceder', 'Mover a la derecha'] };
            document.querySelectorAll('[data-direction]').forEach((button, index) => button.setAttribute('aria-label', directionNames[lang()][index]));
            if (requestedDaily) $('sf-start').textContent = text('daily') + (validDate(requestedDate) ? ' · ' + requestedDate : '');
            $('sf-campaign').hidden = !requestedDaily;
            renderChapters(); updateHud();
            if (resultShown) showResult(false);
            if (!running) $('sf-notice').textContent = text('foldTip');
        }
        function renderChapters() {
            $('sf-chapters').replaceChildren(...[0, 1, 2].map(i => {
                const b = document.createElement('button'); b.type = 'button'; b.disabled = i >= progress.unlocked;
                b.textContent = (b.disabled ? '🔒 ' : '') + (i + 1) + ' · ' + text('chapterNames')[i];
                const best = progress.best['chapter-' + i];
                if (best) { b.textContent += ' · ★ ' + best.toLocaleString(); b.title = text('localBest') + ': ' + best; }
                if (b.disabled) b.title = text('locked'); b.addEventListener('click', () => begin('practice', i)); return b;
            }));
            const stored = read('pv_cloudweft_active', null);
            $('sf-resume').hidden = !canResume(stored);
        }
        function canResume(saved) {
            if (!saved || !restore(saved.state) || !['campaign', 'daily', 'practice'].includes(saved.mode)) return false;
            if (saved.mode === 'daily' && (!validDate(saved.runDate) || seedForDate(saved.runDate) !== saved.state.seed)) return false;
            const previous = normalizeResults(saved.results, saved.state.chapter);
            return saved.mode === 'practice' || (previous.length === saved.state.chapter && previous.every((r, i) => r.chapter === i));
        }
        function updateHud() {
            $('sf-chapter-label').textContent = text('chapter') + ' ' + (state.chapter + 1) + ' / 3' + (mode === 'daily' ? ' · ' + runDate : '');
            $('sf-chapter-name').textContent = text('chapterNames')[state.chapter];
            $('sf-flight-fill').style.width = (state.glideEnergy / 1.5 * 100) + '%';
            $('sf-dash-status').textContent = state.dashCharge ? text('ready') : text('spent');
            $('sf-dash').classList.toggle('depleted', !state.dashCharge);
            $('sf-stage').classList.toggle('gliding', state.gliding);
            $('sf-glyphs').textContent = state.glyphs.length + '/3'; $('sf-relics').textContent = state.relics.length + '/4';
            $('sf-time').textContent = formatTime(state.elapsed); $('sf-falls').textContent = state.falls;
            $('sf-phase-indicator').textContent = (state.phase ? '☾ ' : '☀ ') + text(state.phase ? 'moon' : 'sun');
            $('sf-phase-indicator').classList.toggle('moon', state.phase === 1);
            $('sf-phase').setAttribute('aria-label', text('phase') + ': ' + text(state.phase ? 'moon' : 'sun'));
            $('sf-phase').setAttribute('aria-pressed', String(state.phase === 1));
            const nearbyRune=level.glyphs.find(g=>!state.glyphs.includes(g.id)&&distance(state,g)<2.8);
            const target = state.glyphs.length === 3 ? text('portalReady') : nearbyRune ? text('runeTip')+' · '+(nearbyRune.phase?'☾ '+text('moon'):'☀ '+text('sun')) : text('goal');
            $('sf-attune').classList.toggle('available', !!nearbyRune);
            $('sf-objective').textContent = target;
            drawMap();
        }
        function persist() {
            if (!running || state.won) return;
            write('pv_cloudweft_active', { state: serialize(state), mode, results, roundId, runDate });
        }
        function begin(nextMode, chapter = 0, saved = null, selectedDate = null) {
            if (!renderer || adPending || contextLost) return;
            clearInput(); mode = nextMode;
            runDate = saved && validDate(saved.runDate) ? saved.runDate : validDate(selectedDate) ? selectedDate : mode === 'daily' && requestedDaily && validDate(requestedDate) ? requestedDate : new Date().toISOString().slice(0, 10);
            seed = saved ? saved.state.seed : mode === 'daily' ? seedForDate(runDate) : 0;
            results = saved ? normalizeResults(saved.results, chapter) : [];
            roundId = saved && typeof saved.roundId === 'string' ? saved.roundId : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
            const restored = saved && restore(saved.state);
            state = restored ? restored.state : createState(chapter, seed); level = restored ? restored.level : createLevel(chapter, seed);
            cameraX = state.x; cameraZ = state.z; cameraY = state.y;
            running = true; paused = false; resultShown = false; saveClock = 0; accumulator = 0;
            $('sf-menu').hidden = true; $('sf-pause-panel').hidden = true; $('sf-result').hidden = true;
            $('sf-stage').classList.add('playing'); canvas.focus({ preventScroll: true });
            setEnvironment();
            notice(text(state.chapter === 0 ? 'moveTip' : state.chapter === 1 ? 'gapTip' : 'windTip'));
            updateHud(); persist(); sound('tap');
            if (window.matchMedia('(max-width: 767px)').matches)
                requestAnimationFrame(() => document.querySelector('.sf-game').scrollIntoView({ block: 'start', behavior: lowMotion ? 'instant' : 'smooth' }));
        }
        function setPause(value) {
            if (!running || state.won || (!value && contextLost)) return;
            paused = value; clearInput(); accumulator = 0;
            $('sf-pause-panel').hidden = !paused;
            if (paused) { persist(); $('sf-continue').focus({ preventScroll: true }); }
            else canvas.focus({ preventScroll: true });
        }
        function openMenu() {
            if (adPending) return;
            persist(); running = false; paused = false; resultShown = false; clearInput();
            $('sf-menu').hidden = false; $('sf-pause-panel').hidden = true; $('sf-result').hidden = true;
            $('sf-stage').classList.remove('playing'); renderChapters(); $('sf-start').focus({ preventScroll: true });
        }
        function finish() {
            if (resultShown) return;
            resultShown = true; clearInput(); sound('win');
            results.push({ chapter: state.chapter, score: score(state), elapsed: state.elapsed, falls: state.falls,
                relics: state.relics.length, medal: medal(state) });
            progress.unlocked = Math.max(progress.unlocked, Math.min(3, state.chapter + 2));
            const bestKey = (mode === 'daily' ? 'daily-' + seed : 'chapter') + '-' + state.chapter;
            progress.best[bestKey] = Math.max(Number(progress.best[bestKey]) || 0, score(state));
            write('pv_cloudweft_progress', progress);
            // One completion per complete campaign (or standalone practice chapter).
            const final = mode === 'practice' || state.chapter === 2;
            if (final) {
                const total = results.reduce((sum, r) => sum + r.score, 0);
                if (typeof updateStats === 'function') updateStats('cloudweft', total, { roundId });
                removeSave();
                if (mode === 'daily') write('pv_cloudweft_daily_' + runDate, { score: total });
            } else {
                // Closing the page on a completed chapter resumes at the next unlocked chapter.
                write('pv_cloudweft_active', { state: serialize(createState(state.chapter + 1, seed)), mode, results, roundId, runDate });
            }
            showResult(true);
            if (final && typeof AdController !== 'undefined') {
                adPending = true;
                $('sf-result').querySelectorAll('button').forEach(b => { b.disabled = true; });
                Promise.resolve().then(() => AdController.showInterstitial()).catch(() => {}).finally(() => {
                    adPending = false; $('sf-result').querySelectorAll('button').forEach(b => { b.disabled = false; });
                });
            }
        }
        function showResult(focus) {
            const final = state.chapter === 2 && mode !== 'practice';
            $('sf-result-title').textContent = text(final ? 'complete' : 'cleared');
            $('sf-result-copy').textContent = text(final ? 'resultText' : 'chapterText');
            const award = final ? results.every(r => r.medal === 'gold') ? 'gold' : results.some(r => r.medal === 'bronze') ? 'bronze' : 'silver' : medal(state);
            $('sf-medal').textContent = ({ gold: '✦', silver: '✧', bronze: '◇' })[award] + ' ' + text(award);
            const total = mode !== 'practice' && state.chapter === 2 ? results.reduce((n, r) => n + r.score, 0) : score(state);
            $('sf-result-score').textContent = total.toLocaleString();
            $('sf-result-stats').textContent = `${text('time')} ${formatTime(results.reduce((n, r) => n + r.elapsed, 0))} · ${text('relic')} ${results.reduce((n, r) => n + r.relics, 0)} / ${results.length * 4} · ${text('falls')} ${results.reduce((n, r) => n + r.falls, 0)}`;
            $('sf-next').hidden = mode === 'practice' || state.chapter === 2;
            $('sf-result').hidden = false;
            if (focus) $('sf-result-title').focus({ preventScroll: true });
        }
        function nextChapter() {
            if (!state.won || state.chapter >= 2) return;
            const saved = { state: serialize(createState(state.chapter + 1, seed)), results, roundId, runDate };
            begin(mode, state.chapter + 1, saved);
        }
        function hint() {
            notice(state.glyphs.length===3?text('portalReady'):level.glyphs.some(g=>!state.glyphs.includes(g.id)&&distance(state,g)<4)?text('runeTip'):distance(state,level.portal)<5?text('missing'):text('nextIsland'));
            sound('hint');
        }
        function handleEvents() {
            for (const event of state.events) {
                if (event === 'checkpoint') { notice(text(state.checkpoint==='i1'?'runeTip':state.checkpoint==='i2'?'glideTip':'checkpoint')); persist(); }
                if (event === 'glyph') { notice(text(state.glyphs.length === 3 ? 'portalReady' : state.glyphs.length===1 ? 'dashTip' : 'glyphFound')); sound('correct'); persist(); }
                if (event === 'relic') { notice(text('relicFound')); sound('combo'); persist(); }
                if (event === 'rescue') { notice(text('rescued')); sound('wrong'); persist(); }
                if (event === 'phase' || event === 'dash') sound('tap');
                if (event === 'recharge') {notice(text('recharge'));sound('combo');}
                if (event === 'win') finish();
            }
        }
        function drawMap() {
            const map = $('sf-map'), ctx = map.getContext('2d'); if (!ctx) return;
            ctx.clearRect(0, 0, 104, 152);
            const point = p => [52 + p.x * 1.65, 139 + p.z * 1.7];
            level.links.forEach(l => {
                const a = point(level.islands.find(i => i.id === l.a)), b = point(level.islands.find(i => i.id === l.b));
                ctx.strokeStyle = l.phase === state.phase ? (l.phase ? '#93c5fd' : '#fde68a') : '#637489';
                ctx.lineWidth = l.phase === state.phase ? 3 : 1; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
            });
            level.islands.forEach(i => { const p = point(i); ctx.fillStyle = i.id === state.checkpoint ? '#86efac' : '#f8fafc'; ctx.fillRect(p[0] - 4, p[1] - 4, 8, 8); });
            level.glyphs.filter(g => !state.glyphs.includes(g.id)).forEach(g => { const p = point(g); ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(...p, 3, 0, Math.PI * 2); ctx.fill(); });
            const p = point(state); ctx.fillStyle = '#f43f5e'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(...p, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        function objects(now) {
            const o = [], t = lowMotion ? 0 : now / 1000;
            const palette = [
                { stone:'#817d81', edge:'#aaa091', grass:'#a4c4a1', leaf:'#779e87', leafLight:'#bdd5ab', bloom:'#f5ccb3', trim:'#d5b885', cloud:'#fff4e6' },
                { stone:'#607d8e', edge:'#8ca7ad', grass:'#81b5ad', leaf:'#438b91', leafLight:'#8ec8be', bloom:'#cbddeb', trim:'#c7bd9d', cloud:'#e5f3ff' },
                { stone:'#655f85', edge:'#8c88aa', grass:'#a1a5bd', leaf:'#8d83b0', leafLight:'#c5b8cf', bloom:'#f1d0bb', trim:'#d6b68b', cloud:'#dbd6ed' }
            ][level.chapter];
            const add = (shape,x,y,z,sx,sy,sz,color,ry=0,extra={}) => {
                const object={shape,x,y,z,sx,sy,sz,color,ry,...extra}; o.push(object); return object;
            };
            const shadow=(x,y,z,sx,sz,opacity=.18)=>add('disk',x,y,z,sx,1,sz,'#233342',0,{opacity});
            const glow=(shape,x,y,z,sx,sy,sz,color,ry=0,extra={})=>add(shape,x,y,z,sx,sy,sz,color,ry,{emissive:.68,roughness:.35,castShadow:false,...extra});
            function lantern(x,y,z,scale=1) {
                shadow(x,y+.035,z,.6*scale,.6*scale);
                add('bevelbox',x,y+.13*scale,z,.5*scale,.25*scale,.5*scale,palette.stone);
                add('cylinder',x,y+.64*scale,z,.075*scale,1.05*scale,.075*scale,'#596d78');
                glow('bevelbox',x,y+1.18*scale,z,.22*scale,.3*scale,.22*scale,'#ffe0a0');
                add('cone',x,y+1.41*scale,z,.45*scale,.24*scale,.45*scale,'#4b6471');
            }
            function tree(x,y,z,scale,offset) {
                shadow(x,y+.05,z,2.1*scale,1.7*scale,.15);
                add('cylinder',x,y+.85*scale,z,.24*scale,1.7*scale,.25*scale,'#8a716a',.2);
                add('cylinder',x+.22*scale,y+1.27*scale,z,.12*scale,.85*scale,.12*scale,'#8a716a',0,{rz:-.65});
                for(let n=0;n<5;n++) {
                    const a=n*2.399+offset, r=n===4?0:.55;
                    add('sphere',x+Math.cos(a)*r*scale,y+(1.8+(n%2)*.33)*scale,z+Math.sin(a)*r*scale,
                        (1.35-n*.05)*scale,(1.18+n*.04)*scale,(1.2+n*.04)*scale,n%2?palette.leaf:palette.leafLight,a,{roughness:1});
                }
            }
            for (const i of level.islands) {
                if(Math.abs(i.z-state.z)>46) continue;
                const index=Number(i.id.slice(1));
                // A crisp walkable terrace sits above asymmetrical rock strata.
                add('bevelbox',i.x,i.y-.55,i.z,i.w,1.1,i.d,palette.edge,0,{roughness:1});
                add('bevelbox',i.x,i.y+.02,i.z,i.w-.04,.17,i.d-.04,palette.grass);
                add('bevelbox',i.x+.12,i.y-1.35,i.z-.12,i.w*.78,1.35,i.d*.84,palette.stone,.1);
                for(let n=0;n<5;n++) {
                    const a=n*1.27+.25, r=i.w*.27;
                    add('octa',i.x+Math.cos(a)*r,i.y-2-n%2*.6,i.z+Math.sin(a)*r,
                        2.1,3.1+n%2,2.3,n%2?palette.edge:palette.stone,a,{roughness:1});
                    if(n%2===0) add('sphere',i.x+Math.cos(a)*i.w*.43,i.y-.12,i.z+Math.sin(a)*i.d*.41,1.15,.48,.8,palette.grass);
                }
                // Stepping-stone paths keep the safe walking area legible.
                for(let n=0;n<7;n++) add('bevelbox',i.x+Math.sin(n*3.1)*.32,i.y+.13,i.z-2.2+n*.73,
                    1.12,.11,.62,n%2?'#d9d4c2':'#e7dfca',.09*Math.sin(n));
                tree(i.x-2.05,i.y+.1,i.z-1.8,index%2?.72:.88,index);
                if(index===0||index===3) tree(i.x+2.13,i.y+.1,i.z-1.8,.61,index+1);
                for(let n=0;n<9;n++) {
                    const a=n*2.4+index, x=i.x+Math.cos(a)*(2.1+n%2*.3),z=i.z+Math.sin(a)*(1.6+n%3*.25);
                    add('sphere',x,i.y+.16,z,.42,.25,.37,n%3?palette.leafLight:palette.leaf);
                    if(n%3===0) { add('cylinder',x,i.y+.38,z,.035,.42,.035,palette.leaf);add('sphere',x,i.y+.58,z,.22,.15,.22,palette.bloom); }
                }
                lantern(i.x+2.3,i.y+.1,i.z+1.8,.78);
                if(level.chapter===1&&(index===0||index===4)) {
                    for(const side of [-1,1]) {
                        const x=i.x+side*2.25,z=i.z-1.9;
                        add('cylinder',x,i.y+.82,z,.42,1.65,.42,palette.trim);
                        add('bevelbox',x,i.y+1.67,z,.7,.18,.7,palette.edge);
                        add('torus',x,i.y+1.97,z,.58,.58,.58,'#d7ccb0',0,{rx:Math.PI/2});
                    }
                }
                if(level.chapter===2&&(index===0||index===4)) {
                    const x=i.x+1.88,z=i.z-1.85;
                    add('cylinder',x,i.y+.52,z,.5,1,.5,palette.stone);
                    add('torus',x,i.y+1.38,z,1.65,1.65,1.65,palette.trim,t*.12,{rx:.75});
                    add('torus',x,i.y+1.38,z,1.3,1.3,1.3,'#b5bcd6',-t*.17,{rx:-.75});
                    glow('sphere',x,i.y+1.38,z,.5,.5,.5,'#e5d9f1');
                }
                if(index===2||index===6) {
                    const ax=i.x+1.65,az=i.z-1.65;
                    add('torus',ax,i.y+1.45,az,2.3,2.3,2.3,palette.trim,0,{rx:Math.PI/2,roughness:.8});
                    for(const side of [-1,1])add('bevelbox',ax+side*1.1,i.y+.65,az,.34,1.3,.43,palette.edge);
                }
                if (i.id === state.checkpoint) glow('torus',i.x,i.y+.15,i.z+1,1.0,.14,1.0,'#b2e8c4');
            }
            for (const b of level.bridges) {
                if(Math.abs(b.z-state.z)>39)continue;
                const on=b.phase===state.phase, ink=b.phase?'#749cbd':'#c8a365';
                const extra=on?{roughness:.78}:{opacity:.16,emissive:.3};
                add('bevelbox',b.x,b.y-.14,b.z,b.w,on?.28:.06,b.d-.025,on?(b.phase?'#c8dae2':'#eddbb4'):'#c5d8e5',b.ry,extra);
                const dx=Math.cos(b.ry)*(b.w/2-.09),dz=-Math.sin(b.ry)*(b.w/2-.09);
                for(const side of [-1,1]) {
                    add('box',b.x+side*dx,b.y+.025,b.z+side*dz,.11,.085,b.d,ink,b.ry,on?{}:{opacity:.2});
                    const segment=Number(b.id.split('-')[1]);
                    if(on&&segment%3===0) {
                        add('cylinder',b.x+side*dx,b.y+.39,b.z+side*dz,.095,.75,.095,'#728b96');
                        glow('sphere',b.x+side*dx,b.y+.8,b.z+side*dz,.15,.15,.15,b.phase?'#afdaff':'#ffe7b7');
                    }
                    if(on)add('box',b.x+side*dx,b.y+.59,b.z+side*dz,.035,.04,b.d+.04,'#9aa3a3',b.ry);
                }
                // Distinct phase marks remain readable for people with color-vision differences.
                if(on&&Number(b.id.split('-')[1])%3===1) {
                    if(b.phase)for(const side of [-1,1])add('box',b.x+Math.cos(b.ry)*side*.16,b.y+.027,b.z-Math.sin(b.ry)*side*.16,.075,.02,.32,ink,b.ry);
                    else add('disk',b.x,b.y+.031,b.z,.24,1,.24,ink);
                }
            }
            for (const g of level.glyphs) {
                if(Math.abs(g.z-state.z)>40)continue;
                const lit=state.glyphs.includes(g.id), color=lit?'#b8eed1':g.phase?'#a5d5ff':'#f3ce87';
                shadow(g.x,g.y-.75,g.z,1.4,1.4);
                add('cylinder',g.x,g.y-.61,g.z,1.25,.32,1.25,palette.edge);
                add('torus',g.x,g.y-.39,g.z,1.16,.12,1.16,color,0,{emissive:.4});
                add('octa',g.x,g.y+.1+Math.sin(t*2)*.08,g.z,.53,.84,.53,color,t*.35,{emissive:lit?.7:.22,roughness:.25});
                if(g.phase)for(const side of [-1,1])glow('bevelbox',g.x+side*.23,g.y-.38,g.z,.1,.035,.28,color);
                else glow('disk',g.x,g.y-.37,g.z,.3,1,.3,color);
                if(lit) {glow('cylinder',g.x,g.y+2,g.z,.035,3.2,.035,'#e6fff4');for(let n=0;n<3;n++)glow('sphere',g.x+Math.sin(t+n*2)*.45,g.y+.55+n*.42,g.z+Math.cos(t+n*2)*.45,.075,.075,.075,'#e1ffe9');}
            }
            for (const r of level.relics) if(!state.relics.includes(r.id)&&Math.abs(r.z-state.z)<40) {
                glow('octa',r.x,r.y+Math.sin(t*2+r.x)*.11,r.z,.38,.6,.38,'#a8eadb',t*.7);
                add('torus',r.x,r.y-.2,r.z,.65,.08,.65,'#c5aa7c',0,{emissive:.2});
            }
            for(const mote of level.motes)if(state.motes[mote.id]===undefined||state.elapsed-state.motes[mote.id]>8) {
                glow('sphere',mote.x,mote.y+Math.sin(t*2)*.1,mote.z,.38,.38,.38,'#f9efe0');
                glow('torus',mote.x,mote.y,mote.z,.83,.08,.83,'#b7e7ee',0,{rx:Math.PI/2});
            }
            for(const hazard of level.hazards){
                const h=hazardAt(hazard,state.elapsed);
                add('torus',h.x,h.y,h.z,.8,.15,.8,'#985775',t,{rx:.35});
                glow('sphere',h.x,h.y,h.z,.37,.37,.37,'#eeacb9');
                for(let n=0;n<3;n++)glow('sphere',h.x-hazard.axisX*n*.16,h.y,h.z-hazard.axisZ*n*.16,.10,.10,.10,'#f0c5ce');
            }
            const portal=level.portal,lit=state.glyphs.length===3;
            if(Math.abs(portal.z-state.z)<45){
                const color=lit?'#a1e9ee':'#9aadc2';
                add('torus',portal.x,portal.y+1.5,portal.z,3.2,3.2,3.2,palette.trim,0,{rx:Math.PI/2,roughness:.5});
                for(const side of [-1,1])add('bevelbox',portal.x+side*1.45,portal.y+.55,portal.z,.58,1.1,.72,palette.stone);
                add('disk',portal.x,portal.y+1.55,portal.z,2.3,1,2.3,color,0,{rx:Math.PI/2,opacity:lit?.40:.07,emissive:.7});
                for(let n=0;n<8;n++){const a=n*Math.PI/4;glow('octa',portal.x+Math.sin(a)*1.35,portal.y+1.5+Math.cos(a)*1.35,portal.z+.08,.17,.21,.17,color,a);}
            }
            // Articulated courier, wool hood, satchel, amber scarf and folding fabric wing.
            const p=state,walk=lowMotion?0:Math.sin(p.distanceWalked*10),bob=p.grounded?Math.abs(walk)*.045:0;
            const local=(shape,x,y,z,sx,sy,sz,color,extra={})=>add(shape,p.x+Math.cos(p.facing)*x+Math.sin(p.facing)*z,p.y+y+bob,p.z-Math.sin(p.facing)*x+Math.cos(p.facing)*z,sx,sy,sz,color,p.facing,extra);
            const ground=level.surfaces.filter(s=>active(s,p.phase)&&contains(s,p.x,p.z)&&s.y<=p.y+.2).sort((a,b)=>b.y-a.y)[0];
            if(ground)shadow(p.x,ground.y+.12,p.z,.9,.68,.25);
            if(!(p.invulnerable>0&&Math.floor(t*8)%2)){
                local('bevelbox',0,.62,0,.55,.67,.40,'#48677c',{roughness:.8});
                local('sphere',0,1.16,0,.67,.66,.61,'#eee2c8');
                local('sphere',0,1.13,.19,.48,.43,.32,'#d6b99d');
                for(const side of [-1,1]){
                    local('sphere',side*.105,1.19,.34,.055,.06,.035,'#354b5a');
                    local('bevelbox',side*.18,.20+Math.max(0,walk*side)*.06,.07,.22,.27,.34,'#344854',{rx:walk*side*.35});
                    local('bevelbox',side*.36,.65,.03,.16,.51,.17,'#e7d8ba',{rx:p.gliding?-1.1:-walk*side*.45,rz:side*(p.gliding?.85:.12)});
                }
                local('bevelbox',0,.72,-.3,.46,.49,.25,'#b48b60');
                local('box',0,.72,-.444,.075,.46,.035,'#e4c49c');
                local('torus',0,.94,0,.64,.15,.55,'#d6a65c');
                for(let n=0;n<3;n++)local('bevelbox',Math.sin(t*3+n)*.055,.91-n*.045,-.28-n*.16,.20,.065,.26,'#dbac62',{rx:.2+n*.13});
                local('bevelbox',.39,.35,.13,.16,.22,.16,'#f9d695',{emissive:.6,roughness:.3});
                if(!p.grounded){
                    const spread=p.gliding?1:.55;
                    local('bevelbox',0,1.69,-.04,2.3*spread,.09,.95,'#efdfba',{rz:Math.sin(t*1.8)*.035});
                    for(const side of [-1,1])local('bevelbox',side*.78*spread,1.61,-.04,.65*spread,.08,.90,'#6f99a6',{rz:side*.2});
                    for(const side of [-1,1])local('box',side*.28,1.18,0,.035,.85,.035,'#8f9183',{rz:side*.5});
                }
            }
            if(p.dashTimer>0)for(let n=1;n<5;n++)glow('sphere',p.x-p.dashX*n*.35,p.y+.65,p.z-p.dashZ*n*.35,.15+n*.015,.12,.15,'#d7f8fc');
            // Billowing distant clouds and tiny unplayable ruins establish depth.
            for(let n=0;n<18;n++){
                const z=-n*6+8;if(Math.abs(z-state.z)>55)continue;
                const x=(n%2?-1:1)*(12+n%4*4),y=-6-n%3*1.4;
                for(let k=0;k<4;k++)add('sphere',x+k*1.8+Math.sin(t*.07+n)*.2,y+(k%2)*.65,z+k*.4,5.5+k%2,2.4+k%2*.6,4.3,palette.cloud,0,{roughness:1,castShadow:false});
                if(n%3===0){add('octa',x*1.35,-2.7,z-3,4.2,7,4.2,palette.stone,.3);add('bevelbox',x*1.35,.7,z-3,3,.35,3,palette.grass);}
            }
            const celX=state.x-17,celZ=state.z-37;
            glow('sphere',celX,level.chapter===2?13:15,celZ,level.chapter===2?3.3:4.5,level.chapter===2?3.3:4.5,.7,level.chapter===2?'#e4dcf8':'#fff0cc');
            for(let n=0;n<12;n++){
                const a=t*.13+n*2.4,x=state.x+Math.sin(a)*7,z=state.z-8+Math.cos(a*.7+n)*11;
                glow('sphere',x,2+Math.sin(t*.2+n)*2,z,.04,.04,.04,'#fff2c9');
            }
            return o;
        }
        function setEnvironment() {
            const environments=[
                {clear:'#bed4dc',skyTop:'#7eacb8',skyBottom:'#f6e6d1',lightColor:'#ffe8c5'},
                {clear:'#a4cbdc',skyTop:'#588cac',skyBottom:'#dcf0ed',lightColor:'#e7f7ff'},
                {clear:'#a2a1c2',skyTop:'#454c7d',skyBottom:'#ded2dc',lightColor:'#ffe0c3'}
            ];
            if(renderer&&renderer.setEnvironment)renderer.setEnvironment({...environments[state.chapter],fogNear:27,fogFar:79,bloom:.2,shadowSpan:24});
            $('sf-stage').dataset.chapter=String(state.chapter);
        }
        function animate(now) {
            if (!renderer) return;
            const delta = Math.min(.1, (now - (last || now)) / 1000); last = now;
            if (running && !paused && !state.won) {
                accumulator += delta;
                while (accumulator >= 1 / 60) {
                    const held = code => keys.has(code) || [...touchKeys.values()].includes(code);
                    const input = { x: Number(held('right')) - Number(held('left')), z: Number(held('down')) - Number(held('up')),
                        jump: jumpQueued, phase: phaseQueued, dash: dashQueued, interact: interactQueued, glide: jumpHeld };
                    jumpQueued = phaseQueued = dashQueued = interactQueued = false;
                    step(state, level, input, 1 / 60); handleEvents(); accumulator -= 1 / 60;
                    if (state.won) { accumulator = 0; break; }
                }
                saveClock += delta; if (saveClock >= 3) { persist(); saveClock = 0; }
            }
            if (now - lastHud > 120) { updateHud(); lastHud = now; }
            if (now > toastUntil && running && !paused) $('sf-notice').textContent = text('touchHint');
            const smoothing = lowMotion ? 1 : Math.min(1, delta * 7);
            cameraX += (state.x - cameraX) * smoothing; cameraZ += (state.z - cameraZ) * smoothing;
            const wantedY = level.islands.find(i => i.id === state.checkpoint)?.y || 0;
            cameraY += (wantedY - cameraY) * smoothing;
            const sceneX=cameraX+(!running&&canvas.clientWidth>650?-3.5:0);
            renderer.render(objects(now), { eye: [sceneX, cameraY + 9.6, cameraZ + 12.5], target: [sceneX, cameraY + .6, cameraZ - 4], fov: 48 });
            frame = requestAnimationFrame(animate);
        }
        const keyMap = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
        window.addEventListener('keydown', event => {
            if (event.target.closest('input, textarea, select') || !running) return;
            if (event.code === 'Escape') { event.preventDefault(); if (!event.repeat) setPause(!paused); return; }
            if (paused || state.won) return;
            if (keyMap[event.code]) { event.preventDefault(); keys.add(keyMap[event.code]); }
            if (['Space','KeyE','KeyF','ShiftLeft','ShiftRight'].includes(event.code)) {
                event.preventDefault(); if(event.code==='Space')jumpHeld=true;
                if(!event.repeat) {if(event.code==='Space')jumpQueued=true;else if(event.code==='KeyE')phaseQueued=true;else if(event.code==='KeyF')interactQueued=true;else dashQueued=true;}
            }
        });
        window.addEventListener('keyup', e => { if (keyMap[e.code]) keys.delete(keyMap[e.code]); if(e.code==='Space')jumpHeld=false; });
        window.addEventListener('blur', () => { clearInput(); if (running && !paused) setPause(true); });
        document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); setPause(true); persist(); } });
        document.querySelectorAll('[data-direction]').forEach(button => {
            button.addEventListener('pointerdown', e => {
                e.preventDefault(); if (!running || paused || state.won) return;
                button.setPointerCapture(e.pointerId); touchKeys.set(e.pointerId, button.dataset.direction); button.classList.add('pressed');
            });
            const release = e => { touchKeys.delete(e.pointerId); button.classList.remove('pressed'); };
            button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
        });
        $('sf-jump').addEventListener('pointerdown', e => { e.preventDefault(); if(running&&!paused&&!state.won){jumpQueued=true;jumpHeld=true;$('sf-jump').setPointerCapture(e.pointerId);} });
        ['pointerup','pointercancel','lostpointercapture'].forEach(event=>$('sf-jump').addEventListener(event,()=>{jumpHeld=false;}));
        $('sf-dash').addEventListener('pointerdown',e=>{e.preventDefault();if(running&&!paused)dashQueued=true;});
        $('sf-attune').addEventListener('pointerdown',e=>{e.preventDefault();if(running&&!paused)interactQueued=true;});
        $('sf-dash').addEventListener('click',e=>{if(e.detail===0&&running&&!paused)dashQueued=true;});
        $('sf-attune').addEventListener('click',e=>{if(e.detail===0&&running&&!paused)interactQueued=true;});
        $('sf-phase').addEventListener('pointerdown', e => { e.preventDefault(); if (running && !paused) phaseQueued = true; });
        $('sf-jump').addEventListener('click', e => { if (e.detail === 0 && running && !paused) jumpQueued = true; });
        $('sf-phase').addEventListener('click', e => { if (e.detail === 0 && running && !paused) phaseQueued = true; });
        $('sf-start').addEventListener('click', () => begin(requestedDaily ? 'daily' : 'campaign'));
        $('sf-daily').addEventListener('click', () => begin('daily', 0, null, new Date().toISOString().slice(0, 10)));
        $('sf-campaign').addEventListener('click', () => begin('campaign'));
        $('sf-resume').addEventListener('click', () => { const s = read('pv_cloudweft_active', null); if (canResume(s)) begin(s.mode, s.state.chapter, s); });
        $('sf-pause').addEventListener('click', () => setPause(true)); $('sf-continue').addEventListener('click', () => setPause(false));
        $('sf-restart').addEventListener('click', () => begin(mode, state.chapter, { state: serialize(createState(state.chapter, seed)), results: results.filter(r => r.chapter < state.chapter), roundId, runDate }));
        $('sf-menu-button').addEventListener('click', openMenu); $('sf-result-menu').addEventListener('click', openMenu);
        $('sf-again').addEventListener('click', () => begin(mode, mode === 'practice' ? state.chapter : 0, null, runDate));
        $('sf-next').addEventListener('click', nextChapter); $('sf-hint').addEventListener('click', hint);
        $('sf-sound').addEventListener('click', () => { muted = !muted; if (typeof SFX !== 'undefined') SFX.enabled = !muted; try { localStorage.setItem('pv_sound', muted ? 'off' : 'on'); } catch (_) { /* private mode */ } localize(); });
        $('sf-motion').addEventListener('click', () => { lowMotion = !lowMotion; write('pv_cloudweft_low_motion', lowMotion); localize(); });
        $('sf-share').addEventListener('click', () => {
            if (!state.won || typeof shareResult !== 'function') return;
            const total = results.reduce((n, r) => n + r.score, 0), route = mode === 'daily' ? ' · ' + runDate + ' UTC' : '';
            const link = new URL('https://puzzlevault.pages.dev/games/cloudweft');
            link.searchParams.set('lang', lang());
            if (mode === 'daily') { link.searchParams.set('mode', 'daily'); link.searchParams.set('date', runDate); }
            shareResult(`☁ Cloudweft Passage${route}\n${text(mode === 'daily' ? 'dailyLabel' : mode === 'practice' ? 'practiceLabel' : 'campaignLabel')} · ${text('chapter')} ${state.chapter + 1}/3\n${text('score')} ${total} · ${text('relic')} ${results.reduce((n, r) => n + r.relics, 0)}/${results.length * 4}\n${link.href}`);
        });
        window.addEventListener('langchange', localize);
        canvas.addEventListener('webglcontextlost', event => {
            event.preventDefault(); contextLost = true; setPause(true); clearInput(); persist(); $('sf-continue').disabled = true;
        });
        canvas.addEventListener('webglcontextrestored', () => { contextLost = false; $('sf-continue').disabled = false; });
        window.addEventListener('pagehide', event => {
            persist(); clearInput(); setPause(true);
            if (!event.persisted) { cancelAnimationFrame(frame); if (renderer) renderer.dispose(); }
        });
        localize();
        try { renderer = new PV3D.Renderer(canvas, { clear: '#bed4dc', skyTop: '#739faf', skyBottom: '#f6e5cd', lightColor: '#ffe8c5', fogNear: 26, fogFar: 67 }); }
        catch (_) { $('sf-error').hidden = false; $('sf-error').textContent = text('webgl'); document.querySelectorAll('#sf-menu button').forEach(b => { b.disabled = true; }); return; }
        setEnvironment();
        if (typeof renderCrossPromo === 'function') renderCrossPromo('cloudweft');
        frame = requestAnimationFrame(animate);
        // Read-only snapshot for diagnostics; mutations still go through ordinary game inputs.
        window.Cloudweft.inspect = () => ({ state: JSON.parse(JSON.stringify(state)), mode, running, paused, results: results.slice() });
    }
    function formatTime(seconds) { const s = Math.floor(seconds); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    return { createLevel, createState, contains, active, hazardAt, step, rescue, score, medal, seedForDate, normalizeProgress, normalizeResults, serialize, restore, COPY, boot };
});

