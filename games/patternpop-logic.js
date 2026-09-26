/* ===================================================
   PatternPop — Game Logic (patternpop-logic.js)
   Pattern memory game with decoy flashes
   =================================================== */

/* === GAME STATE === */
let G = {};
const PP_DEPTH_COPY = {
    en: ['Remember the blue diamonds. Ignore the red crosses. Then tap the remembered pads in any order.', 'I’m ready', 'Remember', 'Ignore', 'Tap the pads, or use arrow keys + Enter / Space.', 'Watch the diamonds', 'Your turn · {n} / {total} found', 'Round {n}', 'Round complete', 'Ready when you are', 'Memory board. Row {r}, column {c}.', 'Next board: {n} × {n}', 'Keep the pattern in mind'],
    ko: ['파란 마름모를 기억하고 빨간 ×는 무시하세요. 불이 꺼지면 기억한 패드를 순서와 상관없이 누르세요.', '준비됐어요', '기억하세요', '무시하세요', '패드를 누르거나 방향키 + Enter / Space를 사용하세요.', '마름모 위치를 기억하세요', '찾은 패드 · {n} / {total}', '{n}라운드', '라운드 성공', '준비되면 시작하세요', '기억 보드. {r}행 {c}열.', '다음 보드: {n} × {n}', '패턴을 머릿속에 담아 보세요'],
    ja: ['青いひし形を覚えて、赤い×は無視。消えたら覚えたパッドを好きな順番で押しましょう。', '準備できた', '覚える', '無視する', 'タップ、または矢印キー + Enter / Space。', 'ひし形の位置を覚えよう', '見つけた数 · {n} / {total}', 'ラウンド{n}', 'ラウンド完了', '準備ができたら開始', '記憶ボード。{r}行{c}列。', '次のボード: {n} × {n}', 'パターンを覚えよう'],
    zh: ['记住蓝色菱形，忽略红色×。灯光熄灭后，以任意顺序点击记住的位置。', '准备好了', '记住', '忽略', '点击方块，或用方向键 + Enter / Space。', '记住菱形的位置', '已找到 · {n} / {total}', '第{n}轮', '本轮完成', '准备好后开始', '记忆棋盘。第{r}行第{c}列。', '下一棋盘: {n} × {n}', '记住这个图案'],
    es: ['Recuerda los rombos azules. Ignora las cruces rojas. Después toca los pads recordados en cualquier orden.', 'Estoy listo', 'Recuerda', 'Ignora', 'Toca los pads, o usa flechas + Intro / Espacio.', 'Observa los rombos', 'Tu turno · {n} / {total} encontrados', 'Ronda {n}', 'Ronda completada', 'Empieza cuando quieras', 'Tablero. Fila {r}, columna {c}.', 'Siguiente tablero: {n} × {n}', 'Memoriza el patrón']
};
function ppCopy(index, values = {}) {
    const lang = typeof I18n !== 'undefined' ? I18n.currentLang : 'en';
    return (PP_DEPTH_COPY[lang] || PP_DEPTH_COPY.en)[index].replace(/\{(\w+)\}/g, (_, key) => values[key]);
}
function schedulePP(callback, delay) {
    const game = G, round = G.round;
    const id = setTimeout(() => {
        game.timers.delete(id);
        if (G === game && G.round === round) callback();
    }, delay);
    G.timers.add(id);
    return id;
}
function resetState() {
    if (G.timers) G.timers.forEach(clearTimeout);
    G = {
        mode: 'endless',
        round: 1,
        score: 0,
        lives: 3,
        maxLives: 3,
        bestRound: parseInt(localStorage.getItem('pv_patternpop_best_round') || '0'),
        phase: 'idle', // idle | memorize | recall | feedback | gameover
        gridSize: 3,
        targets: [],      // [{r,c}, ...]
        decoys: [],        // [{r,c}, ...]
        tapped: [],        // [{r,c}, ...]
        tappedCorrect: 0,
        tappedWrong: 0,
        decoysDodged: 0,
        showDecoys: false,
        cellStates: [],    // 2D array: null | 'target' | 'decoy' | 'correct' | 'wrong' | 'missed'
        canvas: null,
        ctx: null,
        cellSize: 0,
        gap: 12,
        animFrame: null,
        rng: null,
        rewardUsed: false,
        roundStartTime: 0,
        gameState: 'playing',
        timers: new Set(),
        focusedCell: { r: 0, c: 0 },
        keyboardFocus: false,
        completed: false,
    };
}

