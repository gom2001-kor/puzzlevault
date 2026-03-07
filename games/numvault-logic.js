/* ===================================================
   NumVault — Game Logic (numvault-logic.js)
   Number deduction puzzle game
   =================================================== */

/* === DIFFICULTY CONFIGS === */
const DIFFICULTIES = {
    easy: { digits: 3, maxAttempts: 8, allowDuplicates: false, label: 'Easy', multiplier: 1.0 },
    medium: { digits: 4, maxAttempts: 6, allowDuplicates: false, label: 'Medium', multiplier: 1.5 },
    hard: { digits: 4, maxAttempts: 6, allowDuplicates: true, label: 'Hard', multiplier: 2.0 },
    expert: { digits: 5, maxAttempts: 8, allowDuplicates: true, label: 'Expert', multiplier: 3.0 },
};

/* === GAME STATE === */
let G = {};
function resetState() {
    if (G && G.speedInterval !== null) clearInterval(G.speedInterval);
    G = {
        mode: 'daily', // daily | free | speed
        difficulty: { ...DIFFICULTIES.medium },
        diffKey: 'medium',
        code: [],
        guesses: [],
        feedback: [],
        currentInput: [],
        gameState: 'playing', // playing | won | lost
        tracker: Array(10).fill('unused'), // unused | included | confirmed | excluded
        hintsUsed: 0,
        maxHints: 1,
        startTime: 0,
        endTime: 0,
        // Speed mode
        speedTimer: 60,
        speedScore: 0,
        speedSolved: 0,
        speedInterval: null,
    };
}

/* === CODE GENERATION === */
function generateCode(diff, seed) {
    const rng = seed != null ? new SeededRandom(seed) : null;
    const code = [];
    const digits = diff.digits;
    if (diff.allowDuplicates) {
        for (let i = 0; i < digits; i++) {
            code.push(rng ? rng.nextInt(0, 9) : Math.floor(Math.random() * 10));
        }
    } else {
        const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        const shuffled = rng ? rng.shuffle(pool) : pool.sort(() => Math.random() - 0.5);
        for (let i = 0; i < digits; i++) code.push(shuffled[i]);
    }
    return code;
}

/* === EVALUATE GUESS (exact priority rules) === */
function evaluateGuess(guess, code) {
    const fb = Array(code.length).fill('gray');
    const codeUsed = Array(code.length).fill(false);
    const guessUsed = Array(guess.length).fill(false);
    // Step 1: exact matches → green
    for (let i = 0; i < code.length; i++) {
        if (guess[i] === code[i]) {
            fb[i] = 'green';
            codeUsed[i] = true;
            guessUsed[i] = true;
        }
    }
    // Step 2: wrong position → yellow (count-limited)
    for (let i = 0; i < guess.length; i++) {
        if (guessUsed[i]) continue;
        for (let j = 0; j < code.length; j++) {
            if (codeUsed[j]) continue;
            if (guess[i] === code[j]) {
                fb[i] = 'yellow';
                codeUsed[j] = true;
                break;
            }
        }
    }
    return fb;
}

/* === UPDATE TRACKER === */
function updateTracker(guess, feedback) {
    for (let i = 0; i < guess.length; i++) {
        const d = guess[i];
        const fb = feedback[i];
        const cur = G.tracker[d];
        if (fb === 'green') {
            G.tracker[d] = 'confirmed';
        } else if (fb === 'yellow' && cur !== 'confirmed') {
            G.tracker[d] = 'included';
        } else if (fb === 'gray' && cur === 'unused') {
            G.tracker[d] = 'excluded';
        }
    }
}

/* === SCORING === */
function calcScore() {
    const used = G.guesses.length;
    const max = G.difficulty.maxAttempts;
    const elapsed = (G.endTime - G.startTime) / 1000;
    let score = 1000 * (max - used + 1);
    // Speed bonus: under 30 seconds → ×1.5
    if (elapsed < 30) score = Math.round(score * 1.5);
    // No-hint bonus: ×1.2
    if (G.hintsUsed === 0) score = Math.round(score * 1.2);
    return Math.max(0, score);
}

