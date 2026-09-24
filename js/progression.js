/* PuzzleVault — local player progress. No account or personal data required. */
(function (root) {
    'use strict';

    const STORAGE_KEY = 'pv_player_progress';
    const GAMES = ['numvault', 'gridsmash', 'patternpop', 'sortstack', 'quickcalc',
        'tileturn', 'colorflow', 'pipelink', 'mergechain', 'hexmatch'];
    const MISSION_IDS = ['rounds', 'explorer', 'daily'];
    const BADGE_IDS = ['first_round', 'explorer', 'streak_3', 'century'];
    const ROUND_XP = 20;
    const DAILY_ROUND_XP = 400;
    const MISSION_XP = 40;
    const LEVEL_XP = 200;
    const MAX_COUNT = 1000000000;
    const MAX_ROUND_IDS = 128;
    let memory = null;
    let storageUnavailable = false;

    function count(value, max = MAX_COUNT) {
        return typeof value === 'number' && Number.isFinite(value)
            ? Math.min(max, Math.max(0, Math.floor(value))) : 0;
    }

    function dateKey() {
        return new Date().toISOString().slice(0, 10);
    }

    function validDate(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
        const date = new Date(value + 'T00:00:00Z');
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
    }

    function uniqueGames(value) {
        return Array.isArray(value) ? GAMES.filter(id => value.includes(id)) : [];
    }

    function freshDay(today) {
        return { date: today, rounds: 0, games: [], roundXP: 0, claimed: [], roundIds: [] };
    }

    function cleanState(raw, today) {
        const value = raw && raw.version === 1 ? raw : {};
        const day = value.day && value.day.date === today ? value.day : freshDay(today);
        const lastDate = validDate(value.lastDate);
        return {
            version: 1,
            xp: count(value.xp),
            totalRounds: count(value.totalRounds),
            games: uniqueGames(value.games),
            streak: count(value.streak),
            bestStreak: count(value.bestStreak),
            lastDate: lastDate <= today ? lastDate : '',
            lastGame: GAMES.includes(value.lastGame) ? value.lastGame : null,
            day: {
                date: today,
                rounds: count(day.rounds),
                games: uniqueGames(day.games),
                roundXP: count(day.roundXP, DAILY_ROUND_XP),
                claimed: Array.isArray(day.claimed) ? MISSION_IDS.filter(id => day.claimed.includes(id)) : [],
                roundIds: Array.isArray(day.roundIds) ? day.roundIds.filter(id => typeof id === 'string' && id.length <= 180).slice(-MAX_ROUND_IDS) : []
            }
        };
    }

    function readState(today) {
        if (!storageUnavailable) {
            try {
                const saved = root.localStorage.getItem(STORAGE_KEY);
                // Storage is bounded; discard unexpected large or damaged values.
                memory = saved && saved.length <= 40000 ? JSON.parse(saved) : null;
            } catch (error) {
                // Private browsing and malformed data must never block a game.
                // Keep in-memory progress if persistence is unavailable.
            }
        }
        memory = cleanState(memory, today);
        return memory;
    }

    function saveState(state) {
        memory = state;
        if (storageUnavailable) return;
        try {
            root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            storageUnavailable = true;
        }
    }

    function getDailyGame(today = dateKey()) {
        // UTC day index gives every player the same daily spotlight.
        const day = Math.floor(Date.parse(today + 'T00:00:00Z') / 86400000);
        return GAMES[((day % GAMES.length) + GAMES.length) % GAMES.length];
    }

    function missions(state) {
        return [
            { id: 'rounds', progress: Math.min(state.day.rounds, 3), target: 3 },
            { id: 'explorer', progress: Math.min(state.day.games.length, 2), target: 2 },
            { id: 'daily', progress: state.day.games.includes(getDailyGame(state.day.date)) ? 1 : 0, target: 1 }
        ].map(mission => ({ ...mission, completed: mission.progress >= mission.target, xp: MISSION_XP }));
    }

    function badges(state) {
        const unlocked = [state.totalRounds >= 1, state.games.length >= 5,
            state.bestStreak >= 3, state.totalRounds >= 100];
        return BADGE_IDS.map((id, index) => ({ id, unlocked: unlocked[index] }));
    }

    function snapshot(state, today) {
        const yesterday = new Date(Date.parse(today + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
        return {
            xp: state.xp,
            level: 1 + Math.floor(state.xp / LEVEL_XP),
            levelXP: state.xp % LEVEL_XP,
            nextLevelXP: LEVEL_XP,
            streak: state.lastDate === today || state.lastDate === yesterday ? state.streak : 0,
            todayRounds: state.day.rounds,
            todayGames: state.day.games.slice(),
            missions: missions(state),
            badges: badges(state),
            lastGame: state.lastGame,
            dailyGame: getDailyGame(today),
            totalRounds: state.totalRounds
        };
    }

    function getSnapshot() {
        const today = dateKey();
        return snapshot(readState(today), today);
    }

    /**
     * Record a completed run (wins and losses both count). Scores never affect XP.
     * Optional roundId deduplicates recent completions within the current UTC day.
     * Round XP stops after 20 runs/day; the three daily missions award 40 XP each.
     */
    function recordRound(gameId, score, options = {}) {
        if (!GAMES.includes(gameId)) return null;
        const today = dateKey();
        const state = readState(today);
        const before = snapshot(state, today);
        const settings = options && typeof options === 'object' ? options : {};
        const roundId = typeof settings.roundId === 'string' && settings.roundId.length > 0 && settings.roundId.length <= 160
            ? gameId + ':' + settings.roundId : null;
        if (roundId && state.day.roundIds.includes(roundId)) {
            return { gameId, duplicate: true, xpEarned: 0, roundXP: 0, missionXP: 0,
                completedMissions: [], newBadges: [], leveledUp: false, snapshot: before };
        }

        if (state.lastDate !== today) {
            const yesterday = new Date(Date.parse(today + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
            state.streak = state.lastDate === yesterday ? count(state.streak + 1) : 1;
            state.bestStreak = Math.max(state.bestStreak, state.streak);
            state.lastDate = today;
        }
        state.lastGame = gameId;
        state.totalRounds = count(state.totalRounds + 1);
        state.day.rounds = count(state.day.rounds + 1);
        if (!state.games.includes(gameId)) state.games.push(gameId);
        if (!state.day.games.includes(gameId)) state.day.games.push(gameId);
        if (roundId) state.day.roundIds = state.day.roundIds.concat(roundId).slice(-MAX_ROUND_IDS);

        const roundXP = Math.min(ROUND_XP, DAILY_ROUND_XP - state.day.roundXP);
        state.day.roundXP += roundXP;
        const completedMissions = missions(state).filter(mission => mission.completed && !state.day.claimed.includes(mission.id)).map(mission => mission.id);
        state.day.claimed.push(...completedMissions);
        const missionXP = completedMissions.length * MISSION_XP;
        const previousXP = state.xp;
        state.xp = count(state.xp + roundXP + missionXP);
        saveState(state);

        const after = snapshot(state, today);
        const detail = {
            gameId,
            score: count(score),
            duplicate: false,
            xpEarned: state.xp - previousXP,
            roundXP,
            missionXP,
            completedMissions,
            newBadges: after.badges.filter(badge => badge.unlocked && !before.badges.find(old => old.id === badge.id).unlocked).map(badge => badge.id),
            leveledUp: after.level > before.level,
            snapshot: after
        };
        root.dispatchEvent(new CustomEvent('pv:progress', { detail }));
        if (typeof root.gtag === 'function') {
            try {
                // Send only the game category and earned XP; no player identifiers.
                root.gtag('event', 'puzzle_complete', { game_id: gameId, xp_earned: detail.xpEarned });
            } catch (error) { /* Optional analytics must never interrupt play. */ }
        }
        return detail;
    }

    root.PVProgress = Object.freeze({ getSnapshot, recordRound, getDailyGame });
})(window);