/* === GRID SIZE BY ROUND === */
function getGridSize(round) {
    if (round <= 4) return 3;
    if (round <= 8) return 4;
    if (round <= 14) return 5;
    return 6;
}

/* === TARGET COUNT BY ROUND === */
function getTargetCount(round) {
    // Starts at 3, scales up
    return Math.min(Math.floor(round * 0.8 + 2), 18);
}

/* === DECOY COUNT (round 5+) === */
function getDecoyCount(round) {
    if (round < 5) return 0;
    return Math.min(Math.floor((round - 4) * 0.5 + 1), 4);
}

/* === MEMORIZE TIME === */
function getMemorizeTime(round) {
    // Starts at 2.5s, decreases to min 1.2s
    return Math.max(1.2, 2.5 - (round - 1) * 0.08);
}

/* === GENERATE TARGETS === */
function generateTargets(gridSize, count, rng) {
    const all = [];
    for (let r = 0; r < gridSize; r++)
        for (let c = 0; c < gridSize; c++)
            all.push({ r, c });
    const shuffled = rng ? rng.shuffle([...all]) : all.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, gridSize * gridSize - 1));
}

/* === GENERATE DECOYS (non-overlapping with targets) === */
function generateDecoys(gridSize, count, targets, rng) {
    if (count === 0) return [];
    const tSet = new Set(targets.map(t => t.r + ',' + t.c));
    const available = [];
    for (let r = 0; r < gridSize; r++)
        for (let c = 0; c < gridSize; c++)
            if (!tSet.has(r + ',' + c)) available.push({ r, c });
    const shuffled = rng ? rng.shuffle([...available]) : available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, available.length));
}

/* === CANVAS SETUP === */
function resizeCanvas() {
    const canvas = G.canvas;
    const wrap = canvas.parentElement;
    const w = Math.min(Math.max(160, wrap.clientWidth - 24), 476);
    canvas.width = w * (window.devicePixelRatio || 1);
    canvas.height = canvas.width;
    canvas.style.width = w + 'px';
    canvas.style.height = w + 'px';
    G.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const totalGap = G.gap * (G.gridSize + 1);
    G.cellSize = (w - totalGap) / G.gridSize;
    drawGrid();
}

