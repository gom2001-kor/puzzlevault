/* Discovery UI for the shared progression engine. No account or remote storage. */
(function () {
    'use strict';
    const categories = {
        quick: ['quickcalc', 'patternpop', 'numvault'],
        logic: ['numvault', 'sortstack', 'tileturn', 'pipelink'],
        relax: ['colorflow', 'mergechain', 'hexmatch', 'gridsmash'],
        adventure: ['mosslight', 'cloudweft']
    };
    const badgeIcons = { first_round: '🌱', explorer: '🧭', streak_3: '🔥', century: '💎' };
    let activeFilter = 'all';
    let celebrationTimer;
    let shownDate;
    const isHome = () => Boolean(document.getElementById('arcade-missions'));
    const t = (key, replacements) => {
        if (typeof I18n === 'undefined') return key;
        return I18n.t('arcade.' + key, replacements);
    };
    const safe = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const homeURL = () => typeof getLocalizedPath === 'function' ? getLocalizedPath('/') : '/';
    const game = id => typeof PV_GAMES !== 'undefined' ? PV_GAMES[id] : null;
    const gameName = id => typeof getGameName === 'function' ? getGameName(id) : (game(id) || {}).name || id;
    const gameURL = href => typeof getLocalizedGamePath === 'function' ? getLocalizedGamePath(href) : href;
    const track = (event, data) => { if (typeof window.gtag === 'function') window.gtag('event', event, data); };

    function renderMissions(snapshot) {
        const container = document.getElementById('arcade-missions');
        if (!container) return;
        const daily = game(snapshot.dailyGame);
        const icons = { rounds: '⚡', explorer: '🧭', daily: daily ? daily.emoji : '🎯' };
        container.innerHTML = snapshot.missions.map(mission => {
            const href = mission.id === 'daily' && daily ? gameURL(daily.path) : mission.id === 'rounds' ? gameURL('/games/quickcalc.html?mode=blitz') : '#games';
            return `<a class="arcade-mission" href="${href}">
                <span class="arcade-mission-icon" aria-hidden="true">${mission.completed ? '✓' : icons[mission.id]}</span>
                <span class="arcade-mission-copy"><strong>${safe(t('mission_' + mission.id, { game: daily ? gameName(snapshot.dailyGame) : '' }))}</strong>
                <small>${safe(mission.completed ? t('completed') : t('missionProgress', { count: mission.progress, total: mission.target }))}</small>
                <progress class="arcade-meter" value="${mission.progress}" max="${mission.target}" aria-label="${safe(t('mission_' + mission.id, { game: daily ? gameName(snapshot.dailyGame) : '' }))}"></progress></span>
                <span class="arcade-mission-reward">${mission.completed ? '✓' : '+' + mission.xp + ' XP'}</span>
            </a>`;
        }).join('');
    }

    function renderPassport(snapshot) {
        const container = document.getElementById('arcade-passport');
        if (!container) return;
        container.innerHTML = `<div class="arcade-passport-head"><span class="arcade-level-icon" aria-hidden="true">✦</span><div><h3>${safe(t('passport'))}</h3><small>${safe(t('level', { level: snapshot.level }))} · ${snapshot.xp.toLocaleString()} XP</small></div></div>
            <progress class="arcade-meter" value="${snapshot.levelXP}" max="${snapshot.nextLevelXP}" aria-label="${safe(t('levelProgress'))}"></progress>
            <div class="arcade-xp-line"><span>${snapshot.levelXP} / ${snapshot.nextLevelXP} XP</span><span>${safe(t('nextLevel', { level: snapshot.level + 1 }))}</span></div>
            <div class="arcade-passport-bottom"><span>🔥 <strong>${snapshot.streak}</strong> ${safe(t('days'))}</span><span>🎮 <strong>${snapshot.todayRounds}</strong> ${safe(t('roundsToday'))}</span></div>
            <div class="arcade-badges">${snapshot.badges.map(badge => `<span class="arcade-badge ${badge.unlocked ? 'unlocked' : ''}" role="img" aria-label="${safe(t('badge_' + badge.id) + ' · ' + t(badge.unlocked ? 'unlocked' : 'locked'))}" title="${safe(t('badge_' + badge.id) + ' · ' + t(badge.unlocked ? 'unlocked' : 'locked'))}">${badgeIcons[badge.id] || '★'}</span>`).join('')}</div>
            <small class="arcade-local-note">${safe(t('localNote'))}</small>`;
        const resume = document.getElementById('arcade-resume');
        const last = game(snapshot.lastGame);
        if (resume) {
            resume.hidden = !last;
            resume.style.display = last ? '' : 'none';
            if (last) resume.innerHTML = `<span>${safe(t('welcomeBack'))}</span><a href="${gameURL(last.path)}">${last.emoji} ${safe(t('continueGame', { game: gameName(snapshot.lastGame) }))} →</a>`;
        }
    }

    function renderGameProgress(snapshot) {
        const panel = document.getElementById('arcade-game-progress');
        if (!panel) return;
        const complete = snapshot.missions.filter(m => m.completed).length;
        panel.innerHTML = `<div class="arcade-game-progress-summary"><strong>✦ ${safe(t('level', { level: snapshot.level }))}</strong><span>${snapshot.xp.toLocaleString()} XP</span><span>${safe(t('missionsDone', { count: complete }))}</span><a href="${homeURL()}#daily-hub">${safe(t('viewMissions'))} →</a></div>
            <progress class="arcade-meter" value="${snapshot.levelXP}" max="${snapshot.nextLevelXP}" aria-label="${safe(t('levelProgress'))}"></progress>`;
    }

    function applyFilter() {
        document.querySelectorAll('.arcade-filter').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter)));
        document.querySelectorAll('#all-games-grid .game-card-link').forEach(card => {
            const id = (card.getAttribute('href') || '').split('/').pop().split('.')[0];
            card.hidden = activeFilter !== 'all' && !(categories[activeFilter] || []).includes(id);
        });
    }

    function render() {
        if (!window.PVProgress) return;
        const snapshot = window.PVProgress.getSnapshot();
        shownDate = new Date().toISOString().slice(0, 10);
        renderMissions(snapshot);
        renderPassport(snapshot);
        renderGameProgress(snapshot);
        applyFilter();
        updateClock();
    }

    function updateClock() {
        const node = document.getElementById('arcade-reset');
        if (!node) return;
        const now = new Date();
        if (shownDate && shownDate !== now.toISOString().slice(0, 10)) { render(); return; }
        const seconds = Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime()) / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor(seconds % 3600 / 60);
        node.textContent = t('reset', { time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` });
        node.title = t('resetUTC');
    }

    function celebrate(detail) {
        if (!detail || !detail.xpEarned) return;
        const prior = document.querySelector('.arcade-celebration');
        if (prior) prior.remove();
        clearTimeout(celebrationTimer);
        const toast = document.createElement('div');
        toast.className = 'arcade-celebration';
        toast.setAttribute('role', 'status');
        toast.textContent = detail.leveledUp ? `✦ ${t('levelUp', { level: detail.snapshot.level })}  +${detail.xpEarned} XP` : `✦ +${detail.xpEarned} XP${detail.completedMissions.length ? ' · ' + t('missionComplete') : ' · ' + t('niceRound')}`;
        document.body.appendChild(toast);
        celebrationTimer = setTimeout(() => toast.remove(), 4000);
    }

    function init() {
        if (!isHome()) {
            const crossPromo = document.querySelector('.cross-promo');
            if (crossPromo && !document.getElementById('arcade-game-progress')) {
                const panel = document.createElement('aside');
                panel.id = 'arcade-game-progress';
                panel.className = 'arcade-game-progress';
                crossPromo.before(panel);
            }
        }
        document.querySelectorAll('.arcade-filter').forEach(button => button.addEventListener('click', () => {
            activeFilter = button.dataset.filter;
            applyFilter();
        }));
        document.querySelectorAll('.arcade-choice').forEach(button => button.addEventListener('click', () => {
            const correct = button.dataset.answer === '56';
            document.querySelectorAll('.arcade-choice').forEach(other => other.classList.remove('is-correct', 'is-wrong'));
            button.classList.add(correct ? 'is-correct' : 'is-wrong');
            document.getElementById('arcade-preview-feedback').textContent = t(correct ? 'previewCorrect' : 'previewWrong');
            if (correct) document.getElementById('arcade-answer').textContent = '56';
        }));
        document.querySelectorAll('[data-arcade-start]').forEach(link => link.addEventListener('click', () => track('challenge_start_click', { source: 'home', game_id: 'quickcalc', mode: 'blitz' })));
        const share = document.getElementById('arcade-share');
        if (share) share.addEventListener('click', () => {
            const snapshot = window.PVProgress.getSnapshot();
            const completed = snapshot.missions.filter(m => m.completed).length;
            if (typeof shareResult === 'function') shareResult(`🧩 PuzzleVault\n${snapshot.missions.map(m => m.completed ? '🟩' : '⬜').join('')} ${t('missionsDone', { count: completed })}\n${t('level', { level: snapshot.level })} · ${snapshot.xp} XP\n${t('shareInvite')}\nhttps://puzzlevault.pages.dev/games/quickcalc.html?mode=blitz`);
        });
        render();
        if (isHome()) setInterval(() => { if (!document.hidden) updateClock(); }, 30000);
    }
    document.addEventListener('DOMContentLoaded', init);
    window.addEventListener('pvReady', () => {
        // These cards are initially created before async translations have loaded.
        if (isHome() && typeof renderLandingCards === 'function') renderLandingCards();
        render();
    });
    window.addEventListener('langchange', () => queueMicrotask(render));
    window.addEventListener('pv:progress', event => { render(); celebrate(event.detail); });
    window.addEventListener('storage', event => { if (!event.key || event.key.startsWith('pv_')) render(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
}());