/* === LOCAL STORAGE HELPERS === */
function loadStats() {
    return JSON.parse(localStorage.getItem('pv_numvault_stats') || '{"played":0,"won":0,"bestStreak":0}');
}
function saveStats(won) {
    const s = loadStats();
    s.played++;
    if (won) s.won++;
    const streak = parseInt(localStorage.getItem('pv_numvault_streak') || '0');
    if (streak > s.bestStreak) s.bestStreak = streak;
    localStorage.setItem('pv_numvault_stats', JSON.stringify(s));
}
function loadDist() {
    return JSON.parse(localStorage.getItem('pv_numvault_distribution') || '{}');
}
function saveDist(attempts) {
    const d = loadDist();
    d[attempts] = (d[attempts] || 0) + 1;
    localStorage.setItem('pv_numvault_distribution', JSON.stringify(d));
}
function isDailyDone() {
    const today = getTodayUTC();
    return localStorage.getItem('pv_numvault_daily_' + today) != null;
}
function saveDailyResult(won, attempts) {
    const today = getTodayUTC();
    localStorage.setItem('pv_numvault_daily_' + today, JSON.stringify({ won, attempts, date: today }));
}

/* === RENDER GRID === */
function renderGrid() {
    const grid = document.getElementById('nv-grid');
    grid.innerHTML = '';
    const { digits, maxAttempts } = G.difficulty;
    for (let r = 0; r < maxAttempts; r++) {
        const row = document.createElement('div');
        row.className = 'nv-row';
        for (let c = 0; c < digits; c++) {
            const cell = document.createElement('div');
            cell.className = 'nv-cell';
            cell.id = `nv-c-${r}-${c}`;
            // Submitted guess
            if (r < G.guesses.length) {
                cell.textContent = G.guesses[r][c];
                const fb = G.feedback[r][c];
                cell.classList.add(fb === 'green' ? 'green' : fb === 'yellow' ? 'yellow' : 'gray');
            } else if (r === G.guesses.length) {
                // Current input row
                if (c < G.currentInput.length) {
                    cell.textContent = G.currentInput[c];
                    cell.classList.add('filled');
                }
                if (c === G.currentInput.length) cell.classList.add('active');
            }
            row.appendChild(cell);
        }
        grid.appendChild(row);
    }
}

/* === RENDER TRACKER === */
function renderTracker() {
    const wrap = document.getElementById('nv-tracker');
    wrap.innerHTML = '';
    for (let d = 0; d < 10; d++) {
        const t = document.createElement('div');
        t.className = 'nv-track';
        t.id = 'nv-t-' + d;
        const st = G.tracker[d];
        if (st === 'confirmed') t.classList.add('t-green');
        else if (st === 'included') t.classList.add('t-yellow');
        else if (st === 'excluded') t.classList.add('t-gray');
        t.innerHTML = `<span>${d}</span><span class="nv-track-num">${st === 'unused' ? '?' : st === 'confirmed' ? '✓' : st === 'included' ? '~' : '✕'}</span>`;
        wrap.appendChild(t);
    }
}

/* === RENDER NUMPAD === */
function renderNumpad() {
    const pad = document.getElementById('nv-numpad');
    pad.innerHTML = '';
    for (let d = 1; d <= 9; d++) {
        const btn = document.createElement('button');
        btn.className = 'nv-key';
        btn.textContent = d;
        btn.onclick = () => inputDigit(d);
        pad.appendChild(btn);
    }
    // Row 2: hint, 0, backspace, enter
    const hint = document.createElement('button');
    hint.className = 'nv-key key-hint';
    hint.textContent = '💡';
    hint.id = 'nv-hint-btn';
    hint.onclick = useHint;
    pad.appendChild(hint);

    const z = document.createElement('button');
    z.className = 'nv-key';
    z.textContent = '0';
    z.onclick = () => inputDigit(0);
    pad.appendChild(z);

    const del = document.createElement('button');
    del.className = 'nv-key key-del';
    del.textContent = '⌫';
    del.onclick = inputBackspace;
    pad.appendChild(del);

    const ent = document.createElement('button');
    ent.className = 'nv-key key-enter';
    ent.textContent = 'Enter';
    ent.onclick = submitGuess;
    pad.appendChild(ent);

    updateHintBtn();
}