/* === DRAW GRID === */
function drawGrid() {
    const ctx = G.ctx;
    const w = G.canvas.width / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, w);

    const dark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    // A recessed tray; pad fronts remain in the same touch coordinate system.
    ctx.fillStyle = dark ? '#0F172A' : '#CBD5E1';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, w, 12);
    ctx.fill();

    for (let r = 0; r < G.gridSize; r++) {
        for (let c = 0; c < G.gridSize; c++) {
            const x = G.gap + c * (G.cellSize + G.gap);
            const y = G.gap + r * (G.cellSize + G.gap);
            const state = G.cellStates[r] ? G.cellStates[r][c] : null;

            let fillColor = dark ? '#334155' : '#FFFFFF';
            let borderColor = dark ? '#475569' : '#CBD5E1';
            let sideColor = dark ? '#1E293B' : '#94A3B8';

            if (state === 'target') {
                fillColor = '#2563EB';
                borderColor = '#1D4ED8';
                sideColor = '#1D4ED8';
            } else if (state === 'decoy') {
                fillColor = '#F43F5E';
                borderColor = '#BE123C';
                sideColor = '#BE123C';
            } else if (state === 'correct') {
                fillColor = '#059669';
                borderColor = '#047857';
                sideColor = '#047857';
            } else if (state === 'wrong') {
                fillColor = '#F43F5E';
                borderColor = '#E11D48';
                sideColor = '#BE123C';
            } else if (state === 'missed') {
                fillColor = '#FDE68A';
                borderColor = '#D97706';
                sideColor = '#B45309';
            }

            const pressed = state === 'correct' || state === 'wrong';
            const depth = Math.max(4, Math.min(9, G.cellSize * .12));
            const topY = y + (pressed ? depth * .65 : 0);
            const faceHeight = G.cellSize - depth;
            const radius = Math.min(10, G.cellSize * .14);
            // Contact shadow and the solid front face provide depth without distorting the grid.
            ctx.fillStyle = 'rgba(15,23,42,.22)';
            ctx.beginPath();
            ctx.roundRect(x + 1, y + depth * .5, G.cellSize - 2, G.cellSize, radius);
            ctx.fill();
            ctx.fillStyle = sideColor;
            ctx.beginPath();
            ctx.roundRect(x, topY, G.cellSize, G.cellSize - (pressed ? depth * .65 : 0), radius);
            ctx.fill();
            const face = ctx.createLinearGradient(0, topY, 0, topY + faceHeight);
            face.addColorStop(0, fillColor);
            face.addColorStop(1, state ? fillColor : dark ? '#1E293B' : '#E2E8F0');
            ctx.fillStyle = face;
            ctx.beginPath();
            ctx.roundRect(x, topY, G.cellSize, faceHeight, radius);
            ctx.fill();
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(x + .5, topY + .5, G.cellSize - 1, faceHeight - 1, radius);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.35)';
            ctx.beginPath();
            ctx.moveTo(x + radius, topY + 2);
            ctx.lineTo(x + G.cellSize - radius, topY + 2);
            ctx.stroke();

            const symbols = { target: '◆', decoy: '×', correct: '✓', wrong: '×', missed: '◇' };
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (symbols[state]) {
                ctx.fillStyle = state === 'missed' ? '#92400E' : '#FFFFFF';
                ctx.font = `800 ${G.cellSize * .37}px system-ui, sans-serif`;
                ctx.fillText(symbols[state], x + G.cellSize / 2, topY + faceHeight / 2);
            } else {
                // Small locator marks help players orient without hinting at hidden targets.
                ctx.fillStyle = dark ? '#64748B' : '#CBD5E1';
                ctx.beginPath();
                ctx.arc(x + G.cellSize / 2, topY + faceHeight / 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            if (G.keyboardFocus && G.focusedCell.r === r && G.focusedCell.c === c) {
                ctx.strokeStyle = dark ? '#C4B5FD' : '#7C3AED';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(x + 4, topY + 4, G.cellSize - 8, faceHeight - 8, Math.max(3, radius - 3));
                ctx.stroke();
            }
        }
    }
}

/* === INIT CELL STATES === */
function initCellStates() {
    G.cellStates = [];
    for (let r = 0; r < G.gridSize; r++) {
        G.cellStates[r] = [];
        for (let c = 0; c < G.gridSize; c++) {
            G.cellStates[r][c] = null;
        }
    }
}

/* === UPDATE UI === */
function updateUI() {
    document.getElementById('pp-round').textContent = G.round;
    document.getElementById('pp-score').textContent = formatNumber(G.score);
    let hearts = '';
    if (G.maxLives > 0 && G.maxLives < 10) {
        for (let i = 0; i < G.maxLives; i++) hearts += i < G.lives ? '❤️' : '🖤';
    } else if (G.mode === 'endless') {
        hearts = '♾️';
    }
    document.getElementById('pp-lives').textContent = hearts;
    updatePatternProgress();
}

function updatePatternProgress() {
    const count = G.targets.length;
    document.getElementById('pp-progress-label').textContent = G.phase === 'recall' || G.phase === 'feedback'
        ? ppCopy(6, { n: G.tappedCorrect, total: count }) : G.round === 4 || G.round === 8 || G.round === 14
            ? ppCopy(11, { n: getGridSize(G.round + 1) }) : ppCopy(12);
    document.getElementById('pp-recall-pips').innerHTML = Array.from({ length: count }, (_, i) => `<i${i < G.tappedCorrect ? ' class="found"' : ''}></i>`).join('');
}

function refreshPatternLanguage() {
    ['pp-ready-copy', 'pp-start-btn', 'pp-target-label', 'pp-decoy-label', 'pp-keyboard-note'].forEach((id, i) => { document.getElementById(id).textContent = ppCopy(i); });
    setPhaseBanner(G.phase);
    updatePatternProgress();
}
window.addEventListener('langchange', () => { if (G.canvas) refreshPatternLanguage(); });

