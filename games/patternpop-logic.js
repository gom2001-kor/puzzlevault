/* ===================================================
   PatternPop — Game Logic (patternpop-logic.js)
   Pattern memory game with decoy flashes
   =================================================== */

/* === GAME STATE === */
let G = {};
function resetState() {
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
        gap: 4,
        animFrame: null,
        rng: null,
        rewardUsed: false,
        roundStartTime: 0,
        gameState: 'playing',
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
    const w = Math.min(wrap.clientWidth, 500);
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

    // Background
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, w, 12);
    ctx.fill();

    for (let r = 0; r < G.gridSize; r++) {
        for (let c = 0; c < G.gridSize; c++) {
            const x = G.gap + c * (G.cellSize + G.gap);
            const y = G.gap + r * (G.cellSize + G.gap);
            const state = G.cellStates[r] ? G.cellStates[r][c] : null;

            let fillColor = '#FFFFFF';
            let borderColor = '#CBD5E1';

            if (state === 'target') {
                fillColor = '#2563EB';
                borderColor = '#1D4ED8';
            } else if (state === 'decoy') {
                fillColor = '#FCA5A5'; // red tint for decoys
                borderColor = '#F43F5E';
            } else if (state === 'correct') {
                fillColor = '#059669';
                borderColor = '#047857';
            } else if (state === 'wrong') {
                fillColor = '#F43F5E';
                borderColor = '#E11D48';
            } else if (state === 'missed') {
                fillColor = '#FDE68A';
                borderColor = '#D97706';
            }

            // Cell shadow
            ctx.fillStyle = 'rgba(0,0,0,0.06)';
            ctx.beginPath();
            ctx.roundRect(x, y + 2, G.cellSize, G.cellSize, 4);
            ctx.fill();

            // Cell body
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.roundRect(x, y, G.cellSize, G.cellSize, 4);
            ctx.fill();

            // Cell border
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x, y, G.cellSize, G.cellSize, 4);
            ctx.stroke();

            // Icons for special states
            if (state === 'correct') {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${G.cellSize * 0.4}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✓', x + G.cellSize / 2, y + G.cellSize / 2);
            } else if (state === 'wrong') {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${G.cellSize * 0.4}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✕', x + G.cellSize / 2, y + G.cellSize / 2);
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
}

function setPhaseBanner(phase) {
    const el = document.getElementById('pp-phase');
    if (phase === 'memorize') {
        el.textContent = '👀 MEMORIZE';
        el.className = 'pp-phase-banner memorize';
    } else if (phase === 'recall') {
        el.textContent = '🎯 RECALL — Tap the cells!';
        el.className = 'pp-phase-banner recall';
    } else if (phase === 'feedback') {
        el.textContent = '📊 RESULTS';
        el.className = 'pp-phase-banner feedback';
    } else {
        el.textContent = '';
        el.className = 'pp-phase-banner';
    }
}

/* === SHOW ROUND OVERLAY === */
function showRoundOverlay(round, callback) {
    const overlay = document.getElementById('pp-round-overlay');
    const text = document.getElementById('pp-round-text');
    text.textContent = `Round ${round}`;
    text.style.animation = 'none';
    void text.offsetWidth;
    text.style.animation = 'ppSlideUp .6s ease';
    overlay.classList.add('show');
    setTimeout(() => {
        overlay.classList.remove('show');
        if (callback) callback();
    }, 900);
}

/* === START ROUND === */
function startRound() {
    G.gridSize = getGridSize(G.round);
    const targetCount = getTargetCount(G.round);
    const decoyCount = getDecoyCount(G.round);
    G.targets = generateTargets(G.gridSize, targetCount, G.rng);
    G.decoys = generateDecoys(G.gridSize, decoyCount, G.targets, G.rng);
    G.tapped = [];
    G.tappedCorrect = 0;
    G.tappedWrong = 0;
    G.showDecoys = false;

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
        setTimeout(() => {
            if (G.phase !== 'memorize') return;
            G.decoys.forEach(d => {
                G.cellStates[d.r][d.c] = 'decoy';
            });
            G.showDecoys = true;
            drawGrid();
            // Remove decoys after 0.3s
            setTimeout(() => {
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
    setTimeout(() => {
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
    drawGrid();
    SFX.play('correct');
}

/* === HANDLE TAP === */
function handleTap(clientX, clientY) {
    if (G.phase !== 'recall') return;

    const rect = G.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Find which cell was tapped
    const col = Math.floor((x - G.gap) / (G.cellSize + G.gap));
    const row = Math.floor((y - G.gap) / (G.cellSize + G.gap));

    if (row < 0 || row >= G.gridSize || col < 0 || col >= G.gridSize) return;

    // Already tapped?
    if (G.tapped.some(t => t.r === row && t.c === col)) return;
    G.tapped.push({ r: row, c: col });

    // Check if correct
    const isTarget = G.targets.some(t => t.r === row && t.c === col);
    const isDecoy = G.decoys.some(d => d.r === row && d.c === col);

    if (isTarget) {
        G.cellStates[row][col] = 'correct';
        G.tappedCorrect++;
        SFX.play('correct');
        drawGrid();

        // Check if all targets tapped
        if (G.tappedCorrect >= G.targets.length) {
            setTimeout(() => endRound(true), 300);
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
        setTimeout(() => G.canvas.style.animation = '', 400);

        if (G.lives <= 0) {
            G.phase = 'gameover';
            G.gameState = 'lost';
            setTimeout(() => endGame(), 500);
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
        setTimeout(() => {
            G.round++;
            updateUI();
            startRound();
        }, 1200);
    }
}

/* === END GAME === */
function endGame() {
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
    setTimeout(() => showGameOver(), 400);
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
    setTimeout(() => {
        if (typeof AdController !== 'undefined' && AdController.shouldShowInterstitial()) {
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
        G.lives = 999;
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
    updateUI();
    startRound();
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

    switchMode('classic');
});

/* === HINT SYSTEM: Replay pattern at 50% slower speed === */
function usePatternPopHint() {
    if (G.phase !== 'recall') return;

    const replayHint = () => {
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
            setTimeout(() => {
                if (G.phase !== 'memorize') return;
                G.decoys.forEach(d => {
                    G.cellStates[d.r][d.c] = 'decoy';
                });
                drawGrid();
                setTimeout(() => {
                    if (G.phase !== 'memorize') return;
                    G.decoys.forEach(d => {
                        G.cellStates[d.r][d.c] = null;
                    });
                    drawGrid();
                }, 450); // slower decoy display
            }, decoyDelay);
        }

        setTimeout(() => {
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
