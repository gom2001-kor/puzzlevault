const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/progression.js'), 'utf8');
const common = fs.readFileSync(path.join(__dirname, '../js/common.js'), 'utf8');
const KEY = 'pv_player_progress';
const GAMES = ['numvault', 'gridsmash', 'patternpop', 'sortstack', 'quickcalc',
    'tileturn', 'colorflow', 'pipelink', 'mergechain', 'hexmatch', 'mosslight', 'cloudweft'];

function fixture(options = {}) {
    let now = new Date(options.date || '2026-09-24T12:00:00Z');
    const data = options.data || new Map();
    const events = [];
    const analytics = [];
    const localStorage = options.storage || {
        getItem(key) { return data.has(key) ? data.get(key) : null; },
        setItem(key, value) { data.set(key, String(value)); }
    };
    class ClockDate extends Date {
        constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
        static now() { return now.getTime(); }
    }
    const context = vm.createContext({
        Date: ClockDate,
        localStorage,
        CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
        dispatchEvent(event) { events.push(event); },
        document: { addEventListener() {} },
        gtag: options.analytics ? (...args) => analytics.push(args) : undefined
    });
    context.window = context;
    vm.runInContext(source, context);
    if (options.common) vm.runInContext(common, context);
    return { progress: context.PVProgress, context, events, analytics, data,
        setDate(date) { now = new Date(date); } };
}

test('new player snapshot is empty and the featured game is deterministic for a UTC day', () => {
    const first = fixture({ date: '2026-09-24T00:00:00Z' });
    const second = fixture({ date: '2026-09-24T23:59:59Z' });
    const snapshot = first.progress.getSnapshot();
    assert.equal(snapshot.xp, 0);
    assert.equal(snapshot.level, 1);
    assert.equal(snapshot.levelXP, 0);
    assert.equal(snapshot.nextLevelXP, 200);
    assert.equal(snapshot.streak, 0);
    assert.equal(snapshot.todayRounds, 0);
    assert.equal(snapshot.lastGame, null);
    assert.equal(snapshot.missions.length, 3);
    assert.equal(snapshot.badges.length, 4);
    assert.ok(GAMES.includes(first.progress.getDailyGame()));
    assert.equal(first.progress.getDailyGame(), second.progress.getDailyGame());
    second.setDate('2026-09-25T00:00:00Z');
    assert.notEqual(first.progress.getDailyGame(), second.progress.getDailyGame());
});

test('daily missions award once, XP levels advance, and rewards survive reloads', () => {
    const f = fixture();
    const featured = f.progress.getDailyGame();
    const other = GAMES.find(id => id !== featured);
    const first = f.progress.recordRound(featured, 100, { roundId: 'one' });
    assert.equal(first.xpEarned, 60);
    assert.deepEqual(Array.from(first.completedMissions), ['daily']);
    assert.deepEqual(Array.from(first.newBadges), ['first_round']);
    const duplicate = f.progress.recordRound(featured, 100, { roundId: 'one' });
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.xpEarned, 0);
    assert.equal(f.events.length, 1);
    const second = f.progress.recordRound(other, 500);
    assert.deepEqual(Array.from(second.completedMissions), ['explorer']);
    const third = f.progress.recordRound(featured, 0);
    assert.deepEqual(Array.from(third.completedMissions), ['rounds']);
    assert.equal(third.snapshot.xp, 180);
    const reloaded = fixture({ data: f.data });
    const fourth = reloaded.progress.recordRound(featured, 0);
    assert.equal(fourth.xpEarned, 20);
    assert.equal(fourth.leveledUp, true);
    assert.equal(fourth.snapshot.level, 2);
    assert.equal(fourth.snapshot.levelXP, 0);
    assert.ok(fourth.snapshot.missions.every(mission => mission.completed));
    assert.equal(reloaded.progress.recordRound(featured, 0, { roundId: 'one' }).duplicate, true);
});

test('daily XP is capped while progress, lifetime badges, and bounded storage keep working', () => {
    const f = fixture();
    for (let index = 0; index < 300; index++) {
        f.progress.recordRound(GAMES[index % GAMES.length], index * 10000, { roundId: 'round-' + index });
    }
    const snapshot = f.progress.getSnapshot();
    assert.equal(snapshot.xp, 520);
    assert.equal(snapshot.todayRounds, 300);
    assert.equal(snapshot.totalRounds, 300);
    assert.equal(snapshot.todayGames.length, 12);
    assert.ok(snapshot.badges.find(badge => badge.id === 'explorer').unlocked);
    assert.ok(snapshot.badges.find(badge => badge.id === 'century').unlocked);
    const saved = f.data.get(KEY);
    assert.ok(saved.length < 40000);
    assert.equal(JSON.parse(saved).day.roundIds.length, 128);
    assert.equal(f.progress.recordRound('numvault', Number.MAX_VALUE).xpEarned, 0);
});