function updateHintBtn() {
    const btn = document.getElementById('nv-hint-btn');
    if (btn) btn.disabled = G.hintsUsed >= G.maxHints || G.gameState !== 'playing';
}

/* === INPUT HANDLING === */
function inputDigit(d) {
    if (G.gameState !== 'playing') return;
    if (G.currentInput.length >= G.difficulty.digits) return;
    G.currentInput.push(d);
    SFX.play('tap');
    renderGrid();
}
function inputBackspace() {
    if (G.gameState !== 'playing' || G.currentInput.length === 0) return;
    G.currentInput.pop();
    renderGrid();
}

/* === SUBMIT GUESS === */
function submitGuess() {
    if (G.gameState !== 'playing') return;
    if (G.currentInput.length !== G.difficulty.digits) {
        animateShake();
        SFX.play('wrong');
        return;
    }
    const guess = [...G.currentInput];
    const fb = evaluateGuess(guess, G.code);
    G.guesses.push(guess);
    G.feedback.push(fb);
    G.currentInput = [];
    updateTracker(guess, fb);

    // Animate flip
    animateFlip(G.guesses.length - 1, fb, () => {
        renderTracker();
        // Check win
        if (fb.every(f => f === 'green')) {
            G.gameState = 'won';
            G.endTime = Date.now();
            onGameEnd(true);
        } else if (G.guesses.length >= G.difficulty.maxAttempts) {
            G.gameState = 'lost';
            G.endTime = Date.now();
            onGameEnd(false);
        } else {
            renderGrid();
            updateHintBtn();
        }
    });
}

/* === FLIP ANIMATION === */
function animateFlip(rowIdx, fb, callback) {
    const digits = G.difficulty.digits;
    const row = G.guesses[rowIdx];
    for (let c = 0; c < digits; c++) {
        const cell = document.getElementById(`nv-c-${rowIdx}-${c}`);
        if (!cell) continue;
        cell.textContent = row[c];
        cell.classList.remove('active', 'filled');
        setTimeout(() => {
            cell.classList.add('flip');
            setTimeout(() => {
                const cls = fb[c] === 'green' ? 'green' : fb[c] === 'yellow' ? 'yellow' : 'gray';
                cell.classList.add(cls);
            }, 250);
        }, c * 150);
    }
    setTimeout(() => {
        if (callback) callback();
    }, digits * 150 + 500);
}

/* === SHAKE ANIMATION === */
function animateShake() {
    const row = G.guesses.length;
    for (let c = 0; c < G.difficulty.digits; c++) {
        const cell = document.getElementById(`nv-c-${row}-${c}`);
        if (cell) {
            cell.style.animation = 'shake .5s ease';
            setTimeout(() => cell.style.animation = '', 500);
        }
    }
}

/* === WAVE ANIMATION (win) === */
function animateWave(rowIdx) {
    const digits = G.difficulty.digits;
    for (let c = 0; c < digits; c++) {
        const cell = document.getElementById(`nv-c-${rowIdx}-${c}`);
        if (cell) {
            setTimeout(() => cell.classList.add('wave'), c * 100);
        }
    }
}

