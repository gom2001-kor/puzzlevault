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
        const raw = [[0, 0], [-6, -14], [5, -28], [-7, -42], [5, -56], [0, -71], [18, -29]];
        const islands = raw.map(([x, z], i) => ({ id: 'i' + i, kind: 'island', x: x * mirror, z,
            y: i === 6 ? 1.2 : i * .55, w: i === 0 ? 7 : 6, d: i === 5 ? 7 : 6, ry: 0 }));
        const bridges = [], links = [];
        function connect(a, b, phase, index) {
            const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
            const ux = dx / len, uz = dz / len, start = 2.65, end = len - 2.65;
            const count = Math.ceil((end - start) / .8), size = (end - start) / count;
            const gap = chapter > 0 && (index === 1 || index === 3) ? Math.floor(count / 2) : -20;
            const link = { a: a.id, b: b.id, phase, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2,
                y: (a.y + b.y) / 2, ry: Math.atan2(dx, dz), len: end - start, gap, index };
            links.push(link);
            for (let j = 0; j < count; j++) {
                if (j === gap || (chapter === 2 && j === gap + 1)) continue;
                const t = (start + (j + .5) * size) / len;
                bridges.push({ id: 'b' + index + '-' + j, kind: 'bridge', phase, x: a.x + dx * t,
                    z: a.z + dz * t, y: a.y + (b.y - a.y) * t, w: index === 5 ? 1.75 : 2.2,
                    d: size + .06, ry: Math.atan2(ux, uz), link: index });
            }
        }
        for (let i = 0; i < 5; i++) connect(islands[i], islands[i + 1], i % 2, i);
        connect(islands[2], islands[6], 1, 5);
        const glyphs = [1, 3, 4].map((id, i) => ({ id: 'g' + i, kind: 'glyph',
            x: islands[id].x + (i === 1 ? -1 : 1) * mirror, z: islands[id].z, y: islands[id].y + .9 }));
        const relics = [2, 6, 6, 5].map((id, i) => ({ id: 'r' + i, kind: 'relic',
            x: islands[id].x + (i % 2 ? -1.6 : 1.6) * mirror,
            z: islands[id].z + (i === 2 ? -1.6 : .8), y: islands[id].y + .65 }));
        const hazards = chapter === 0 ? [] : [links[2], ...(chapter === 2 ? [links[4]] : [])].map((l, i) => ({
            x: l.x, z: l.z, y: l.y + .6, axisX: Math.cos(l.ry), axisZ: -Math.sin(l.ry),
            offset: (seed % 31) / 10 + i, period: 2.7 + i * .8, range: 2.5
        }));
        return { chapter, seed, islands, bridges, links, glyphs, relics, hazards,
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
            elapsed: 0, falls: 0, won: false, events: [], facing: Math.PI };
    }
    function rescue(state, level, countFall = true) {
        const cp = level.islands.find(i => i.id === state.checkpoint) || level.islands[0];
        Object.assign(state, { x: cp.x, z: cp.z + 1, y: cp.y, vy: 0, grounded: true,
            coyote: .13, jumpBuffer: 0, invulnerable: 1.8 });
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
        const oldY = state.y;
        state.x += ix * SPEED * dt; state.z += iz * SPEED * dt;
        // In chapter three, a marked wind gate nudges the courier sideways on its bridge.
        if (level.chapter === 2 && Math.abs(state.z - level.links[3].z) < 1.3 && !state.grounded)
            state.x += Math.sin(state.elapsed * 2) * .45 * dt;
        const surfaces = level.surfaces.filter(p => active(p, state.phase) && contains(p, state.x, state.z));
        const walk = state.grounded && surfaces.filter(p => p.y <= oldY + .22 && p.y >= oldY - .32)
            .sort((a, b) => b.y - a.y)[0];
        if (walk && state.vy <= 0) { state.y = walk.y; state.vy = 0; state.grounded = true; }
        else {
            state.grounded = false; state.vy -= GRAVITY * dt; state.y += state.vy * dt;
            const landing = state.vy <= 0 && surfaces.filter(p => oldY >= p.y - .12 && state.y <= p.y)
                .sort((a, b) => b.y - a.y)[0];
            if (landing) { state.y = landing.y; state.vy = 0; state.grounded = true; }
        }
        if (state.grounded) {
            const island = level.islands.find(i => contains(i, state.x, state.z, .4) && Math.abs(i.y - state.y) < .2);
            if (island && island.id !== state.checkpoint) { state.checkpoint = island.id; state.events.push('checkpoint'); }
        }
        for (const item of level.glyphs.concat(level.relics)) {
            const list = item.kind === 'glyph' ? state.glyphs : state.relics;
            if (!list.includes(item.id) && distance(state, item) < 1.05 && Math.abs(state.y + .7 - item.y) < 1.4) {
                list.push(item.id); state.events.push(item.kind);
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
        en: {
            subtitle: 'Fold the sky. Deliver the dawn.', badge: 'ORIGINAL 3D ADVENTURE',
            intro: 'A little sky courier. Two overlapping worlds. One broken route home.',
            description: 'Switch sun and moon bridges, leap over gaps, and restore three floating beacons. Three chapters, secret relics, and a daily mirrored route.',
            play: 'Begin the journey', daily: 'Daily expedition', resume: 'Continue saved journey', practice: 'Chapter practice',
            chapter: 'Chapter', chapterNames: ['The waking bridge', 'The lantern crossing', 'The last wind gate'],
            goal: 'Collect 3 glyphs, then enter the blue portal.', glyph: 'Glyphs', relic: 'Relics', time: 'Time', falls: 'Rescues',
            sun: 'SUN', moon: 'MOON', phase: 'Fold sky', jump: 'Jump', pause: 'Pause', paused: 'Journey paused',
            continue: 'Continue', restart: 'Restart chapter', menu: 'Journey menu', hint: 'Route hint', sound: 'Sound', lowMotion: 'Gentle motion',
            keys: 'Move: WASD / arrows · Jump: Space · Fold: E · Pause: Esc',
            touchHint: 'Use the direction pad. Jump gaps. Fold only when you are on a solid island.',
            foldTip: 'Solid amber bridges belong to SUN. Blue bridges belong to MOON. Pale bridges cannot hold you.',
            checkpoint: 'Island checkpoint saved', rescued: 'Back at your last island. Your glyphs are safe.', glyphFound: 'A dawn glyph restored!', relicFound: 'Secret relic recovered',
            nextIsland: 'Follow the next solid bridge. Switch world on an island when the path is pale.',
            gapTip: 'Chapter 2 adds bridge gaps and moving pink lights. Jump the gaps; wait for the light to pass.',
            windTip: 'Chapter 3 has wider gaps and a wind gate. Start your jump close to the edge and keep moving.',
            portalReady: 'All three glyphs found! Follow the route to the blue portal on the last island.',
            missing: 'The portal needs all 3 dawn glyphs. Look for the tall amber diamonds on islands 2, 4 and 5.',
            cleared: 'Beacon restored', complete: 'The dawn has a way home', next: 'Next chapter', again: 'Play again', share: 'Share this journey',
            resultText: 'The courier has reunited the three beacons. Your sky route is complete.',
            chapterText: 'A new beacon is glowing. The next crossing is waiting.', score: 'Score', localBest: 'Best on this device',
            gold: 'Dawn keeper', silver: 'Sky navigator', bronze: 'Brave courier', locked: 'Complete the previous chapter to unlock.',
            saveNotice: 'Progress is saved on this device. Clearing browser data removes it.',
            webgl: 'This adventure needs WebGL. Try an up-to-date browser with hardware acceleration, or enjoy the other puzzles below.',
            loading: 'Preparing your sky route…', practiceLabel: 'Practice', dailyLabel: 'Daily', campaignLabel: 'Journey',
            guideTitle: 'How to play Cloudweft Passage', faqTitle: 'Questions before your first flight',
            guide: [
                'You are the courier of a small floating archipelago. The paths have split into two overlapping worlds: SUN and MOON. Recover three dawn glyphs in each chapter and carry them to the blue portal on the final island. The adventure has three handcrafted chapters; completing one unlocks the next for practice.',
                'Use WASD or the arrow keys to move. The camera follows from behind, so up always means deeper into the sky route. Press Space to jump and E to fold between the two worlds. On a touch screen, use the direction pad and the Jump and Fold sky buttons. Amber bridges are solid in SUN, and blue bridges are solid in MOON. Pale bridge outlines are previews, not walkable surfaces. Change worlds from a broad island before crossing.',
                'The second chapter introduces gaps and moving pink sentry lights. A short jump clears a gap; waiting for a light to pass is often safer than rushing. The third chapter adds wider gaps and a gentle wind gate. Every island is a checkpoint. Falling returns you to the last island and keeps your collected items. There is no life limit and no payment to retry.',
                'Four optional mint relics reward exploration in each chapter. Two are on the side island reached from the third main island. A chapter score starts at 2,200, adds 250 per relic, and subtracts three points per active second and 100 per rescue, with a minimum of 100. Gold needs all four relics, no rescues, and a finish under 160 seconds; up to three rescues earns silver otherwise. Daily mode mirrors the safe course on some days and changes sentry timing. Scores are local, and shared results are self-reported.'
            ],
            faq: [['Is this a full 3D game?', 'Yes. The islands, bridges and courier are rendered as real 3D meshes with WebGL. It runs locally in your browser without external models or downloads.'], ['What happens if I fall or close the page?', 'A fall returns you to your latest island with collected items intact. Continue saved journey restores the latest saved checkpoint on this device. A new journey replaces that active save.'], ['Can I play without ads or an account?', 'Yes. No account, payment or ad viewing is required to complete any chapter. The daily route can be replayed. Sharing sends a result and link; there is no online leaderboard.']]
        },
        ko: {
            subtitle: '구름결 여정', badge: '오리지널 3D 어드벤처', intro: '작은 하늘 배달부, 겹쳐진 두 세계, 집으로 이어지는 마지막 길.',
            description: '해와 달의 다리를 전환하고 틈을 뛰어넘어 세 개의 봉화를 되살리세요. 세 개의 챕터, 숨겨진 유물, 매일 달라지는 하늘 탐험.',
            play: '여정 시작', daily: '오늘의 탐험', resume: '저장한 여정 계속', practice: '챕터 연습', chapter: '챕터',
            chapterNames: ['깨어나는 다리', '등불을 건너서', '마지막 바람문'], goal: '문양 3개를 모아 파란 관문으로 가세요.',
            glyph: '문양', relic: '유물', time: '시간', falls: '구조', sun: '해', moon: '달', phase: '하늘 접기', jump: '점프', pause: '일시정지', paused: '잠시 쉬어가세요', continue: '계속하기', restart: '챕터 다시 시작', menu: '여정 메뉴', hint: '길 찾기 힌트', sound: '소리', lowMotion: '움직임 줄이기',
            keys: '이동: WASD / 방향키 · 점프: Space · 전환: E · 정지: Esc', touchHint: '방향 패드로 이동하고 틈은 점프로 넘으세요. 하늘 전환은 넓은 섬에서 하세요.', foldTip: '노란 다리는 해, 파란 다리는 달에서 걸을 수 있어요. 흐릿한 다리에는 발을 디딜 수 없어요.',
            checkpoint: '섬 체크포인트 저장', rescued: '마지막 섬으로 돌아왔어요. 모은 문양은 그대로예요.', glyphFound: '새벽 문양을 되찾았어요!', relicFound: '숨겨진 유물을 찾았어요', nextIsland: '실체가 있는 다리를 따라가세요. 다음 다리가 흐릿하면 섬에서 하늘을 전환하세요.',
            gapTip: '2장에는 다리의 틈과 분홍 순찰등이 등장해요. 틈을 점프로 넘고 순찰등은 지나가기를 기다리세요.', windTip: '3장에는 더 넓은 틈과 바람문이 있어요. 가장자리 가까이에서 점프하며 계속 전진하세요.', portalReady: '문양을 모두 모았어요! 마지막 섬의 파란 관문으로 가세요.', missing: '관문을 열려면 문양 3개가 필요해요. 두 번째, 네 번째, 다섯 번째 섬의 노란 마름모를 찾아보세요.',
            cleared: '봉화를 되살렸어요', complete: '새벽이 돌아올 길을 찾았어요', next: '다음 챕터', again: '다시 플레이', share: '여정 공유', resultText: '배달부가 세 봉화를 이어 주었어요. 하늘을 건너는 여정이 완성됐어요.', chapterText: '새 봉화에 불이 켜졌어요. 다음 다리가 기다립니다.', score: '점수', localBest: '이 기기의 최고 기록', gold: '새벽의 수호자', silver: '하늘 길잡이', bronze: '용감한 배달부', locked: '이전 챕터를 완료하면 열려요.', saveNotice: '진행 상황은 이 기기에 저장됩니다. 브라우저 데이터를 지우면 함께 삭제됩니다.', webgl: '이 게임에는 WebGL이 필요합니다. 최신 브라우저에서 하드웨어 가속을 켜거나 아래의 다른 퍼즐을 즐겨 주세요.', loading: '하늘길을 준비하고 있어요…', practiceLabel: '연습', dailyLabel: '오늘의 탐험', campaignLabel: '여정', guideTitle: 'Cloudweft Passage 플레이 방법', faqTitle: '첫 비행 전에 알아두세요',
            guide: ['여러분은 공중 섬을 오가는 작은 배달부입니다. 하늘길은 해와 달이라는 두 세계로 나뉘어 있습니다. 각 챕터에서 새벽 문양 세 개를 모은 뒤 마지막 섬의 파란 관문에 도착하세요. 손으로 설계한 세 챕터가 이어지며, 완료한 챕터는 연습 메뉴에서 다시 선택할 수 있습니다.', 'WASD 또는 방향키로 이동하고 Space로 점프, E로 하늘을 전환합니다. 카메라는 뒤에서 따라가므로 위쪽 방향키는 항상 앞쪽 하늘길을 향합니다. 터치 화면에서는 방향 패드와 점프·하늘 접기 버튼을 사용하세요. 노란 다리는 해, 파란 다리는 달에서만 실체가 있습니다. 흐릿하게 보이는 길은 다음 경로를 알려주는 표시일 뿐 걸을 수 없습니다. 넓은 섬 위에서 다음 다리의 색을 확인한 뒤 전환하세요.', '두 번째 챕터부터 다리에 틈이 생기고 분홍 순찰등이 움직입니다. 틈은 점프로 넘고, 순찰등은 옆으로 지나갈 때까지 기다리면 안전합니다. 세 번째 챕터에는 조금 더 넓은 틈과 부드럽게 밀어내는 바람문이 있습니다. 모든 섬은 체크포인트입니다. 떨어져도 마지막 섬으로 돌아오며 모은 문양과 유물은 유지됩니다. 목숨 제한이나 유료 재도전은 없습니다.', '챕터마다 선택 수집품인 초록 유물 네 개가 있습니다. 두 개는 세 번째 본섬에서 옆 다리로 연결된 작은 섬에 숨겨져 있습니다. 챕터 점수는 2,200점에서 시작해 유물당 250점을 더하고 실제 플레이 시간 1초당 3점, 구조 한 번당 100점을 뺍니다. 최저 점수는 100점입니다. 유물 네 개를 모두 모으고 구조 없이 160초 안에 완료하면 금메달, 그 외 구조 세 번 이하라면 은메달을 받습니다. 오늘의 탐험은 일부 날짜에 코스를 좌우 반전하고 순찰등의 출발 시점을 바꾸며, 안전한 길의 연결은 유지합니다. 기록은 기기에 저장되고 공유 결과는 이용자가 직접 보내는 기록입니다.'],
            faq: [['실제 3D 게임인가요?', '네. 섬과 다리, 배달부를 WebGL의 입체 메시로 그립니다. 외부 게임 모델을 사용하지 않으며 브라우저 안에서 실행됩니다.'], ['떨어지거나 창을 닫으면 어떻게 되나요?', '떨어지면 수집품을 유지한 채 마지막 섬으로 돌아옵니다. 저장한 여정 계속을 선택하면 이 기기에 마지막으로 저장한 체크포인트에서 이어집니다. 새 여정을 시작하면 진행 중인 저장을 교체합니다.'], ['광고 시청이나 가입 없이 할 수 있나요?', '네. 모든 챕터를 완료하는 데 가입, 결제, 광고 시청이 필요하지 않습니다. 오늘의 코스도 반복해서 즐길 수 있습니다. 공유는 결과와 링크만 보내며 온라인 순위표는 없습니다.']]
        },
        ja: {
            subtitle: '折り重なる空の道', badge: 'オリジナル3Dアドベンチャー', intro: '小さな空の配達人。重なる二つの世界。帰り道をつなぐ旅。', description: '太陽と月の橋を切り替え、隙間を跳び越えて三つの灯台を復活させましょう。3章と秘密の遺物、毎日の空の旅。', play: '旅を始める', daily: '今日の冒険', resume: '保存した旅を続ける', practice: 'チャプター練習', chapter: 'チャプター', chapterNames: ['目覚める橋', '灯りの渡り道', '最後の風の門'], goal: '紋章を3つ集めて青い門へ。', glyph: '紋章', relic: '遺物', time: '時間', falls: '救助', sun: '太陽', moon: '月', phase: '空を折る', jump: 'ジャンプ', pause: '一時停止', paused: 'ひと休み', continue: '続ける', restart: '章をやり直す', menu: '旅のメニュー', hint: '道のヒント', sound: '音', lowMotion: '動きを抑える', keys: '移動: WASD / 矢印 · ジャンプ: Space · 切替: E · 停止: Esc', touchHint: '方向パッドで移動。隙間はジャンプし、空の切替は広い島で行いましょう。', foldTip: '黄色い橋は太陽、青い橋は月で実体化します。薄い橋には乗れません。', checkpoint: '島のチェックポイントを保存', rescued: '最後の島へ戻りました。集めた物はそのままです。', glyphFound: '夜明けの紋章を発見！', relicFound: '秘密の遺物を発見', nextIsland: '実体のある橋を進みましょう。薄い橋の前では島の上で空を切り替えます。', gapTip: '第2章では隙間とピンクの巡回灯が登場。隙間を跳び、灯りが通り過ぎるのを待ちましょう。', windTip: '第3章は隙間が広く、風の門もあります。端の近くで跳んで進み続けましょう。', portalReady: '紋章がそろいました！最後の島の青い門へ。', missing: '門には紋章が3つ必要です。2、4、5番目の島で黄色いダイヤを探しましょう。', cleared: '灯台が復活', complete: '夜明けの帰り道がつながった', next: '次の章', again: 'もう一度', share: '旅を共有', resultText: '配達人が三つの灯台をつなぎました。空の旅は完了です。', chapterText: '新しい灯台が輝いています。次の橋へ進みましょう。', score: 'スコア', localBest: 'この端末の最高記録', gold: '夜明けの守り手', silver: '空の案内人', bronze: '勇敢な配達人', locked: '前の章をクリアすると開きます。', saveNotice: '進行はこの端末に保存されます。ブラウザーデータを消すと削除されます。', webgl: 'このゲームにはWebGLが必要です。最新ブラウザーのハードウェアアクセラレーションを有効にするか、下のパズルをお楽しみください。', loading: '空の道を準備中…', practiceLabel: '練習', dailyLabel: 'デイリー', campaignLabel: '旅', guideTitle: 'Cloudweft Passage の遊び方', faqTitle: '初めての飛行について',
            guide: ['あなたは浮島を巡る小さな配達人です。道は太陽と月の二つの世界に分かれています。各章で夜明けの紋章を3つ集め、最後の島の青い門へ届けましょう。手作りの3章を進めると、クリアした章を練習できます。', 'WASDか矢印で移動、Spaceでジャンプ、Eで世界を切り替えます。上方向はいつも道の奥です。タッチ画面には方向パッドとジャンプ・空を折るボタンがあります。黄色い橋は太陽、青い橋は月でのみ歩けます。薄い橋は予告表示なので乗れません。次の色を見て、広い島の上で切り替えましょう。', '第2章は橋の隙間とピンクの巡回灯、第3章は広い隙間と風の門が加わります。隙間を跳び、灯りが通り過ぎるのを待ちましょう。島はすべてチェックポイントです。落下すると最後の島へ戻りますが、紋章と遺物は失いません。残機や有料の再挑戦はありません。', '各章に緑の遺物が4つあり、2つは3番目の本島からつながる脇の島にあります。得点は2,200に遺物1つにつき250を足し、プレイ1秒につき3、救助1回につき100を引き、最低100です。遺物4つ、救助なし、160秒未満で金。それ以外は救助3回以下で銀です。毎日のコースは日によって左右反転し、巡回灯の初期位置が変わりますが、道の接続は保たれます。記録は端末内のみで、共有記録は自己申告です。'], faq: [['本物の3Dですか？', 'はい。島、橋、配達人はWebGLの立体メッシュです。外部ゲームのモデルを使わず、ブラウザー内で動きます。'], ['落下やページを閉じた場合は？', '落下では集めた物を保持して最後の島へ戻ります。「保存した旅を続ける」でこの端末のチェックポイントを再開できます。新しい旅は進行中の保存を置き換えます。'], ['広告視聴やアカウントは必要？', 'いいえ。全章を無料・登録なし・広告視聴なしでクリアできます。毎日のコースも繰り返せます。共有は結果とリンクのみで、オンラインランキングはありません。']]
        },
        zh: {
            subtitle: '折叠天空之路', badge: '原创3D冒险', intro: '小小天空信使，两个重叠的世界，一条等待修复的归途。', description: '切换日月桥梁，跳过缺口，点亮三座灯塔。三个章节、隐藏遗物和每日天空探险。', play: '开始旅程', daily: '每日探险', resume: '继续保存的旅程', practice: '章节练习', chapter: '章节', chapterNames: ['苏醒之桥', '灯火渡口', '最后的风门'], goal: '收集3枚符文，然后进入蓝色传送门。', glyph: '符文', relic: '遗物', time: '时间', falls: '救援', sun: '日', moon: '月', phase: '折叠天空', jump: '跳跃', pause: '暂停', paused: '旅程已暂停', continue: '继续', restart: '重玩本章', menu: '旅程菜单', hint: '路线提示', sound: '声音', lowMotion: '减少动态', keys: '移动: WASD / 方向键 · 跳跃: Space · 切换: E · 暂停: Esc', touchHint: '用方向键移动，跳过缺口，请在宽阔的岛上切换天空。', foldTip: '黄色桥在日世界可走，蓝色桥在月世界可走。浅色的桥不能承重。', checkpoint: '已保存岛屿检查点', rescued: '已返回上一座岛，收集品仍然保留。', glyphFound: '找到了黎明符文！', relicFound: '发现隐藏遗物', nextIsland: '沿着实体桥前进。下一座桥颜色很浅时，在岛上切换世界。', gapTip: '第2章增加缺口和粉色巡逻灯。跳过缺口，等待灯光经过。', windTip: '第3章有更宽的缺口和风门。靠近边缘起跳并保持前进。', portalReady: '符文集齐了！沿路线前往最后一座岛的蓝色传送门。', missing: '传送门需要3枚符文。请在第2、4、5座岛寻找黄色菱形。', cleared: '灯塔已点亮', complete: '黎明找到了回家的路', next: '下一章', again: '再玩一次', share: '分享旅程', resultText: '信使连起了三座灯塔。天空旅程圆满完成。', chapterText: '新的灯塔正在发光，下一座桥等待着你。', score: '得分', localBest: '本机最佳', gold: '黎明守护者', silver: '天空领航员', bronze: '勇敢信使', locked: '完成上一章即可解锁。', saveNotice: '进度保存在此设备。清除浏览器数据会删除进度。', webgl: '此冒险需要WebGL。请使用新版浏览器并开启硬件加速，或体验下方其他谜题。', loading: '正在准备天空路线…', practiceLabel: '练习', dailyLabel: '每日', campaignLabel: '旅程', guideTitle: 'Cloudweft Passage 玩法', faqTitle: '首次飞行须知',
            guide: ['你是一名往返浮岛的小信使。道路分成日与月两个重叠世界。每章收集3枚黎明符文，然后到达最后一座岛的蓝色传送门。游戏包含三个手工设计的章节，完成后可在练习菜单重新选择。', '使用WASD或方向键移动，Space跳跃，E切换世界。向上始终朝向路线深处。触屏可用方向面板及跳跃、折叠天空按钮。黄色桥只在日世界实体化，蓝色桥只在月世界实体化。浅色桥仅显示路线，不能行走。请在宽阔的岛上观察下一座桥的颜色再切换。', '第2章出现桥梁缺口和粉色巡逻灯，第3章增加更宽的缺口及轻推角色的风门。跳过缺口，等待灯光经过。每座岛都是检查点。掉落会返回最近的岛屿，符文和遗物不会丢失。没有生命次数限制，也不需要付费重试。', '每章有4件可选绿色遗物，其中2件位于第三座主岛旁的支线岛。得分以2,200为基础，每件遗物加250，实际游玩每秒减3，每次救援减100，最低100。收齐4件遗物、没有救援并在160秒内完成可获得金牌，否则救援3次以内为银牌。每日路线会在部分日期左右镜像并调整巡逻灯的起始位置，但路线连接保持安全。成绩只存于本机，分享成绩为玩家自行报告。'], faq: [['这是真正的3D吗？', '是的。岛屿、桥梁和信使用WebGL立体网格渲染，无外部游戏模型，直接在浏览器运行。'], ['掉落或关闭页面会怎样？', '掉落后保留收集品并返回最近的岛。继续保存的旅程可从本机最近的检查点开始。新旅程会替换进行中的存档。'], ['需要看广告或注册吗？', '不需要。所有章节均无需注册、付费或观看广告。每日路线可以重玩。分享仅发送成绩和链接，没有在线排行榜。']]
        },
        es: {
            subtitle: 'El camino del cielo plegado', badge: 'AVENTURA 3D ORIGINAL', intro: 'Un pequeño mensajero. Dos mundos superpuestos. Un camino de vuelta por reparar.', description: 'Alterna puentes de sol y luna, salta los huecos y restaura tres faros. Tres capítulos, reliquias secretas y una expedición diaria.', play: 'Comenzar el viaje', daily: 'Expedición diaria', resume: 'Continuar viaje guardado', practice: 'Practicar capítulo', chapter: 'Capítulo', chapterNames: ['El puente despierta', 'El paso de las luces', 'La última puerta del viento'], goal: 'Reúne 3 glifos y entra en el portal azul.', glyph: 'Glifos', relic: 'Reliquias', time: 'Tiempo', falls: 'Rescates', sun: 'SOL', moon: 'LUNA', phase: 'Plegar cielo', jump: 'Saltar', pause: 'Pausa', paused: 'Viaje en pausa', continue: 'Continuar', restart: 'Reiniciar capítulo', menu: 'Menú del viaje', hint: 'Pista de ruta', sound: 'Sonido', lowMotion: 'Movimiento suave', keys: 'Mover: WASD / flechas · Saltar: Espacio · Plegar: E · Pausa: Esc', touchHint: 'Usa el mando de dirección, salta los huecos y cambia de mundo sobre una isla.', foldTip: 'Los puentes ámbar son sólidos en SOL; los azules, en LUNA. Los puentes pálidos no te sostienen.', checkpoint: 'Punto de control guardado', rescued: 'De vuelta en tu última isla. Conservas lo recogido.', glyphFound: '¡Glifo del alba recuperado!', relicFound: 'Reliquia secreta encontrada', nextIsland: 'Sigue el puente sólido. Si el siguiente es pálido, cambia de mundo desde una isla.', gapTip: 'El capítulo 2 añade huecos y luces rosas móviles. Salta los huecos y espera a que pase la luz.', windTip: 'El capítulo 3 añade huecos más anchos y una puerta del viento. Salta cerca del borde y sigue avanzando.', portalReady: '¡Tienes los tres glifos! Sigue hasta el portal azul de la última isla.', missing: 'El portal necesita 3 glifos. Busca diamantes ámbar en las islas 2, 4 y 5.', cleared: 'Faro restaurado', complete: 'El alba encuentra el camino a casa', next: 'Siguiente capítulo', again: 'Jugar de nuevo', share: 'Compartir viaje', resultText: 'El mensajero ha unido los tres faros. Tu viaje por el cielo está completo.', chapterText: 'Un nuevo faro brilla. El siguiente cruce te espera.', score: 'Puntos', localBest: 'Mejor en este dispositivo', gold: 'Guardián del alba', silver: 'Navegante del cielo', bronze: 'Mensajero valiente', locked: 'Completa el capítulo anterior para desbloquearlo.', saveNotice: 'El progreso se guarda en este dispositivo. Borrar los datos del navegador lo elimina.', webgl: 'Esta aventura requiere WebGL. Usa un navegador actualizado con aceleración gráfica o prueba los otros puzles de abajo.', loading: 'Preparando tu ruta celeste…', practiceLabel: 'Práctica', dailyLabel: 'Diario', campaignLabel: 'Viaje', guideTitle: 'Cómo jugar a Cloudweft Passage', faqTitle: 'Antes de tu primer vuelo',
            guide: ['Eres el mensajero de un pequeño archipiélago flotante. Sus caminos se han dividido entre SOL y LUNA. Reúne tres glifos del alba por capítulo y llévalos al portal azul de la última isla. Hay tres capítulos diseñados a mano; al completarlos puedes volver a practicarlos.', 'Muévete con WASD o las flechas, salta con Espacio y cambia de mundo con E. Arriba siempre apunta hacia el fondo de la ruta. En pantallas táctiles tienes un mando de dirección y botones para saltar y plegar el cielo. Los puentes ámbar son sólidos en SOL y los azules en LUNA. Los puentes pálidos solo muestran la ruta: no puedes pisarlos. Cambia desde una isla ancha después de mirar el color del siguiente puente.', 'El segundo capítulo añade huecos y luces rosas que patrullan. Salta los huecos y espera a que las luces pasen. El tercero incluye huecos más anchos y una suave puerta del viento. Cada isla es un punto de control. Caer te devuelve a la última isla sin perder lo recogido. No hay límite de vidas ni reintentos de pago.', 'Cada capítulo tiene cuatro reliquias verdes opcionales; dos están en la isla lateral conectada a la tercera isla principal. La puntuación parte de 2.200, suma 250 por reliquia y resta 3 por segundo activo y 100 por rescate, con un mínimo de 100. Consigues oro con las cuatro reliquias, ningún rescate y menos de 160 segundos; en otro caso, hasta tres rescates dan plata. La expedición diaria refleja la ruta algunos días y cambia la fase inicial de las luces, sin romper los caminos. Las marcas son locales y los resultados compartidos son autodeclarados.'], faq: [['¿Es un juego 3D real?', 'Sí. Las islas, los puentes y el mensajero son mallas 3D renderizadas con WebGL. Funciona en el navegador sin modelos de otros juegos.'], ['¿Qué ocurre al caer o cerrar la página?', 'Al caer vuelves a tu última isla y conservas los objetos. Continuar viaje guardado restaura el último punto guardado en este dispositivo. Un nuevo viaje sustituye la partida activa.'], ['¿Necesito ver anuncios o registrarme?', 'No. Puedes terminar todos los capítulos sin cuenta, pago ni anuncios. La ruta diaria se puede repetir. Compartir envía el resultado y un enlace; no hay clasificación en línea.']]
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
        let cameraX = 0, cameraZ = 0, cameraY = 0, jumpQueued = false, phaseQueued = false;
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
        const clearInput = () => { keys.clear(); touchKeys.clear(); jumpQueued = phaseQueued = false; document.querySelectorAll('.sf-pad button').forEach(b => b.classList.remove('pressed')); };
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
            $('sf-glyphs').textContent = state.glyphs.length + '/3'; $('sf-relics').textContent = state.relics.length + '/4';
            $('sf-time').textContent = formatTime(state.elapsed); $('sf-falls').textContent = state.falls;
            $('sf-phase-indicator').textContent = (state.phase ? '☾ ' : '☀ ') + text(state.phase ? 'moon' : 'sun');
            $('sf-phase-indicator').classList.toggle('moon', state.phase === 1);
            $('sf-phase').setAttribute('aria-label', text('phase') + ': ' + text(state.phase ? 'moon' : 'sun'));
            $('sf-phase').setAttribute('aria-pressed', String(state.phase === 1));
            const target = state.glyphs.length === 3 ? text('portalReady') : text('goal');
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
            notice(text(state.chapter === 0 ? 'foldTip' : state.chapter === 1 ? 'gapTip' : 'windTip'));
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
            notice(state.glyphs.length === 3 ? text('portalReady') : distance(state, level.portal) < 5 ? text('missing') : text('nextIsland'));
            sound('hint');
        }
        function handleEvents() {
            for (const event of state.events) {
                if (event === 'checkpoint') { notice(text('checkpoint')); persist(); }
                if (event === 'glyph') { notice(text(state.glyphs.length === 3 ? 'portalReady' : 'glyphFound')); sound('correct'); persist(); }
                if (event === 'relic') { notice(text('relicFound')); sound('combo'); persist(); }
                if (event === 'rescue') { notice(text('rescued')); sound('wrong'); persist(); }
                if (event === 'phase') sound('tap');
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
            const add = (shape, x, y, z, sx, sy, sz, color, ry = 0, opacity) => o.push({ shape, x, y, z, sx, sy, sz, color, ry, opacity });
            // Broad floating foundations, mint gardens, and our own beacon architecture.
            for (const i of level.islands) {
                add('box', i.x, i.y - .5, i.z, i.w, 1, i.d, state.phase ? '#64748b' : '#a8b6bc');
                add('box', i.x, i.y + .015, i.z, i.w - .16, .07, i.d - .16, state.phase ? '#a5b4c7' : '#dbe7df');
                add('cone', i.x, i.y - 2.0, i.z, i.w * .8, 3.2, i.d * .8, '#7c8a9d', Math.PI);
                add('box', i.x - 2, i.y + .12, i.z - 1.5, .9, .2, .9, '#86efac');
                add('cone', i.x - 2, i.y + .8, i.z - 1.5, .65, 1.3, .65, '#059669');
                add('box', i.x + 2.4, i.y + .08, i.z + 1.7, .5, .16, .6, '#86efac');
                if (i.id === state.checkpoint) add('cylinder', i.x, i.y + .025, i.z + 1, 1.1, .08, 1.1, '#86efac');
            }
            for (const b of level.bridges) {
                const on = b.phase === state.phase;
                add('box', b.x, b.y - .12, b.z, b.w, on ? .24 : .065, b.d, on ? (b.phase ? '#93c5fd' : '#fde68a') : '#9aacc4', b.ry, on ? 1 : .24);
                if (on) {
                    const dx = Math.cos(b.ry) * (b.w / 2 - .075), dz = -Math.sin(b.ry) * (b.w / 2 - .075);
                    add('box', b.x + dx, b.y + .05, b.z + dz, .08, .08, b.d, b.phase ? '#2563eb' : '#d97706', b.ry);
                    add('box', b.x - dx, b.y + .05, b.z - dz, .08, .08, b.d, b.phase ? '#2563eb' : '#d97706', b.ry);
                }
            }
            for (const g of level.glyphs) {
                if (state.glyphs.includes(g.id)) continue;
                add('cylinder', g.x, g.y - .68, g.z, 1.05, .35, 1.05, '#64748b');
                add('octa', g.x, g.y + Math.sin(t * 2) * .13, g.z, .6, 1.1, .6, '#fbbf24', t * .5);
                add('octa', g.x, g.y + .95, g.z, .18, .3, .18, '#fff7cb', -t);
            }
            for (const r of level.relics) if (!state.relics.includes(r.id))
                add('octa', r.x, r.y + Math.sin(t * 3 + r.x) * .13, r.z, .43, .55, .43, '#059669', t);
            for (const hazard of level.hazards) {
                const h = hazardAt(hazard, state.elapsed);
                add('octa', h.x, h.y, h.z, .65, .65, .65, '#f43f5e', t * 2);
                add('box', hazard.x, hazard.y - .72, hazard.z, .1, .06, 1.9, '#fca5a5');
            }
            if (level.chapter === 2) {
                const w = level.links[3];
                for (const side of [-1, 1]) add('cylinder', w.x + side * 1.8, w.y + 1.1, w.z, .16, 2.2, .16, '#c4b5fd');
                add('box', w.x, w.y + 2.25, w.z, 3.7, .15, .15, '#7c3aed');
            }
            const portal = level.portal, lit = state.glyphs.length === 3;
            for (const side of [-1, 1]) add('box', portal.x + side * 1.25, portal.y + 1.4, portal.z, .45, 2.8, .65, '#475569');
            add('box', portal.x, portal.y + 2.9, portal.z, 2.95, .42, .7, lit ? '#2563eb' : '#64748b');
            add('box', portal.x, portal.y + 1.3, portal.z, 2.1, 2.6, .08, lit ? '#38bdf8' : '#9aa7b7', 0, lit ? .55 : .18);
            // Courier: helmet, compact delivery satchel, two boots and a paper glider.
            const p = state, bob = lowMotion || !p.grounded ? 0 : Math.sin(t * 12) * (keys.size || touchKeys.size ? .04 : 0);
            const shadowSurface = level.surfaces.filter(s => active(s, p.phase) && contains(s, p.x, p.z) && s.y <= p.y + .2).sort((a, b) => b.y - a.y)[0];
            if (shadowSurface) add('cylinder', p.x, shadowSurface.y + .075, p.z, .7, .025, .7, '#334155', 0, .24);
            if (!(state.invulnerable > 0 && Math.floor(t * 8) % 2)) {
                add('box', p.x, p.y + .54 + bob, p.z, .48, .66, .4, '#f43f5e', p.facing);
                add('box', p.x, p.y + 1.03 + bob, p.z, .53, .4, .5, '#f8fafc', p.facing);
                add('box', p.x + Math.sin(p.facing) * .26, p.y + 1.06 + bob, p.z + Math.cos(p.facing) * .26, .34, .16, .055, '#2563eb', p.facing);
                add('box', p.x - Math.sin(p.facing) * .3, p.y + .6 + bob, p.z - Math.cos(p.facing) * .3, .45, .5, .23, '#d97706', p.facing);
                for (const side of [-1, 1]) add('box', p.x + Math.cos(p.facing) * .16 * side, p.y + .13, p.z - Math.sin(p.facing) * .16 * side, .19, .25, .29, '#334155', p.facing);
                if (!p.grounded) add('box', p.x, p.y + .85, p.z, 1.3, .08, .45, '#fde68a', p.facing);
            }
            // Distant scenery has no collisions and never resembles a playable bridge.
            for (let i = 0; i < 9; i++) {
                const x = (i % 2 ? -1 : 1) * (19 + i % 3 * 5), z = -i * 11;
                add('box', x, -5 - i % 3, z, 6 + i % 2 * 3, .5, 4, '#e0ebf2');
                add('cone', x, -7 - i % 3, z, 5, 3, 3, '#bacbda');
            }
            return o;
        }
        function animate(now) {
            if (!renderer) return;
            const delta = Math.min(.1, (now - (last || now)) / 1000); last = now;
            if (running && !paused && !state.won) {
                accumulator += delta;
                while (accumulator >= 1 / 60) {
                    const held = code => keys.has(code) || [...touchKeys.values()].includes(code);
                    const input = { x: Number(held('right')) - Number(held('left')), z: Number(held('down')) - Number(held('up')),
                        jump: jumpQueued, phase: phaseQueued };
                    jumpQueued = phaseQueued = false;
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
            renderer.render(objects(now), { eye: [cameraX, cameraY + 14, cameraZ + 18], target: [cameraX, cameraY, cameraZ - 7], fov: 45 });
            frame = requestAnimationFrame(animate);
        }
        const keyMap = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
        window.addEventListener('keydown', event => {
            if (event.target.closest('input, textarea, select') || !running) return;
            if (event.code === 'Escape') { event.preventDefault(); if (!event.repeat) setPause(!paused); return; }
            if (paused || state.won) return;
            if (keyMap[event.code]) { event.preventDefault(); keys.add(keyMap[event.code]); }
            if (event.code === 'Space' || event.code === 'KeyE') { event.preventDefault(); if (!event.repeat) { if (event.code === 'Space') jumpQueued = true; else phaseQueued = true; } }
        });
        window.addEventListener('keyup', e => { if (keyMap[e.code]) keys.delete(keyMap[e.code]); });
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
        $('sf-jump').addEventListener('pointerdown', e => { e.preventDefault(); if (running && !paused) jumpQueued = true; });
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
        try { renderer = new PV3D.Renderer(canvas, { clear: '#b5d8ee' }); }
        catch (_) { $('sf-error').hidden = false; $('sf-error').textContent = text('webgl'); document.querySelectorAll('#sf-menu button').forEach(b => { b.disabled = true; }); return; }
        if (typeof renderCrossPromo === 'function') renderCrossPromo('cloudweft');
        frame = requestAnimationFrame(animate);
        // Read-only snapshot for diagnostics; mutations still go through ordinary game inputs.
        window.Cloudweft.inspect = () => ({ state: JSON.parse(JSON.stringify(state)), mode, running, paused, results: results.slice() });
    }
    function formatTime(seconds) { const s = Math.floor(seconds); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    return { createLevel, createState, contains, active, hazardAt, step, rescue, score, medal, seedForDate, normalizeProgress, normalizeResults, serialize, restore, COPY, boot };
});

