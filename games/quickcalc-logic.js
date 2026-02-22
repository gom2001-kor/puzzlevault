const GAME_ID = 'quickcalc';

let state = {
    mode: 'daily', // 'daily' or 'free'
    isPlaying: false,
    timeLeft: 0,
    startTime: 0,
    questionNum: 1,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correctCount: 0,
    wrongCount: 0,

    currentProblem: null,

    timerRAF: null,
    lastTick: 0,

    rng: null // Will substitute Math.random for daily seeded mode
};

// Config
const INIT_TIME = 30000; // ms
const MAX_TIME = 60000; // soft cap visual indication, though practically unbound
const TIME_BONUS_BASE = 2000;
const TIME_PENALTY = 3000;

document.addEventListener('DOMContentLoaded', () => {
    initUIEvents();
    if (typeof renderCrossPromo === 'function') renderCrossPromo(GAME_ID);
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
        showToast(SFX.enabled ? 'Sound On' : 'Sound Off');
    });
    document.getElementById('qc-btn-stats').addEventListener('click', showStatsModal);

    // Choice buttons
    for (let i = 0; i < 4; i++) {
        document.getElementById(`qc-btn-${i}`).addEventListener('click', () => handleChoiceTap(i));
    }
}

function startGame() {
    document.getElementById('qc-start-screen').style.display = 'none';

    state.isPlaying = true;
    state.timeLeft = INIT_TIME;
    state.questionNum = 1;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.correctCount = 0;
    state.wrongCount = 0;

    if (state.mode === 'daily') {
        state.rng = new SeededRandom(getDailySeed(GAME_ID));
    } else {
        state.rng = null; // use Math.random
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

    // Difficulty scaling based on skills.md
    if (qNum <= 5) { pType = 'single'; label = "Addition"; }
    else if (qNum <= 10) { pType = 'dbl_sgl'; label = "Double + Single"; }
    else if (qNum <= 14) { pType = 'dbl_dbl'; label = "Double ± Double"; }
    else if (qNum <= 19) { isRoulette = true; label = "Operator Roulette"; }
    else if (qNum <= 24) { pType = 'dbl_mul'; label = "Double × Single"; }
    else if (qNum <= 29) { pType = 'mixed'; label = "Mixed Ops"; }
    else {
        if (randomFloat() < 0.3) { isRoulette = true; label = "Expert Roulette"; }
        else { pType = 'hard'; label = "Expert Math"; }
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

        if (pType === 'single') {
            A = randomInt(3, 9); B = randomInt(3, 9);
            opNum = 1; label = "Addition";
        } else if (pType === 'dbl_sgl') {
            A = randomInt(11, 49); B = randomInt(3, 9);
            opNum = randomInt(1, 2); label = opNum === 1 ? "Addition" : "Subtraction";
        } else if (pType === 'dbl_dbl') {
            A = randomInt(20, 99); B = randomInt(11, 49);
            if (opNum === 3) opNum = randomInt(1, 2);
            label = opNum === 1 ? "Addition" : "Subtraction";
        } else if (pType === 'dbl_mul') {
            opNum = 3; label = "Multiplication";
            A = randomInt(11, 19); B = randomInt(3, 9);
        } else if (pType === 'mixed' || pType === 'hard') {
            // Can be slightly bigger
            opNum = randomInt(1, 3);
            if (opNum === 1 || opNum === 2) {
                A = randomInt(50, 199); B = randomInt(20, 99);
            } else {
                A = randomInt(12, 25); B = randomInt(5, 12);
            }
            label = (opNum === 1) ? "Hard Addition" : (opNum === 2) ? "Hard Subtraction" : "Multiplication";
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

    updateTimerBarDOM();
}

function updateTimerBarDOM(snap = false) {
    const bar = document.getElementById('qc-timer-bar');
    let perc = (state.timeLeft / INIT_TIME) * 100;

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

        // Calculate points and time bonus
        let timeBonus = TIME_BONUS_BASE;
        if (state.combo >= 10) timeBonus += 3000;
        else if (state.combo >= 5) timeBonus += 2000;
        else if (state.combo >= 3) timeBonus += 1000;

        let pointBonus = 100 + (state.combo * 10);
        state.score += pointBonus;

        state.timeLeft += timeBonus;
        // optionally cap the time so it doesn't grow infinitely large to keep visual bar responsive
        // Let's cap at INIT_TIME * 1.5 but allow points
        if (state.timeLeft > INIT_TIME * 1.5) state.timeLeft = INIT_TIME * 1.5;

        let bonusSecs = (timeBonus / 1000).toFixed(1);
        createFloatingText(cx, cy, `+${bonusSecs}s`);

        updateTimerBarDOM(true);
        updateStatusUI();

        // small delay before next for feedback pulse
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
        state.timeLeft -= TIME_PENALTY;
        if (state.timeLeft < 0) state.timeLeft = 0;

        createFloatingText(cx, cy, `-3.0s`, true);

        const cont = document.getElementById('qc-container');
        cont.classList.remove('shake');
        void cont.offsetWidth; // trigger reflow
        cont.classList.add('shake');
        setTimeout(() => cont.classList.remove('shake'), 400);

        updateTimerBarDOM(true);
        updateStatusUI();

        // Optionally show correct answer or just proceed
        // By rules: we reset combo, deduct time, and don't necessarily skip the problem.
        // Let's just deduct time and let them try again.
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
                <div class="qc-stat-val">${state.questionNum - 1}</div>
                <div class="qc-stat-lbl">Questions</div>
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
        <button class="qc-btn-primary" onclick="shareResult('${encodeURIComponent(shareText)}')">📤 Share Result</button>
        <button class="qc-btn-secondary" onclick="resetToStart()">🔄 Play Again</button>
    `;

    overlay.classList.add('show');
    if (window.AdController) AdController.showInterstitial();
}

window.dismissResult = function () {
    document.getElementById('qc-result').classList.remove('show');
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