function setPhaseBanner(phase) {
    const el = document.getElementById('pp-phase');
    if (phase === 'memorize') {
        el.textContent = '◆ ' + ppCopy(5);
        el.className = 'pp-phase-banner memorize';
    } else if (phase === 'recall') {
        el.textContent = ppCopy(6, { n: G.tappedCorrect, total: G.targets.length });
        el.className = 'pp-phase-banner recall';
    } else if (phase === 'feedback') {
        el.textContent = '✓ ' + ppCopy(8);
        el.className = 'pp-phase-banner feedback';
    } else {
        el.textContent = ppCopy(9);
        el.className = 'pp-phase-banner';
    }
}

/* === SHOW ROUND OVERLAY === */
function showRoundOverlay(round, callback) {
    const overlay = document.getElementById('pp-round-overlay');
    const text = document.getElementById('pp-round-text');
    text.textContent = ppCopy(7, { n: round });
    text.style.animation = 'none';
    void text.offsetWidth;
    text.style.animation = 'ppSlideUp .6s ease';
    overlay.classList.add('show');
    schedulePP(() => {
        overlay.classList.remove('show');
        if (callback) callback();
    }, 900);
}

/* === START ROUND === */
function startRound() {
    G.phase = 'idle';
    G.gridSize = getGridSize(G.round);
    const targetCount = getTargetCount(G.round);
    const decoyCount = getDecoyCount(G.round);
    G.targets = generateTargets(G.gridSize, targetCount, G.rng);
    G.decoys = generateDecoys(G.gridSize, decoyCount, G.targets, G.rng);
    G.tapped = [];
    G.tappedCorrect = 0;
    G.tappedWrong = 0;
    G.showDecoys = false;
    G.focusedCell = { r: 0, c: 0 };

    initCellStates();
    resizeCanvas();
    updateUI();

    showRoundOverlay(G.round, () => {
        startMemorizePhase();
    });
}

/* === PHASE 1: MEMORIZE === */
function startMemorizePhase() {
    G.phase = 'memorize';
    setPhaseBanner('memorize');

    // Show targets
    G.targets.forEach(t => {
        G.cellStates[t.r][t.c] = 'target';
    });
    drawGrid();
    SFX.play('tap');

    const memTime = getMemorizeTime(G.round) * 1000;

    // Schedule decoy flash if applicable
    if (G.decoys.length > 0) {
        const decoyStartDelay = Math.max(200, memTime * 0.3 + Math.random() * memTime * 0.3);
        schedulePP(() => {
            if (G.phase !== 'memorize') return;
            G.decoys.forEach(d => {
                G.cellStates[d.r][d.c] = 'decoy';
            });
            G.showDecoys = true;
            drawGrid();
            // Remove decoys after 0.3s
            schedulePP(() => {
                if (G.phase !== 'memorize') return;
                G.decoys.forEach(d => {
                    G.cellStates[d.r][d.c] = null;
                });
                G.showDecoys = false;
                drawGrid();
            }, 300);
        }, decoyStartDelay);
    }

    // End memorize phase
    schedulePP(() => {
        if (G.phase !== 'memorize') return;
        startRecallPhase();
    }, memTime);
}

/* === PHASE 2: RECALL === */
function startRecallPhase() {
    G.phase = 'recall';
    G.roundStartTime = Date.now();
    setPhaseBanner('recall');
    initCellStates();
    // Replayed hints retain found pads; otherwise a selected pad disappears but cannot be selected again.
    G.tapped.forEach(t => { G.cellStates[t.r][t.c] = G.targets.some(target => target.r === t.r && target.c === t.c) ? 'correct' : 'wrong'; });
    updatePatternProgress();
    drawGrid();
    SFX.play('correct');
}

/* === HANDLE TAP === */
function handleTap(clientX, clientY) {
    if (G.phase !== 'recall') return;

    const rect = G.canvas.getBoundingClientRect();
    const logicalWidth = G.canvas.width / (window.devicePixelRatio || 1);
    const x = (clientX - rect.left) * logicalWidth / rect.width;
    const y = (clientY - rect.top) * logicalWidth / rect.height;

    // Find which cell was tapped
    const col = Math.floor((x - G.gap) / (G.cellSize + G.gap));
    const row = Math.floor((y - G.gap) / (G.cellSize + G.gap));

    if (row < 0 || row >= G.gridSize || col < 0 || col >= G.gridSize) return;
    const localX = x - (G.gap + col * (G.cellSize + G.gap));
    const localY = y - (G.gap + row * (G.cellSize + G.gap));
    if (localX < 0 || localY < 0 || localX > G.cellSize || localY > G.cellSize) return;
    G.keyboardFocus = false;
    choosePatternCell(row, col);
}