/* === HINT SYSTEM === */
function useHint() {
    if (G.gameState !== 'playing') return;
    // Find unconfirmed positions
    const unconfirmed = [];
    for (let i = 0; i < G.code.length; i++) {
        let isConfirmed = false;
        for (const fb of G.feedback) {
            if (fb[i] === 'green') { isConfirmed = true; break; }
        }
        if (!isConfirmed) unconfirmed.push(i);
    }
    if (unconfirmed.length === 0) return;

    const revealHint = () => {
        G.hintsUsed++;
        const pos = unconfirmed[Math.floor(Math.random() * unconfirmed.length)];
        const digit = G.code[pos];

        // Update tracker to mark digit as included
        if (G.tracker[digit] === 'unused') {
            G.tracker[digit] = 'included';
        }
        renderTracker();

        // Flash the revealed digit on tracker
        const tCell = document.getElementById('nv-t-' + digit);
        if (tCell) {
            tCell.style.transition = 'none';
            tCell.style.boxShadow = '0 0 12px 4px var(--pv-amber, #D97706)';
            tCell.style.transform = 'scale(1.3)';
            setTimeout(() => {
                tCell.style.transition = 'all 0.5s ease';
                tCell.style.boxShadow = '';
                tCell.style.transform = '';
            }, 1200);
        }

        // Flash the input row position with the revealed digit
        const inputRow = G.guesses.length;
        const cell = document.getElementById(`nv-c-${inputRow}-${pos}`);
        if (cell) {
            cell.textContent = digit;
            cell.style.transition = 'none';
            cell.style.background = 'var(--pv-amber, #D97706)';
            cell.style.color = '#fff';
            cell.style.fontWeight = '800';
            setTimeout(() => {
                cell.style.transition = 'all 1s ease';
                cell.style.background = '';
                cell.style.color = '';
                cell.style.fontWeight = '';
                // Restore original cell content
                renderGrid();
            }, 2500);
        }

        showToast(`💡 Position ${pos + 1} is the digit ${digit}`);
        SFX.play('hint');
        updateHintBtn();
    };

    // Use HintManager: first hint free, then reward ad
    if (typeof HintManager !== 'undefined') {
        HintManager.requestHint(revealHint);
    } else {
        revealHint();
    }
}

/* === GAME END === */
function onGameEnd(won) {
    if (won) {
        animateWave(G.guesses.length - 1);
        SFX.play('win');
    } else {
        SFX.play('gameover');
    }

    if (G.mode === 'speed') {
        if (won) {
            G.speedSolved++;
            G.speedTimer += 15;
            G.speedScore += calcSpeedPoints();
            updateSpeedDisplay();
            // Generate next code
            G.code = generateCode({ digits: 4, maxAttempts: 8, allowDuplicates: false });
            G.guesses = [];
            G.feedback = [];
            G.currentInput = [];
            G.tracker = Array(10).fill('unused');
            G.gameState = 'playing';
            G.difficulty = { ...DIFFICULTIES.easy, maxAttempts: 8 };
            renderGrid();
            renderTracker();
            updateHintBtn();
            return;
        } else {
            clearInterval(G.speedInterval);
        }
    }

    // Save stats
    const score = G.mode === 'speed' ? G.speedScore : (won ? calcScore() : 0);
    if (won && G.mode !== 'speed') saveDist(G.guesses.length);
    if (G.mode === 'daily') {
        saveDailyResult(won, G.guesses.length);
        updateStreak('numvault');
    }
    saveStats(won);
    updateStats('numvault', score);

    setTimeout(() => showResult(won, score), won ? 1200 : 600);
}

function calcSpeedPoints() {
    return Math.round(100 * DIFFICULTIES.easy.multiplier);
}

