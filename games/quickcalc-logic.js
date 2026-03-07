const GAME_ID = 'quickcalc';

let state = {
    mode: 'classic', // 'classic', 'daily', 'timeattack', 'blitz'
    isPlaying: false,
    timeLeft: 0,
    startTime: 0,
    questionNum: 1,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correctCount: 0,
    wrongCount: 0,
    lives: 3,
    maxLives: 3,
    hintsUsed: 0,

    currentProblem: null,

    timerRAF: null,
    lastTick: 0,

    rng: null
};

// Config per mode
function getModeConfig(mode) {
    switch (mode) {
        case 'classic': return { lives: 3, timePerQ: 10000, totalTime: Infinity };
        case 'daily': return { lives: 3, timePerQ: 10000, totalTime: Infinity };
        case 'timeattack': return { lives: Infinity, timePerQ: Infinity, totalTime: 120000 }; // 2 min
        case 'blitz': return { lives: Infinity, timePerQ: Infinity, totalTime: 30000 }; // 30s
        default: return { lives: 3, timePerQ: 10000, totalTime: Infinity };
    }
}

// Per-question timer based on difficulty phase (SKILL.md)
function getQuestionTimer(qNum) {
    if (qNum <= 5) return 10000;
    if (qNum <= 10) return 8000;
    if (qNum <= 15) return 6000;
    return 5000;
}

document.addEventListener('DOMContentLoaded', () => {
    initUIEvents();
    if (typeof renderCrossPromo === 'function') renderCrossPromo(GAME_ID);
    if (typeof HintManager !== 'undefined') HintManager.init(GAME_ID);

    const soundBtn = document.getElementById('qc-btn-settings');
    if (soundBtn) soundBtn.textContent = localStorage.getItem('pv_sound') === 'off' ? '🔇' : '🔊';
});

function initUIEvents() {
    // Mode tabs
    document.querySelectorAll('#qc-tabs .pv-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (state.isPlaying) return; // Prevent switching while active
            document.querySelectorAll('#qc-tabs .pv-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            let mode = e.target.dataset.mode;

            document.getElementById('qc-daily-tag').style.display = (mode === 'daily') ? 'inline-block' : 'none';
            document.getElementById('qc-daily-tag').textContent = 'Daily';

            state.mode = mode;
        });
    });

    document.getElementById('qc-start-btn').addEventListener('click', startGame);

    // Help & Settings
    document.getElementById('qc-btn-help').addEventListener('click', () => {
        document.getElementById('qc-help-modal').classList.add('open');
    });
    document.getElementById('qc-btn-settings').addEventListener('click', () => {
        SFX.toggle();
        document.getElementById('qc-btn-settings').textContent = SFX.enabled ? '🔊' : '🔇';
        showToast(SFX.enabled ? 'Sound On' : 'Sound Off');
    });
    document.getElementById('qc-btn-stats').addEventListener('click', showStatsModal);

    // Choice buttons
    for (let i = 0; i < 4; i++) {
        document.getElementById(`qc-btn-${i}`).addEventListener('click', () => handleChoiceTap(i));
    }
}

function startGame() {
    if (state.timerRAF) cancelAnimationFrame(state.timerRAF);
    document.getElementById('qc-start-screen').style.display = 'none';

    const config = getModeConfig(state.mode);
    state.isPlaying = true;
    state.questionNum = 1;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.correctCount = 0;
    state.wrongCount = 0;
    state.hintsUsed = 0;
    state.lives = config.lives;
    state.maxLives = config.lives;

    if (state.mode === 'daily') {
        state.rng = new SeededRandom(getDailySeed(GAME_ID));
    } else {
        state.rng = null;
    }

    // Set timer based on mode
    if (state.mode === 'timeattack' || state.mode === 'blitz') {
        state.timeLeft = config.totalTime;
    } else {
        state.timeLeft = getQuestionTimer(1);
    }

    updateStatusUI();
    nextProblem();

    state.lastTick = performance.now();
    state.timerRAF = requestAnimationFrame(gameLoop);
}