function choosePatternCell(row, col) {
    if (G.phase !== 'recall' || row < 0 || row >= G.gridSize || col < 0 || col >= G.gridSize) return;

    // Already tapped?
    if (G.tapped.some(t => t.r === row && t.c === col)) return;
    G.tapped.push({ r: row, c: col });

    // Check if correct
    const isTarget = G.targets.some(t => t.r === row && t.c === col);
    const isDecoy = G.decoys.some(d => d.r === row && d.c === col);

    if (isTarget) {
        G.cellStates[row][col] = 'correct';
        G.tappedCorrect++;
        setPhaseBanner('recall');
        updatePatternProgress();
        SFX.play('correct');
        drawGrid();

        // Check if all targets tapped
        if (G.tappedCorrect >= G.targets.length) {
            G.phase = 'settling'; // Lock the board while the last raised pad settles.
            schedulePP(() => endRound(true), 300);
        }
    } else {
        G.cellStates[row][col] = 'wrong';
        G.lives--;
        G.tappedWrong++;
        if (isDecoy) {
            // Tapped a decoy
        }
        SFX.play('wrong');
        updateUI();
        drawGrid();

        // Shake animation
        G.canvas.style.animation = 'ppShake .4s ease';
        schedulePP(() => G.canvas.style.animation = '', 400);

        if (G.lives <= 0) {
            G.phase = 'gameover';
            G.gameState = 'lost';
            schedulePP(() => endGame(), 500);
        }
    }
}

/* === END ROUND (success) === */
function endRound(success) {
    G.phase = 'feedback';
    setPhaseBanner('feedback');

    // Show missed targets
    G.targets.forEach(t => {
        if (!G.tapped.some(tp => tp.r === t.r && tp.c === t.c)) {
            G.cellStates[t.r][t.c] = 'missed';
        }
    });
    drawGrid();

    if (success) {
        // Calculate score: 100 × sequence_length
        const elapsed = (Date.now() - G.roundStartTime) / 1000;
        const avgTapTime = elapsed / G.targets.length;
        const basePoints = 100 * G.targets.length;
        // Perfect round bonus: < 0.5s per tap = ×2
        const perfectMult = (avgTapTime < 0.5 && G.tappedWrong === 0) ? 2 : 1;
        const roundScore = Math.round(basePoints * perfectMult);
        G.score += roundScore;
        G.decoysDodged += G.decoys.length;

        showToast(`+${formatNumber(roundScore)} pts${perfectMult > 1 ? ' ✨ Perfect!' : ''}`);

        // Save best
        if (G.round > G.bestRound) {
            G.bestRound = G.round;
            localStorage.setItem('pv_patternpop_best_round', G.round);
        }

        // Next round
        schedulePP(() => {
            G.round++;
            updateUI();
            startRound();
        }, 1200);
    }
}

/* === END GAME === */
function endGame() {
    if (G.completed) return;
    G.completed = true;
    G.phase = 'gameover';
    G.gameState = 'lost';

    // Show all targets as missed
    G.targets.forEach(t => {
        if (G.cellStates[t.r] && G.cellStates[t.r][t.c] !== 'correct') {
            G.cellStates[t.r][t.c] = 'missed';
        }
    });
    drawGrid();

    // Save stats
    const best = parseInt(localStorage.getItem('pv_patternpop_best') || '0');
    if (G.score > best) localStorage.setItem('pv_patternpop_best', G.score);
    if (G.round > G.bestRound) {
        G.bestRound = G.round;
        localStorage.setItem('pv_patternpop_best_round', G.round);
    }
    if (typeof updateStats === 'function') updateStats('patternpop', G.score);

    SFX.play('gameover');
    schedulePP(() => showGameOver(), 400);
}