/* === RESULT SCREEN === */
function showResult(won, score) {
    const overlay = document.getElementById('nv-result');
    const card = document.getElementById('nv-result-card');
    const attempts = G.guesses.length;
    const elapsed = ((G.endTime - G.startTime) / 1000).toFixed(1);
    const streak = parseInt(localStorage.getItem('pv_numvault_streak') || '0');
    const dist = loadDist();
    const maxDist = Math.max(1, ...Object.values(dist));

    let distHtml = '';
    for (let i = 1; i <= G.difficulty.maxAttempts; i++) {
        const count = dist[i] || 0;
        const pct = Math.max(8, (count / maxDist) * 100);
        const isCurrent = won && i === attempts;
        distHtml += `<div class="nv-dist-row"><span class="nv-dist-label">${i}</span><div class="nv-dist-bar${isCurrent ? ' current' : ''}" style="width:${pct}%">${count}</div></div>`;
    }

    const codeHtml = G.code.map(d => `<span>${d}</span>`).join('');
    const isSpeed = G.mode === 'speed';

    card.style.position = 'relative';
    card.innerHTML = `
    <button onclick="document.getElementById('nv-result').classList.remove('open')" aria-label="Close" style="position:absolute;top:8px;right:12px;background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--pv-text-secondary);padding:4px 8px;border-radius:50%;transition:background .2s" onmouseover="this.style.background='var(--pv-grid-bg)'" onmouseout="this.style.background='none'">✕</button>
    <div class="result-icon">${won ? '🔓' : '🔒'}</div>
    <div class="result-title">${won ? 'Vault Cracked!' : 'Vault Sealed'}</div>
    <div class="nv-result-code${won ? '' : ' lost'}">${codeHtml}</div>
    ${isSpeed ? `<div class="result-score">${formatNumber(G.speedScore)} pts · ${G.speedSolved} solved</div>` : `
    <div class="nv-stats-row">
      <div><div class="val">${won ? attempts + '/' + G.difficulty.maxAttempts : 'X/' + G.difficulty.maxAttempts}</div><div class="lbl">Attempts</div></div>
      <div><div class="val">${elapsed}s</div><div class="lbl">Time</div></div>
      <div><div class="val">${G.difficulty.label}</div><div class="lbl">Difficulty</div></div>
      ${streak > 0 ? `<div><div class="val">🔥${streak}</div><div class="lbl">Streak</div></div>` : ''}
    </div>
    ${won ? `<div class="nv-dist"><div style="font-size:.8rem;font-weight:600;margin-bottom:6px">Guess Distribution</div>${distHtml}</div>` : ''}
    ${won && score > 0 ? `<div class="result-score">${formatNumber(score)} pts</div>` : ''}`}
    <div class="result-actions">
      <button class="pv-btn pv-btn-primary" onclick="shareNV()">📤 Share</button>
      <button class="pv-btn pv-btn-secondary" onclick="playAgain()">🔄 Play Again</button>
    </div>
    <div id="nv-mini-promo"></div>
  `;
    // Render mini cross-promo icons inside result modal
    if (typeof renderMiniCrossPromo === 'function') {
        renderMiniCrossPromo('numvault', document.getElementById('nv-mini-promo'));
    }
    overlay.classList.add('open');

    // Show interstitial after 2s delay if applicable
    setTimeout(() => {
        if (typeof AdController !== 'undefined' && AdController.shouldShowInterstitial()) {
            AdController.showInterstitial();
        }
    }, 2000);
}

/* === SHARE === */
function shareNV() {
    const won = G.gameState === 'won';
    const dayNum = getDailyNumber();
    const attempts = G.guesses.length;
    const isDaily = G.mode === 'daily';
    const isSpeed = G.mode === 'speed';

    let text = `🔢 NumVault${isDaily ? ' Daily #' + dayNum : ''}\n`;
    if (!isSpeed) {
        G.feedback.forEach(row => {
            text += row.map(f => f === 'green' ? '🟢' : f === 'yellow' ? '🟡' : '⚫').join('') + '\n';
        });
        text += `${won ? attempts : 'X'}/${G.difficulty.maxAttempts}`;
        if (G.hintsUsed === 0 && won) {
            text += ' ⭐ No hints!';
        } else if (G.hintsUsed > 0) {
            text += ' 💡';
        }
    } else {
        text += `Speed Mode\nSolved: ${G.speedSolved} | Score: ${formatNumber(G.speedScore)}\n`;
    }
    text += '\npuzzlevault.pages.dev/numvault';
    shareResult(text);
}