function randomFloat() {
    return state.rng ? state.rng.next() : Math.random();
}

function randomInt(min, max) {
    if (state.rng) return state.rng.nextInt(min, max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
    if (state.rng) {
        const copy = state.rng.shuffle(array);
        for (let i = 0; i < array.length; i++) array[i] = copy[i];
    } else {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

function generateProblem(qNum) {
    let pType, isRoulette = false;
    let label = "";

    // Difficulty scaling based on SKILL.md phases
    if (qNum <= 5) { pType = 'phase1'; label = "Phase 1"; }
    else if (qNum <= 10) { pType = 'phase2'; label = "Phase 2"; }
    else if (qNum <= 15) {
        if (qNum >= 8 && randomFloat() < 0.3) { isRoulette = true; label = "Operator Roulette"; }
        else { pType = 'phase3'; label = "Phase 3"; }
    }
    else {
        if (qNum >= 15 && randomFloat() < 0.4) { isRoulette = true; label = "Expert Roulette"; }
        else { pType = 'phase4'; label = "Phase 4"; }
    }

    let display, answer;
    let choices = [];
    let isOperator = false;

    if (isRoulette) {
        // "A ? B = C"
        isOperator = true;
        const ops = ['+', '-', '×', '÷'];
        let op = ops[randomInt(0, 3)];
        let A, B, C;

        switch (op) {
            case '+': A = randomInt(5, 50); B = randomInt(5, 50); C = A + B; break;
            case '-': A = randomInt(20, 99); B = randomInt(5, A - 1); C = A - B; break;
            case '×': A = randomInt(2, 12); B = randomInt(2, 12); C = A * B; break;
            case '÷': B = randomInt(2, 12); C = randomInt(2, 12); A = B * C; break; // A ÷ B = C
        }

        display = `${A} <span style="color:var(--pv-orange)">?</span> ${B} = ${C}`;
        answer = op;
        choices = [...ops]; // 4 operators
    } else {
        let A, B, C;
        let opNum = randomInt(1, 3); // 1:+, 2:-, 3:x  (We skip division mostly to avoid decimals unless forced)

        if (pType === 'phase1') {
            // 1-20, +/-
            A = randomInt(1, 20); B = randomInt(1, 20);
            opNum = randomInt(1, 2);
            label = opNum === 1 ? "Addition" : "Subtraction";
        } else if (pType === 'phase2') {
            // 1-50, +/-/×
            A = randomInt(1, 50); B = randomInt(1, 20);
            opNum = randomInt(1, 3);
            if (opNum === 3) { A = randomInt(2, 12); B = randomInt(2, 12); }
            label = opNum === 1 ? "Addition" : opNum === 2 ? "Subtraction" : "Multiplication";
        } else if (pType === 'phase3') {
            // 1-100, all ops
            opNum = randomInt(1, 4);
            if (opNum === 4) {
                // Division: ensure integer result
                B = randomInt(2, 12); C = randomInt(2, 12); A = B * C;
                display = `${A} ÷ ${B}`;
                answer = C;
                choices.push(answer);
                choices.push(answer + randomInt(1, 3));
                choices.push(answer - randomInt(1, 3));
                let far = answer + randomInt(5, 15);
                while (choices.includes(far)) far++;
                choices.push(far);
                shuffle(choices);
                return { display, answer, choices, label: "Division", isOperator: false };
            }
            if (opNum === 3) { A = randomInt(5, 20); B = randomInt(2, 12); }
            else { A = randomInt(20, 100); B = randomInt(10, 50); }
            label = opNum === 1 ? "Addition" : opNum === 2 ? "Subtraction" : "Multiplication";
        } else if (pType === 'phase4') {
            // 1-200, all + 2-step
            if (randomFloat() < 0.3) {
                // 2-step: A op1 B op2 C
                let a = randomInt(10, 50), b = randomInt(2, 10), c = randomInt(1, 10);
                let op1 = randomInt(1, 2), op2 = randomInt(1, 3);
                let r1 = op1 === 1 ? a + b : a - b;
                let r2 = op2 === 1 ? r1 + c : op2 === 2 ? r1 - c : r1 * c;
                let ops = ['+', '-', '×'];
                display = `${a} ${ops[op1 - 1]} ${b} ${ops[op2 - 1]} ${c}`;
                answer = r2;
                choices.push(answer);
                choices.push(answer + randomInt(1, 5));
                choices.push(answer - randomInt(1, 5));
                let far = answer + randomInt(10, 30);
                while (choices.includes(far)) far++;
                choices.push(far);
                shuffle(choices);
                return { display, answer, choices, label: "2-Step", isOperator: false };
            }
            opNum = randomInt(1, 3);
            if (opNum === 3) { A = randomInt(10, 30); B = randomInt(5, 15); }
            else { A = randomInt(50, 200); B = randomInt(20, 100); }
            label = opNum === 1 ? "Hard Addition" : opNum === 2 ? "Hard Subtraction" : "Multiplication";
        }

        switch (opNum) {
            case 1: C = A + B; display = `${A} + ${B}`; break;
            case 2: C = Math.max(A, B) - Math.min(A, B); display = `${Math.max(A, B)} - ${Math.min(A, B)}`; break;
            case 3: C = A * B; display = `${A} × ${B}`; break;
        }

        answer = C;

        // Generate wrong answers
        choices.push(answer);

        // 1 near answer (±1~3)
        let nearChange = randomInt(1, 3);
        let near = randomFloat() > 0.5 ? answer + nearChange : answer - nearChange;
        if (near < 0) near = answer + nearChange;
        choices.push(near);

        // 1 medium answer (±5~15)
        let medChange = randomInt(5, 15);
        let med = randomFloat() > 0.5 ? answer + medChange : answer - medChange;
        if (med === near || med === answer) med += 1;
        if (med < 0) med = answer + medChange;
        choices.push(med);

        // 1 far answer (random)
        let farChange = randomInt(16, 50);
        let far = randomFloat() > 0.5 ? answer + farChange : answer - farChange;
        if (far < 0) far = answer + farChange;
        while (choices.includes(far)) far++;
        choices.push(far);

        shuffle(choices);
    }

    return {
        display,
        answer,
        choices,
        label,
        isOperator
    }
}

function nextProblem() {
    state.currentProblem = generateProblem(state.questionNum);

    // Update UI DOM
    document.getElementById('qc-q-info').textContent = `#${state.questionNum} · ${state.currentProblem.label}`;

    const probArea = document.getElementById('qc-problem-area');
    const probText = document.getElementById('qc-problem-text');

    // Trigger slide animation
    probText.innerHTML = state.currentProblem.display;
    probText.classList.remove('qc-slide-in');
    void probText.offsetWidth; // trigger layout reflow
    probText.classList.add('qc-slide-in');

    for (let i = 0; i < 4; i++) {
        let btn = document.getElementById(`qc-btn-${i}`);
        btn.textContent = state.currentProblem.choices[i];
        btn.className = 'qc-choice-btn'; // reset class

        if (state.currentProblem.isOperator) {
            btn.classList.add('operator');
        } else {
            btn.classList.remove('operator');
        }
    }
}

function updateStatusUI() {
    document.getElementById('qc-score-display').textContent = state.score;

    let comboEl = document.getElementById('qc-combo-display');
    if (state.combo >= 2) {
        comboEl.textContent = `🔥 Combo x${state.combo}`;
        comboEl.classList.add('active');
    } else {
        comboEl.classList.remove('active');
    }

    // Lives display for classic/daily
    const livesEl = document.getElementById('qc-lives-display');
    if (livesEl) {
        if (state.mode === 'classic' || state.mode === 'daily') {
            let hearts = '';
            for (let i = 0; i < state.maxLives; i++) hearts += i < state.lives ? '❤️' : '🖤';
            livesEl.textContent = hearts;
            livesEl.style.display = '';
        } else {
            livesEl.style.display = 'none';
        }
    }

    updateTimerBarDOM();
}

function updateTimerBarDOM(snap = false) {
    const bar = document.getElementById('qc-timer-bar');
    // Calculate percentage based on mode
    let maxTime;
    if (state.mode === 'timeattack') maxTime = 120000;
    else if (state.mode === 'blitz') maxTime = 30000;
    else maxTime = getQuestionTimer(state.questionNum);
    let perc = (state.timeLeft / maxTime) * 100;

    // clamp for visual
    if (perc > 100) perc = 100;
    if (perc < 0) perc = 0;

    if (snap) {
        bar.classList.add('animating-change');
        setTimeout(() => bar.classList.remove('animating-change'), 300);
    }

    bar.style.width = `${perc}%`;

    // Color shift
    if (perc > 60) {
        bar.style.backgroundColor = 'var(--pv-emerald)';
    } else if (perc > 25) {
        bar.style.backgroundColor = 'var(--pv-amber)';
    } else {
        bar.style.backgroundColor = 'var(--pv-coral)';
    }
}

function createFloatingText(x, y, text, isPenalty = false) {
    const parent = document.getElementById('qc-container');
    const el = document.createElement('div');
    el.className = 'qc-score-pop' + (isPenalty ? ' penalty' : '');
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    parent.appendChild(el);

    setTimeout(() => {
        if (el.parentElement) el.remove();
    }, 850);
}

function handleChoiceTap(idx) {
    if (!state.isPlaying) return;

    let btn = document.getElementById(`qc-btn-${idx}`);
    let choice = state.currentProblem.choices[idx];

    // get button center for popup
    let rect = btn.getBoundingClientRect();
    const parentRect = document.getElementById('qc-container').getBoundingClientRect();
    let cx = (rect.left - parentRect.left) + rect.width / 2 - 20;
    let cy = (rect.top - parentRect.top) - 20;

    if (choice === state.currentProblem.answer) {
        // Correct
        SFX.play('correct');
        btn.classList.add('correct');

        state.correctCount++;
        state.combo++;
        if (state.combo > state.maxCombo) state.maxCombo = state.combo;

        // Calculate score per SKILL.md: 100 × phase + speed bonus + streak + roulette ×2
        const phase = state.questionNum <= 5 ? 1 : state.questionNum <= 10 ? 2 : state.questionNum <= 15 ? 3 : 4;
        let points = 100 * phase;
        // Speed bonus: remaining seconds × 10
        if (state.mode === 'classic' || state.mode === 'daily') {
            points += Math.round((state.timeLeft / 1000) * 10);
        }
        // Streak bonus: consecutive correct × 50
        points += state.combo * 50;
        // Operator Roulette: ×2
        if (state.currentProblem.isOperator) points *= 2;

        state.score += points;

        createFloatingText(cx, cy, `+${points}`);

        // For classic/daily: reset question timer for next question
        if (state.mode === 'classic' || state.mode === 'daily') {
            state.timeLeft = getQuestionTimer(state.questionNum + 1);
        }

        updateTimerBarDOM(true);
        updateStatusUI();

        setTimeout(() => {
            if (!state.isPlaying) return;
            state.questionNum++;
            nextProblem();
        }, 120);

    } else {
        // Wrong
        SFX.play('wrong');
        btn.classList.add('wrong');

        state.wrongCount++;
        state.combo = 0;

        // Classic/Daily: lose a life
        if (state.mode === 'classic' || state.mode === 'daily') {
            state.lives--;
            createFloatingText(cx, cy, `❤️ -1`, true);
            if (state.lives <= 0) {
                state.timeLeft = 0;
                gameOver();
                return;
            }
            // Reset timer for same question
            state.timeLeft = getQuestionTimer(state.questionNum);
        } else {
            // Time attack/blitz: time penalty
            state.timeLeft -= 3000;
            if (state.timeLeft < 0) state.timeLeft = 0;
            createFloatingText(cx, cy, `-3.0s`, true);
        }

        const cont = document.getElementById('qc-container');
        cont.classList.remove('shake');
        void cont.offsetWidth;
        cont.classList.add('shake');
        setTimeout(() => cont.classList.remove('shake'), 400);

        updateTimerBarDOM(true);
        updateStatusUI();
    }
}

function gameLoop(timestamp) {
    if (!state.isPlaying) return;

    let dt = timestamp - state.lastTick;
    state.lastTick = timestamp;

    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        gameOver();
        updateTimerBarDOM();
        return;
    }

    // Only update DOM style efficiently on tick, snap is handled via events
    updateTimerBarDOM();

    state.timerRAF = requestAnimationFrame(gameLoop);
}

function gameOver() {
    state.isPlaying = false;
    SFX.play('gameover');

    let totalStats = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_stats`)) || { played: 0, highscore: 0, maxCombo: 0 };
    totalStats.played++;
    if (state.score > totalStats.highscore) totalStats.highscore = state.score;
    if (state.maxCombo > totalStats.maxCombo) totalStats.maxCombo = state.maxCombo;
    localStorage.setItem(`pv_${GAME_ID}_stats`, JSON.stringify(totalStats));

    // Daily logic
    if (state.mode === 'daily') {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`pv_${GAME_ID}_daily_${today}`, JSON.stringify({
            score: state.score,
            combo: state.maxCombo,
            qNum: state.questionNum
        }));
    }

    renderResultOverlay();
}

function renderResultOverlay() {
    const el = document.getElementById('qc-result-card');
    const overlay = document.getElementById('qc-result');
    if (!el || !overlay) return;

    let totalQs = state.correctCount + state.wrongCount;
    let acc = totalQs > 0 ? Math.round((state.correctCount / totalQs) * 100) : 0;

    let shareText = `⚡ QuickCalc ${state.mode === 'daily' ? 'Daily ' + new Date().toISOString().slice(0, 10) : 'Free Play'}
Score: ${state.score}
Reached Q${state.questionNum} (Acc: ${acc}%)
Max Combo: x${state.maxCombo}
https://puzzlevault.pages.dev/games/quickcalc`;

    el.innerHTML = `
        <button class="pv-modal-close" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--pv-text-secondary);" onclick="dismissResult()">✕</button>
        <div class="qc-result-title">Time's Up! ⏰</div>
        <div class="qc-result-subtitle">Final Score: <span style="color:var(--pv-emerald); font-weight:800; font-size:1.2rem;">${state.score}</span></div>
        <div class="qc-result-stats">
            <div class="qc-stat-item">
                <div class="qc-stat-val">${state.correctCount}</div>
                <div class="qc-stat-lbl">Correct</div>
            </div>
            <div class="qc-stat-item">
                <div class="qc-stat-val">${acc}%</div>
                <div class="qc-stat-lbl">Accuracy</div>
            </div>
            <div class="qc-stat-item" style="width:100%; margin-top:12px;">
                <div class="qc-stat-val" style="color:var(--pv-orange)">🔥 x${state.maxCombo}</div>
                <div class="qc-stat-lbl">Max Combo</div>
            </div>
        </div>
        <div class="result-actions">
            <button class="pv-btn pv-btn-primary" onclick="shareQC()">📤 Share</button>
            <button class="pv-btn pv-btn-secondary" onclick="resetToStart()">🔄 Play Again</button>
        </div>
        <div id="qc-mini-promo"></div>
    `;

    overlay.classList.add('show');

    // Mini cross-promo inside result modal
    if (typeof renderMiniCrossPromo === 'function') {
        const promoContainer = document.getElementById('qc-mini-promo');
        if (promoContainer) renderMiniCrossPromo(GAME_ID, promoContainer);
    }

    // Show interstitial after 2s delay
    setTimeout(() => {
        if (typeof AdController !== 'undefined' && AdController.shouldShowInterstitial()) {
            AdController.showInterstitial();
        }
    }, 2000);
}

window.dismissResult = function () {
    document.getElementById('qc-result').classList.remove('show');
    if (typeof AdController !== 'undefined') AdController.refreshBottomAd();
}

window.resetToStart = function () {
    document.getElementById('qc-result').classList.remove('show');
    if (window.AdController) AdController.hideInterstitial();

    if (state.mode === 'daily') {
        // normally daily is locked, but allow local restart for demo
        startGame();
    } else {
        startGame();
    }
}

function showStatsModal() {
    let stats = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_stats`)) || { played: 0, highscore: 0, maxCombo: 0 };

    const html = `
        <div class="ss-stats-row">
            <div class="ss-stat-box"><div class="val">${stats.played}</div><div class="lbl">Played</div></div>
        </div>
        <div class="ss-stats-row">
            <div class="ss-stat-box"><div class="val" style="color:var(--pv-emerald); font-size: 1.4rem;">${stats.highscore}</div><div class="lbl">High Score</div></div>
            <div class="ss-stat-box"><div class="val" style="color:var(--pv-orange); font-size: 1.4rem;">${stats.maxCombo}</div><div class="lbl">Best Combo</div></div>
        </div>
    `;
    document.getElementById('qc-stats-body').innerHTML = html;
    document.getElementById('qc-stats-modal').classList.add('open');
}

/* === SHARE === */
window.shareQC = function () {
    const dayNum = getDailyNumber();
    const isDaily = state.mode === 'daily';
    let text = `⚡ QuickCalc${isDaily ? ' Daily #' + dayNum : ''}\n`;
    text += `Score: ${formatNumber(state.score)}\n`;
    text += `${state.correctCount} correct | 🔥 ${state.maxCombo} streak\n`;
    text += 'puzzlevault.pages.dev/quickcalc';
    shareResult(text);
};

/* === HINT SYSTEM === */
// Timer extension: always FREE (+5s)
window.useTimerHint = function () {
    if (!state.isPlaying) return;
    state.timeLeft += 5000;
    SFX.play('hint');
    showToast('⏰ +5 seconds!');
    updateTimerBarDOM(true);
};

// Operator hint: narrows to 2 choices (HintManager)
window.useOperatorHint = function () {
    if (!state.isPlaying || !state.currentProblem || !state.currentProblem.isOperator) {
        showToast('💡 Only available for Operator Roulette!');
        return;
    }

    const revealHint = () => {
        state.hintsUsed++;
        const answer = state.currentProblem.answer;
        const allOps = ['+', '-', '×', '÷'];
        const wrongOps = allOps.filter(o => o !== answer);
        // Keep answer + 1 random wrong
        const keptWrong = wrongOps[randomInt(0, wrongOps.length - 1)];
        const narrowed = [answer, keptWrong];
        shuffle(narrowed);

        // Disable 2 wrong buttons
        for (let i = 0; i < 4; i++) {
            const btn = document.getElementById(`qc-btn-${i}`);
            if (!narrowed.includes(state.currentProblem.choices[i])) {
                btn.disabled = true;
                btn.style.opacity = '0.3';
            }
        }
        SFX.play('hint');
        showToast('💡 Narrowed to 2 choices!');
    };

    if (typeof HintManager !== 'undefined') {
        HintManager.requestHint(revealHint);
    } else {
        revealHint();
    }
};