/* === GAME OVER POPUP === */
function showGameOver() {
    const statsEl = document.getElementById('pp-go-stats');
    statsEl.innerHTML = `
      <div style="text-align:center"><div style="font-size:1.4rem;font-weight:800">${G.round}</div><div style="font-size:.65rem;color:var(--pv-text-secondary)">ROUND</div></div>
      <div style="text-align:center"><div style="font-size:1.4rem;font-weight:800">${formatNumber(G.score)}</div><div style="font-size:.65rem;color:var(--pv-text-secondary)">SCORE</div></div>
      <div style="text-align:center"><div style="font-size:1.4rem;font-weight:800">${G.bestRound}</div><div style="font-size:.65rem;color:var(--pv-text-secondary)">BEST ROUND</div></div>
      <div style="text-align:center"><div style="font-size:1.4rem;font-weight:800">${G.decoysDodged}</div><div style="font-size:.65rem;color:var(--pv-text-secondary)">DECOYS DODGED</div></div>
    `;

    document.getElementById('pp-go-icon').textContent = '💥';
    document.getElementById('pp-go-title').textContent = 'GAME OVER';
    document.getElementById('pp-go-title').style.color = 'var(--pv-coral)';
    document.getElementById('pp-go-sub').textContent = 'No lives remaining!';

    // Mini cross-promo inside result modal
    const popup = document.getElementById('pp-gameover');
    let promoDiv = popup.querySelector('.mini-cross-promo');
    if (promoDiv) promoDiv.remove();
    if (typeof renderMiniCrossPromo === 'function') {
        renderMiniCrossPromo('patternpop', statsEl.parentElement);
    }

    popup.style.display = 'flex';
    popup.classList.add('open');

    // Show interstitial after 2s delay
    schedulePP(() => {
        if (typeof AdController !== 'undefined' && popup.classList.contains('open')) {
            AdController.showInterstitial();
        }
    }, 2000);
}

function closeGameOver() {
    const popup = document.getElementById('pp-gameover');
    popup.classList.remove('open');
    popup.style.display = 'none';
    if (typeof AdController !== 'undefined') AdController.refreshBottomAd();
}

/* === SHARE === */
function sharePP() {
    const dayNum = getDailyNumber();
    const isDaily = G.mode === 'daily';
    let text = `🧠 PatternPop${isDaily ? ' Daily #' + dayNum : ''}\n`;
    text += `Level ${G.round} 🔥\n`;
    text += `Longest streak: ${G.bestRound}\n`;
    // Emoji grid showing progress (filled squares up to round)
    const maxCols = 5;
    const totalCells = Math.min(G.round, 25);
    for (let i = 0; i < totalCells; i++) {
        text += '🟦';
        if ((i + 1) % maxCols === 0 && i < totalCells - 1) text += '\n';
    }
    const remaining = maxCols - (totalCells % maxCols);
    if (remaining < maxCols) {
        for (let i = 0; i < remaining; i++) text += '⬜';
    }
    text += '\npuzzlevault.pages.dev/patternpop';
    shareResult(text);
}

/* === MODE SWITCHING === */
function switchMode(mode) {
    document.querySelectorAll('#pp-tabs .pv-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.mode === mode));

    resetState();
    G.mode = mode;
    G.canvas = document.getElementById('pp-canvas');
    G.ctx = G.canvas.getContext('2d');

    if (mode === 'daily') {
        G.rng = new SeededRandom(getDailySeed('patternpop'));
        G.lives = 3;
        G.maxLives = 3;
        const tag = document.getElementById('pp-daily-tag');
        tag.style.display = 'inline';
        tag.textContent = 'Daily #' + getDailyNumber();
    } else if (mode === 'classic') {
        G.rng = null;
        G.lives = 3;
        G.maxLives = 3;
        document.getElementById('pp-daily-tag').style.display = 'none';
    } else if (mode === 'endless') {
        G.rng = null;
        G.lives = Infinity;
        G.maxLives = 0; // hide hearts
        document.getElementById('pp-daily-tag').style.display = 'none';
    } else if (mode === 'speed') {
        G.rng = null;
        G.lives = 1;
        G.maxLives = 1;
        document.getElementById('pp-daily-tag').style.display = 'none';
    } else {
        G.rng = null;
        document.getElementById('pp-daily-tag').style.display = 'none';
    }

    G.gameState = 'playing';
    G.phase = 'ready';
    initCellStates();
    resizeCanvas();
    updateUI();
    refreshPatternLanguage();
    document.getElementById('pp-ready').hidden = false;
}

function startPatternPop() {
    if (G.phase !== 'ready') return;
    document.getElementById('pp-ready').hidden = true;
    startRound();
    G.canvas.focus({ preventScroll: true });
}

function handlePatternKeyboard(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (G.phase !== 'recall') return;
    G.keyboardFocus = true;
    const cell = G.focusedCell;
    if (event.key === 'ArrowUp') cell.r = Math.max(0, cell.r - 1);
    if (event.key === 'ArrowDown') cell.r = Math.min(G.gridSize - 1, cell.r + 1);
    if (event.key === 'ArrowLeft') cell.c = Math.max(0, cell.c - 1);
    if (event.key === 'ArrowRight') cell.c = Math.min(G.gridSize - 1, cell.c + 1);
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) choosePatternCell(cell.r, cell.c);
    G.canvas.setAttribute('aria-label', ppCopy(10, { r: cell.r + 1, c: cell.c + 1 }));
    drawGrid();
}