/* === PLAY AGAIN === */
function playAgain() {
    document.getElementById('nv-result').classList.remove('open');
    if (G.mode === 'daily') {
        switchMode('free');
    } else {
        startGame(G.mode, G.diffKey);
    }
}

/* === START GAME === */
function startGame(mode, diffKey) {
    resetState();
    G.mode = mode;
    G.diffKey = diffKey || 'medium';
    const diff = DIFFICULTIES[G.diffKey] || DIFFICULTIES.medium;
    G.difficulty = { ...diff };

    if (mode === 'daily') {
        G.difficulty = { ...DIFFICULTIES.medium };
        G.diffKey = 'medium';
        G.maxHints = 1;
        const seed = getDailySeed('numvault');
        G.code = generateCode(G.difficulty, seed);
        const tag = document.getElementById('nv-daily-tag');
        tag.style.display = 'inline';
        tag.textContent = 'Daily #' + getDailyNumber();
        // Check if already done
        if (isDailyDone()) {
            showToast('You already completed today\'s Daily! Try Free Play.');
            switchMode('free');
            return;
        }
    } else if (mode === 'speed') {
        G.difficulty = { ...DIFFICULTIES.easy, maxAttempts: 8 };
        G.diffKey = 'easy';
        G.maxHints = 0;
        G.code = generateCode(G.difficulty);
        G.speedTimer = 60;
        G.speedScore = 0;
        G.speedSolved = 0;
        document.getElementById('nv-daily-tag').style.display = 'none';
        startSpeedTimer();
    } else {
        G.maxHints = 2;
        G.code = generateCode(G.difficulty);
        document.getElementById('nv-daily-tag').style.display = 'none';
    }

    G.startTime = Date.now();
    document.getElementById('nv-diff-select').style.display = 'none';
    document.getElementById('nv-game-area').style.display = '';
    document.getElementById('nv-timer-bar').style.display = mode === 'speed' ? '' : 'none';
    document.getElementById('nv-speed-score').style.display = mode === 'speed' ? '' : 'none';

    renderGrid();
    renderTracker();
    renderNumpad();
    updateSpeedDisplay();
}

/* === SPEED MODE TIMER === */
function startSpeedTimer() {
    clearInterval(G.speedInterval);
    G.speedInterval = setInterval(() => {
        if (G.gameState !== 'playing') return;
        G.speedTimer = Math.max(0, G.speedTimer - 0.1);
        updateSpeedDisplay();
        if (G.speedTimer <= 0) {
            G.gameState = 'lost';
            G.endTime = Date.now();
            clearInterval(G.speedInterval);
            onGameEnd(false);
        }
    }, 100);
}

function updateSpeedDisplay() {
    const tb = document.getElementById('nv-timer-bar');
    if (G.mode !== 'speed') return;
    const t = Math.ceil(G.speedTimer);
    tb.textContent = t + 's';
    tb.className = 'nv-timer-bar ' + (t > 15 ? 'safe' : '');
    document.getElementById('nv-speed-score').textContent = `Solved: ${G.speedSolved} · Score: ${formatNumber(G.speedScore)}`;
}