test('UTC rollover resets missions and daily XP, carries yesterday streak, and expires gaps', () => {
    const f = fixture({ date: '2026-09-24T23:59:59.999Z' });
    f.progress.recordRound(f.progress.getDailyGame(), 10);
    assert.equal(f.progress.getSnapshot().streak, 1);
    f.setDate('2026-09-25T00:00:00Z');
    assert.equal(f.progress.getSnapshot().todayRounds, 0);
    assert.equal(f.progress.getSnapshot().streak, 1);
    assert.ok(f.progress.getSnapshot().missions.every(mission => !mission.completed));
    assert.equal(f.progress.recordRound(f.progress.getDailyGame(), 10).xpEarned, 60);
    assert.equal(f.progress.getSnapshot().streak, 2);
    f.setDate('2026-09-26T08:00:00Z');
    const thirdDay = f.progress.recordRound('quickcalc', 10);
    assert.equal(thirdDay.snapshot.streak, 3);
    assert.deepEqual(Array.from(thirdDay.newBadges), ['streak_3']);
    f.setDate('2026-09-28T08:00:00Z');
    assert.equal(f.progress.getSnapshot().streak, 0);
    const afterGap = f.progress.recordRound('quickcalc', 10);
    assert.equal(afterGap.snapshot.streak, 1);
    assert.ok(afterGap.snapshot.badges.find(badge => badge.id === 'streak_3').unlocked);
});

test('malformed, unexpected, and oversized saved data fail safely', () => {
    for (const value of ['{bad json', 'null', '42', '[]', 'x'.repeat(40001),
        JSON.stringify({ version: 1, xp: -1, totalRounds: 'bad', games: {}, streak: -100,
            lastDate: '2026-09-99', lastGame: '__proto__', day: { date: '2026-09-24', rounds: -10, games: ['unknown'], claimed: {}, roundIds: {} } })]) {
        const f = fixture({ data: new Map([[KEY, value]]) });
        assert.equal(f.progress.getSnapshot().xp, 0);
        assert.equal(f.progress.getSnapshot().todayRounds, 0);
        const result = f.progress.recordRound('numvault', 10);
        assert.equal(result.snapshot.totalRounds, 1);
        assert.ok(Number.isFinite(result.snapshot.xp));
    }
});

test('private storage and exhausted quota keep playable in-memory progress', () => {
    for (const blockedReads of [true, false]) {
        const f = fixture({ storage: {
            getItem() { if (blockedReads) throw new Error('blocked'); return null; },
            setItem() { throw new Error('quota'); }
        } });
        f.progress.recordRound('numvault', 1);
        f.progress.recordRound('quickcalc', 2);
        assert.equal(f.progress.getSnapshot().todayRounds, 2);
        assert.equal(f.progress.getSnapshot().todayGames.length, 2);
        f.setDate('2026-09-25T00:00:00Z');
        assert.equal(f.progress.getSnapshot().todayRounds, 0);
        assert.equal(f.progress.recordRound('numvault', 10).snapshot.streak, 2);
    }
});

test('invalid games cannot earn XP; optional analytics contain only categorical game and earned XP', () => {
    const f = fixture({ analytics: true });
    assert.equal(f.progress.recordRound('__proto__', 1000), null);
    assert.equal(f.progress.recordRound('not-a-game', 1000), null);
    assert.equal(f.events.length, 0);
    f.progress.recordRound('numvault', 1, { roundId: 'private-id', mode: 'personal text' });
    assert.equal(f.events[0].type, 'pv:progress');
    assert.equal(f.analytics[0][0], 'event');
    assert.equal(f.analytics[0][1], 'puzzle_complete');
    assert.deepEqual(Object.keys(f.analytics[0][2]).sort(), ['game_id', 'xp_earned']);
    f.context.gtag = () => { throw new Error('analytics blocked'); };
    assert.doesNotThrow(() => f.progress.recordRound('numvault', 1));
});

test('shared stats records each completion once and preserves higher-is-better records', () => {
    const f = fixture({ common: true, data: new Map([
        ['pv_numvault_best', '200'], ['pv_best_scores', '{bad json'],
        ['pv_total_games', 'NaN'], ['pv_total_score', 'undefined']
    ]) });
    f.context.updateStats('numvault', 100, { roundId: 'game-1' });
    f.context.updateStats('numvault', 100, { roundId: 'game-1' });
    assert.equal(f.context.getStats().totalGames, 1);
    assert.equal(f.progress.getSnapshot().totalRounds, 1);
    assert.equal(f.data.get('pv_numvault_best'), '200');
    f.context.updateStats('numvault', 300);
    assert.equal(f.context.getStats().bestScores.numvault, 300);
    assert.equal(f.data.get('pv_numvault_best'), '300');
    assert.equal(f.context.getStats().totalScore, 400);
});

test('shared stats remains usable when persistence fails', () => {
    const f = fixture({ common: true, storage: {
        getItem() { return null; },
        setItem() { throw new Error('quota'); }
    } });
    f.context.updateStats('numvault', 10);
    f.context.updateStats('numvault', 20);
    assert.equal(f.context.getStats().totalGames, 2);
    assert.equal(f.context.getStats().totalScore, 30);
    assert.equal(f.progress.getSnapshot().totalRounds, 2);
});