/* === INIT === */
document.addEventListener('DOMContentLoaded', () => {
    // Tabs
    document.getElementById('pp-tabs').addEventListener('click', e => {
        const tab = e.target.closest('.pv-tab');
        if (!tab) return;
        switchMode(tab.dataset.mode);
    });

    // Canvas tap
    const canvas = document.getElementById('pp-canvas');
    canvas.addEventListener('keydown', handlePatternKeyboard);
    canvas.addEventListener('blur', () => { G.keyboardFocus = false; if (G.ctx) drawGrid(); });
    document.getElementById('pp-start-btn').addEventListener('click', startPatternPop);
    canvas.addEventListener('pointerdown', e => {
        e.preventDefault();
        handleTap(e.clientX, e.clientY);
    });

    // Sound toggle
    document.getElementById('pp-btn-sound').onclick = () => {
        SFX.toggle();
        document.getElementById('pp-btn-sound').textContent = SFX.enabled ? '🔊' : '🔇';
        showToast(SFX.enabled ? 'Sound On' : 'Sound Off');
    };

    // Restart
    document.getElementById('pp-btn-restart').onclick = () => {
        if (G.gameState !== 'playing' || G.phase === 'gameover' || confirm('Restart current game?')) {
            closeGameOver();
            switchMode(G.mode);
        }
    };

    // Resize
    window.addEventListener('resize', () => {
        if (G.canvas) {
            G.ctx = G.canvas.getContext('2d');
            resizeCanvas();
        }
    });

    // Cross promo
    if (typeof renderCrossPromo === 'function') renderCrossPromo('patternpop');

    // Initialize HintManager
    if (typeof HintManager !== 'undefined') HintManager.init('patternpop');

    const requested = new URLSearchParams(window.location.search).get('mode');
    switchMode(['classic', 'daily', 'endless', 'speed'].includes(requested) ? requested : 'classic');
});

/* === HINT SYSTEM: Replay pattern at 50% slower speed === */
function usePatternPopHint() {
    if (G.phase !== 'recall') return;

    const game = G, round = G.round;
    const replayHint = () => {
        if (G !== game || G.round !== round || G.phase !== 'recall') return;
        G.phase = 'memorize'; // Briefly switch to show pattern
        setPhaseBanner('memorize');

        // Show targets at 50% slower (1.5× normal mem time)
        G.targets.forEach(t => {
            G.cellStates[t.r][t.c] = 'target';
        });
        drawGrid();
        SFX.play('hint');

        const slowTime = getMemorizeTime(G.round) * 1.5 * 1000;

        // Show decoys if applicable
        if (G.decoys.length > 0) {
            const decoyDelay = slowTime * 0.4;
            schedulePP(() => {
                if (G.phase !== 'memorize') return;
                G.decoys.forEach(d => {
                    G.cellStates[d.r][d.c] = 'decoy';
                });
                drawGrid();
                schedulePP(() => {
                    if (G.phase !== 'memorize') return;
                    G.decoys.forEach(d => {
                        G.cellStates[d.r][d.c] = null;
                    });
                    drawGrid();
                }, 450); // slower decoy display
            }, decoyDelay);
        }

        schedulePP(() => {
            if (G.phase !== 'memorize') return;
            startRecallPhase();
        }, slowTime);
    };

    if (typeof HintManager !== 'undefined') {
        HintManager.requestHint(replayHint);
    } else {
        replayHint();
    }
}