/* === MODE SWITCHING === */
function switchMode(mode) {
    // Update tabs
    document.querySelectorAll('#nv-tabs .pv-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    clearInterval(G.speedInterval);
    document.getElementById('nv-timer-bar').style.display = 'none';
    document.getElementById('nv-speed-score').style.display = 'none';

    if (mode === 'daily') {
        startGame('daily');
    } else if (mode === 'speed') {
        startGame('speed');
    } else {
        showDifficultySelect();
    }
}

function showDifficultySelect() {
    document.getElementById('nv-game-area').style.display = 'none';
    document.getElementById('nv-daily-tag').style.display = 'none';
    const sel = document.getElementById('nv-diff-select');
    sel.style.display = '';
    sel.innerHTML = '<h3 style="text-align:center;margin-bottom:8px">Choose Difficulty</h3>';
    Object.entries(DIFFICULTIES).forEach(([key, d]) => {
        const btn = document.createElement('button');
        btn.className = 'nv-diff-btn';
        btn.innerHTML = `<strong>${d.label}</strong><span>${d.digits} digits · ${d.maxAttempts} attempts · ${d.allowDuplicates ? 'Duplicates allowed' : 'No duplicates'}</span>`;
        btn.onclick = () => startGame('free', key);
        sel.appendChild(btn);
    });
}

/* === SHOW STATS MODAL === */
function showStatsModal() {
    const s = loadStats();
    const dist = loadDist();
    const maxDist = Math.max(1, ...Object.values(dist));
    const streak = parseInt(localStorage.getItem('pv_numvault_streak') || '0');
    const winRate = s.played > 0 ? Math.round((s.won / s.played) * 100) : 0;

    let distHtml = '';
    for (let i = 1; i <= 10; i++) {
        const count = dist[i] || 0;
        if (count === 0 && i > 6) continue;
        const pct = Math.max(8, (count / maxDist) * 100);
        distHtml += `<div class="nv-dist-row"><span class="nv-dist-label">${i}</span><div class="nv-dist-bar" style="width:${pct}%">${count}</div></div>`;
    }

    document.getElementById('nv-stats-body').innerHTML = `
    <div class="nv-stats-row">
      <div><div class="val">${s.played}</div><div class="lbl">Played</div></div>
      <div><div class="val">${winRate}%</div><div class="lbl">Win Rate</div></div>
      <div><div class="val">${streak}</div><div class="lbl">Streak</div></div>
      <div><div class="val">${s.bestStreak}</div><div class="lbl">Best</div></div>
    </div>
    <div class="nv-dist" style="margin-top:16px">
      <div style="font-size:.85rem;font-weight:600;margin-bottom:6px">Guess Distribution</div>
      ${distHtml || '<p style="text-align:center;color:var(--pv-text-secondary);font-size:.85rem">No data yet. Play some games!</p>'}
    </div>
  `;
    document.getElementById('nv-stats-modal').classList.add('open');
}

/* === KEYBOARD INPUT === */
document.addEventListener('keydown', (e) => {
    if (G.gameState !== 'playing') return;
    if (document.querySelector('.pv-modal.open')) return;
    if (e.key >= '0' && e.key <= '9') {
        inputDigit(parseInt(e.key));
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        inputBackspace();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        submitGuess();
    }
});

/* === INIT === */
document.addEventListener('DOMContentLoaded', () => {
    // Mode tabs
    document.getElementById('nv-tabs').addEventListener('click', e => {
        const tab = e.target.closest('.pv-tab');
        if (!tab) return;
        switchMode(tab.dataset.mode);
    });

    // Icon buttons
    document.getElementById('nv-btn-help').onclick = () => document.getElementById('nv-help-modal').classList.add('open');
    document.getElementById('nv-btn-stats').onclick = showStatsModal;
    document.getElementById('nv-btn-settings').onclick = () => {
        SFX.toggle();
        document.getElementById('nv-btn-settings').textContent = SFX.enabled ? '🔊' : '🔇';
        showToast(SFX.enabled ? 'Sound On' : 'Sound Off');
    };
    document.getElementById('nv-btn-restart').onclick = () => {
        if (G.gameState !== 'playing' || confirm('Restart current game?')) {
            document.getElementById('nv-result').classList.remove('open');
            if (G.mode === 'free') {
                showDifficultySelect();
            } else {
                startGame(G.mode, G.diffKey);
            }
        }
    };

    // Cross promo — directly below game controls
    if (typeof renderCrossPromo === 'function') renderCrossPromo('numvault');

    // Initialize HintManager
    if (typeof HintManager !== 'undefined') HintManager.init('numvault');

    // Check URL params for mode
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'daily';
    switchMode(mode);
});
