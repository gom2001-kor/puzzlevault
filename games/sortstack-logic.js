const GAME_ID = 'sortstack';

const PALETTE = [
    '#F43F5E', // coral
    '#2563EB', // blue
    '#059669', // emerald
    '#D97706', // amber
    '#7C3AED', // violet
    '#0891B2', // cyan
    '#DB2777', // pink
    '#65A30D', // lime
    '#475569', // slate
    '#EA580C'  // orange
];

const STACK_CAP_SIZE = 4;
const BLOCK_SIZE = 44;
const BLOCK_RADIUS = 6;
const STACK_WIDTH = 56;
const STACK_HEIGHT = 190;
const STACK_GAP = 20;

const STACK_DRAW_THICKNESS = 4;
const STACK_DRAW_COLOR = '#94A3B8'; // border
const STACK_DRAW_BG = '#F1F5F9'; // inner

const STACK_Y_BASE = 250;

let state = {
    mode: 'free', // 'free', 'daily', or 'relaxed'
    difficulty: 'Easy',
    colorsCount: 3,
    stacks: [],
    locked: [], // boolean 
    history: [], // { fromStack, toStack }
    movesLimit: Infinity,
    movesMade: 0,
    hintsUsed: 0,
    startTime: 0,
    timerInterval: null,

    selectedStack: -1,

    // UI state
    isGameOver: false,

    animations: [],
    particles: []
};

// Canvas setup
const canvas = document.getElementById('ss-canvas');
const ctx = canvas.getContext('2d');
const gameArea = document.getElementById('ss-game-area');

function getDiffConfig(diff) {
    switch (diff) {
        case 'Easy': return { colors: 3, tubes: 5, moves: Infinity };
        case 'Medium': return { colors: 5, tubes: 7, moves: 50 };
        case 'Hard': return { colors: 7, tubes: 9, moves: 40 };
        case 'Expert': return { colors: 10, tubes: 12, moves: 35 };
        default: return { colors: 3, tubes: 5, moves: Infinity };
    }
}

function initGame(mode, difficulty) {
    if (state.timerInterval) clearInterval(state.timerInterval);

    state.mode = mode;
    state.isGameOver = false;
    state.selectedStack = -1;
    state.history = [];
    state.animations = [];
    state.particles = [];
    state.movesMade = 0;
    state.hintsUsed = 0;

    if (mode === 'daily') {
        const seedStr = getDailySeed(GAME_ID).toString();
        // Difficulty based on day of month (simple cycle to mix it up)
        const day = new Date().getUTCDate();
        if (day % 4 === 1) state.difficulty = 'Easy';
        else if (day % 4 === 2) state.difficulty = 'Medium';
        else if (day % 4 === 3) state.difficulty = 'Hard';
        else state.difficulty = 'Expert';
    } else if (mode === 'relaxed') {
        state.difficulty = difficulty || 'Easy';
    } else {
        state.difficulty = difficulty || 'Easy';
    }

    const config = getDiffConfig(state.difficulty);
    state.colorsCount = config.colors;
    state.movesLimit = (mode === 'relaxed') ? Infinity : config.moves;

    generatePuzzle();
    updateCanvasSize();
    updateUI();

    state.startTime = Date.now();
    startRenderLoop();
}

function generatePuzzle() {
    let numColors = state.colorsCount;
    const config = getDiffConfig(state.difficulty);
    const totalTubes = config.tubes || (numColors + 2);
    state.stacks = [];
    state.locked = [];

    for (let i = 0; i < numColors; i++) {
        state.stacks.push([i, i, i, i]);
        state.locked.push(false);
    }
    // Add empty tubes to reach total tube count
    while (state.stacks.length < totalTubes) {
        state.stacks.push([]);
        state.locked.push(false);
    }

    let moves = numColors * 40;
    let attempts = 0;

    let rng;
    if (state.mode === 'daily') {
        rng = new SeededRandom(getDailySeed(GAME_ID));
    }

    while (moves > 0 && attempts < 15000) {
        attempts++;
        let validReverseMoves = [];
        for (let i = 0; i < state.stacks.length; i++) {
            if (state.stacks[i].length === 0) continue;
            let topBlock = state.stacks[i][state.stacks[i].length - 1];

            let validFrom = false;
            if (state.stacks[i].length === 1) validFrom = true;
            else if (state.stacks[i][state.stacks[i].length - 2] === topBlock) validFrom = true;

            if (validFrom) {
                for (let j = 0; j < state.stacks.length; j++) {
                    if (i !== j && state.stacks[j].length < STACK_CAP_SIZE) {
                        validReverseMoves.push({ from: i, to: j });
                    }
                }
            }
        }

        if (validReverseMoves.length === 0) break;

        let targetIdx = rng ? rng.nextInt(0, validReverseMoves.length - 1) : Math.floor(Math.random() * validReverseMoves.length);
        let move = validReverseMoves[targetIdx];

        let block = state.stacks[move.from].pop();
        state.stacks[move.to].push(block);
        moves--;
    }
}

function updateCanvasSize() {
    // Total width = stacks * (width + gap) + gap
    const totalWidth = state.stacks.length * (STACK_WIDTH + STACK_GAP) + STACK_GAP;
    canvas.width = Math.max(totalWidth, 500);
    // container should scroll if > max-width
}

// ----------------- RENDER LOOP -----------------
let renderId = null;
let lastTime = 0;

function startRenderLoop() {
    if (renderId) cancelAnimationFrame(renderId);
    lastTime = performance.now();
    renderId = requestAnimationFrame(render);
}

function getStackX(index) {
    return STACK_GAP + index * (STACK_WIDTH + STACK_GAP) + STACK_WIDTH / 2;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawBlock(cx, cy, colorIdx, isSelected = false) {
    const size = BLOCK_SIZE;
    const radius = BLOCK_RADIUS;
    const hc = size / 2;

    ctx.save();
    ctx.translate(cx, cy);
    if (isSelected) {
        ctx.scale(1.05, 1.05);
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
    }

    ctx.fillStyle = PALETTE[colorIdx];
    drawRoundedRect(ctx, -hc, -hc, size, size, radius);
    ctx.fill();

    // Highlight top
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    drawRoundedRect(ctx, -hc, -hc, size, size / 2, radius);
    ctx.fill();

    // Border
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.stroke();

    ctx.restore();
}

function render(time) {
    const dt = time - lastTime;
    lastTime = time;

    // Check dark mode
    const isDark = document.body.classList.contains('dark-mode') || window.matchMedia('(prefers-color-scheme: dark)').matches;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw animations
    updateAnimations(dt);
    updateParticles(dt);

    // Draw stacks
    for (let i = 0; i < state.stacks.length; i++) {
        let cx = getStackX(i);
        let sy = STACK_Y_BASE - STACK_HEIGHT;

        ctx.save();

        // Shake animation effect
        let shakeOffset = 0;
        let shakeAnim = state.animations.find(a => a.type === 'shake' && a.stackIdx === i);
        if (shakeAnim) {
            shakeOffset = Math.sin(shakeAnim.progress * Math.PI * 6) * 5;
            cx += shakeOffset;
        }

        // Drawer background
        ctx.fillStyle = isDark ? '#1E293B' : STACK_DRAW_BG;
        ctx.fillRect(cx - STACK_WIDTH / 2, sy, STACK_WIDTH, STACK_HEIGHT);

        // Drawer borders (U-shape)
        ctx.lineWidth = STACK_DRAW_THICKNESS;
        ctx.strokeStyle = isDark ? '#475569' : STACK_DRAW_COLOR;
        ctx.beginPath();
        ctx.moveTo(cx - STACK_WIDTH / 2, sy);
        ctx.lineTo(cx - STACK_WIDTH / 2, sy + STACK_HEIGHT);
        ctx.lineTo(cx + STACK_WIDTH / 2, sy + STACK_HEIGHT);
        ctx.lineTo(cx + STACK_WIDTH / 2, sy);
        ctx.stroke();

        // Draw locked icon if locked
        if (state.locked[i]) {
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔒', cx, STACK_Y_BASE + 24);
        }

        ctx.restore();

        // Draw blocks in stack
        let stackArr = state.stacks[i];
        for (let j = 0; j < stackArr.length; j++) {
            // Skip drawing if block is currently animated moving FROM this stack
            let movingAnim = state.animations.find(a => a.type === 'arc' && a.fromIdx === i && j === stackArr.length - 1 && a.moving);
            if (movingAnim) continue;

            let bx = cx;
            let by = STACK_Y_BASE - STACK_DRAW_THICKNESS - (BLOCK_SIZE / 2) - j * (BLOCK_SIZE + 2);

            let isSelected = (state.selectedStack === i && j === stackArr.length - 1);
            if (isSelected) {
                by -= 20; // Lift up selected block
            }

            drawBlock(bx, by, stackArr[j], isSelected);
        }
    }

    // Draw moving blocks
    let arcs = state.animations.filter(a => a.type === 'arc' && a.moving);
    for (let a of arcs) {
        drawBlock(a.cx, a.cy, a.color, true);
    }

    // Draw particles (sparkles)
    for (let p of state.particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    renderId = requestAnimationFrame(render);
}

function updateAnimations(dt) {
    for (let i = state.animations.length - 1; i >= 0; i--) {
        let a = state.animations[i];
        a.elapsed += dt;
        a.progress = Math.min(a.elapsed / a.duration, 1);

        if (a.type === 'arc') {
            // Arc interpolation
            let p = a.progress;
            // Easing
            let ease = p * (2 - p); // out-quad

            // X interpolation
            a.cx = a.startX + (a.endX - a.startX) * ease;

            // Y interpolation (arc)
            let arcHeight = a.arcHeight || 80;
            a.cy = a.startY + (a.endY - a.startY) * ease - Math.sin(p * Math.PI) * arcHeight;

            if (p >= 1) {
                // Complete arc
                if (a.onComplete) a.onComplete();
                state.animations.splice(i, 1);
            }
        }
        else if (a.type === 'shake') {
            if (a.progress >= 1) {
                state.animations.splice(i, 1);
            }
        }
    }
}

function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        let p = state.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.005 * dt; // gravity
        p.rotation += p.vr * dt;
        if (p.life <= 0) {
            state.particles.splice(i, 1);
        }
    }
}

function spawnSparkles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        state.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 1.0) * 0.4,
            vr: (Math.random() - 0.5) * 0.01,
            size: Math.random() * 4 + 2,
            color: color || '#FDE68A',
            life: 800 + Math.random() * 400,
            maxLife: 1200
        });
    }
}

// ----------------- INTERACTION -----------------

canvas.addEventListener('pointerdown', (e) => {
    if (state.isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const sf = canvas.width / rect.width; // scale factor
    const x = (e.clientX - rect.left) * sf;
    const y = (e.clientY - rect.top) * sf;

    // Find clicked stack
    let clickedStack = -1;
    for (let i = 0; i < state.stacks.length; i++) {
        let cx = getStackX(i);
        // Hitbox: +/- STACK_WIDTH
        if (Math.abs(x - cx) < STACK_WIDTH) {
            clickedStack = i;
            break;
        }
    }

    if (clickedStack !== -1 && !state.locked[clickedStack]) {
        handleStackClick(clickedStack);
    }
});

function handleStackClick(idx) {
    // If arc animation is running, ignore clicks to prevent glitch
    if (state.animations.some(a => a.type === 'arc')) return;

    if (state.selectedStack === -1) {
        // Select logic
        if (state.stacks[idx].length > 0) {
            state.selectedStack = idx;
            SFX.play('tap');
        }
    } else {
        // Deselect if same
        if (state.selectedStack === idx) {
            state.selectedStack = -1;
            SFX.play('tap');
            return;
        }

        // Attempt move
        let fromIdx = state.selectedStack;
        let toIdx = idx;

        let fromStack = state.stacks[fromIdx];
        let toStack = state.stacks[toIdx];

        let color = fromStack[fromStack.length - 1];

        // Validation
        let valid = false;
        if (toStack.length < STACK_CAP_SIZE) {
            if (toStack.length === 0 || toStack[toStack.length - 1] === color) {
                valid = true;
            }
        }

        if (valid) {
            state.selectedStack = -1; // hide selected logic
            executeMove(fromIdx, toIdx, color);
        } else {
            // Invalid - Shake target stack
            SFX.play('wrong');
            state.animations.push({
                type: 'shake',
                stackIdx: toIdx,
                elapsed: 0,
                duration: 300
            });
            // Deselect 
            state.selectedStack = -1;
        }
    }
}

function getBlockY(stackLength) {
    return STACK_Y_BASE - STACK_DRAW_THICKNESS - (BLOCK_SIZE / 2) - (stackLength) * (BLOCK_SIZE + 2);
}

function executeMove(fromIdx, toIdx, color, isUndo = false) {
    // Record history
    if (!isUndo) {
        state.history.push({ from: fromIdx, to: toIdx, color: color });
        state.movesMade++;
        updateUI();
    }

    let startX = getStackX(fromIdx);
    let startY = getBlockY(state.stacks[fromIdx].length - 1) - 20; // slightly above

    let endX = getStackX(toIdx);
    let endY = getBlockY(state.stacks[toIdx].length); // length before pushing

    // Remove block physically, but animate visually
    state.stacks[fromIdx].pop();
    // unlock if from stack was locked (for undo, though normally we don't undo locked stacks if we don't allow it. Let's allow it)
    if (state.locked[fromIdx]) {
        state.locked[fromIdx] = false;
        // If undo un-completes a stack, we should ideally remove the empty stack added.
        // But for simplicity, we keep the empty stack. Workspace just stays big!
    }

    state.animations.push({
        type: 'arc',
        moving: true,
        fromIdx: fromIdx,
        toIdx: toIdx,
        color: color,
        startX: startX, startY: startY,
        endX: endX, endY: endY,
        arcHeight: Math.max(80, Math.abs(endX - startX) * 0.3),
        elapsed: 0,
        duration: 250,
        onComplete: () => {
            state.stacks[toIdx].push(color);
            checkStackCompletion(toIdx);
            checkGameOver();
            SFX.play('tap');
        }
    });
}

function checkStackCompletion(idx) {
    let stack = state.stacks[idx];
    if (stack.length === STACK_CAP_SIZE) {
        let first = stack[0];
        let allSame = stack.every(c => c === first);
        if (allSame) {
            state.locked[idx] = true;
            SFX.play('combo');
            spawnSparkles(getStackX(idx), getBlockY(2), PALETTE[first]);

            // UNIQUE MECHANIC: Add new empty stack!
            state.stacks.push([]);
            state.locked.push(false);
            updateCanvasSize();

            // Auto scroll to right
            setTimeout(() => {
                if (gameArea) {
                    gameArea.scrollTo({ left: gameArea.scrollWidth, behavior: 'smooth' });
                }
            }, 100);
        }
    }
}

function undoMove() {
    if (state.history.length === 0 || state.isGameOver) return;
    if (state.animations.some(a => a.type === 'arc')) return;

    let lastMove = state.history.pop();

    // Restore move in reverse
    executeMove(lastMove.to, lastMove.from, lastMove.color, true);
    state.selectedStack = -1;

    if (state.movesLimit !== Infinity) {
        state.movesMade--; // Decrement moves on undo? Yes, undo restores a move.
        updateUI();
    }
}

function checkGameOver() {
    // Check if limits exceeded
    if (state.movesLimit !== Infinity && state.movesMade >= state.movesLimit) {
        // Did they solve it exactly on last move?
        if (isSolved()) {
            winGame();
        } else {
            loseGame();
        }
        return;
    }

    if (isSolved()) {
        winGame();
    }
}

function isSolved() {
    let colorsCount = 0;
    for (let i = 0; i < state.stacks.length; i++) {
        if (state.stacks[i].length > 0) {
            if (state.stacks[i].length !== STACK_CAP_SIZE) return false;
            let c0 = state.stacks[i][0];
            if (!state.stacks[i].every(c => c === c0)) return false;
            colorsCount++;
        }
    }
    return colorsCount === state.colorsCount;
}

function winGame() {
    state.isGameOver = true;
    SFX.play('win');

    // Save stats
    let timeTaken = Math.floor((Date.now() - state.startTime) / 1000);

    let stats = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_stats`)) || {
        played: 0, won: 0, bestEasy: null, bestMedium: null, bestHard: null, bestExpert: null
    };
    stats.played++;
    stats.won++;

    // Save daily
    if (state.mode === 'daily') {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`pv_${GAME_ID}_daily_${today}`, JSON.stringify({
            moves: state.movesMade,
            time: timeTaken
        }));

        let streak = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_streak`)) || { current: 0, max: 0, lastDaily: null };
        if (streak.lastDaily !== today) {
            let yesterday = new Date();
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);
            let yesterdayStr = yesterday.toISOString().slice(0, 10);

            if (streak.lastDaily === yesterdayStr) {
                streak.current++;
            } else {
                streak.current = 1;
            }
            if (streak.current > streak.max) streak.max = streak.current;
            streak.lastDaily = today;
            localStorage.setItem(`pv_${GAME_ID}_streak`, JSON.stringify(streak));
        }
    } else {
        // Update best times for Free Play
        let key = 'best' + state.difficulty;
        if (stats[key] === null || timeTaken < stats[key]) {
            stats[key] = timeTaken;
        }
    }

    localStorage.setItem(`pv_${GAME_ID}_stats`, JSON.stringify(stats));

    // Calculate score: 500 base + move efficiency + no-hint bonus
    let score = 500;
    if (state.movesLimit !== Infinity) {
        score += Math.max(0, (state.movesLimit - state.movesMade) * 20);
    }
    if (state.hintsUsed === 0) {
        score = Math.round(score * 1.3);
    }
    if (typeof updateStats === 'function') updateStats(GAME_ID, score);

    // Render result card
    renderResultCard(true, timeTaken, score);
}

function loseGame() {
    state.isGameOver = true;
    SFX.play('gameover');

    let stats = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_stats`)) || {
        played: 0, won: 0, bestEasy: null, bestMedium: null, bestHard: null, bestExpert: null
    };
    stats.played++;
    localStorage.setItem(`pv_${GAME_ID}_stats`, JSON.stringify(stats));

    renderResultCard(false, 0, 0);
}

function updateUI() {
    const undoBtn = document.getElementById('ss-btn-undo');
    if (undoBtn) undoBtn.disabled = state.history.length === 0;

    const countEl = document.getElementById('ss-moves-counter');
    if (countEl) {
        if (state.movesLimit === Infinity) {
            countEl.textContent = `Moves: ${state.movesMade}`;
            countEl.className = 'ss-moves-counter';
        } else {
            countEl.textContent = `Moves: ${state.movesMade} / ${state.movesLimit}`;
            if (state.movesMade >= state.movesLimit - 3) {
                countEl.className = 'ss-moves-counter danger';
            } else {
                countEl.className = 'ss-moves-counter';
            }
        }
    }
}

function renderResultCard(isWin, timeSeconds, score) {
    const el = document.getElementById('ss-result-card');
    const overlay = document.getElementById('ss-result');
    if (!el || !overlay) return;

    let html = '';
    if (isWin) {
        const min = Math.floor(timeSeconds / 60);
        const sec = (timeSeconds % 60).toString().padStart(2, '0');
        const underLimit = state.movesLimit !== Infinity && state.movesMade < state.movesLimit;
        const stars = underLimit ? '⭐⭐⭐' : (state.hintsUsed === 0 ? '⭐⭐' : '⭐');

        html = `
            <button class="pv-modal-close" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--pv-text-secondary);" onclick="dismissResult()">✕</button>
            <div class="ss-result-title">🧩 Sort Complete!</div>
            <div class="ss-result-subtitle">${state.mode === 'daily' ? 'Daily Challenge' : state.difficulty + ' Mode'}</div>
            <div style="font-size:1.5rem;margin:8px 0">${stars}</div>
            <div class="ss-result-stats">
                <div class="ss-stat-item">
                    <div class="ss-stat-val">${state.movesMade}</div>
                    <div class="ss-stat-lbl">Moves</div>
                </div>
                <div class="ss-stat-item">
                    <div class="ss-stat-val">${min}:${sec}</div>
                    <div class="ss-stat-lbl">Time</div>
                </div>
                <div class="ss-stat-item">
                    <div class="ss-stat-val">${formatNumber(score)}</div>
                    <div class="ss-stat-lbl">Score</div>
                </div>
            </div>
            <div class="result-actions">
                <button class="pv-btn pv-btn-primary" onclick="shareSS()">📤 Share</button>
                <button class="pv-btn pv-btn-secondary" onclick="restartPlay()">🔄 Play Again</button>
            </div>
            <div id="ss-mini-promo"></div>
        `;
    } else {
        html = `
            <button class="pv-modal-close" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--pv-text-secondary);" onclick="dismissResult()">✕</button>
            <div class="ss-result-title">Out of Moves!</div>
            <div class="ss-result-subtitle">${state.difficulty} Mode</div>
            <p style="margin-bottom: 24px; color: var(--pv-text-secondary); font-size: 0.9rem;">You've hit the move limit.</p>
            <div class="result-actions">
                <button class="pv-btn pv-btn-primary" onclick="restartPlay()">🔄 Try Again</button>
            </div>
            <div id="ss-mini-promo"></div>
        `;
    }

    el.innerHTML = html;
    overlay.classList.add('show');

    // Render mini cross-promo inside result modal
    if (typeof renderMiniCrossPromo === 'function') {
        const promoContainer = document.getElementById('ss-mini-promo');
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
    const overlay = document.getElementById('ss-result');
    if (overlay) overlay.classList.remove('show');
    if (typeof AdController !== 'undefined') AdController.refreshBottomAd();
}

window.restartPlay = function () {
    const overlay = document.getElementById('ss-result');
    if (overlay) overlay.classList.remove('show');
    if (window.AdController) AdController.hideInterstitial();

    if (state.mode === 'daily') {
        initGame('daily');
    } else if (state.mode === 'relaxed') {
        initGame('relaxed', state.difficulty);
    } else {
        initGame('free', state.difficulty);
    }
}

// ----------------- INIT UI EVENTS -----------------
document.addEventListener('DOMContentLoaded', () => {
    // Mode tabs
    document.querySelectorAll('#ss-tabs .pv-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('#ss-tabs .pv-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            let mode = e.target.dataset.mode;

            if (mode === 'daily') {
                document.getElementById('ss-diff-select').style.display = 'none';
                document.getElementById('ss-game-container').style.display = 'block';
                document.getElementById('ss-daily-tag').style.display = 'inline-block';
                document.getElementById('ss-daily-tag').textContent = 'Daily';
                initGame('daily');
            } else if (mode === 'relaxed') {
                document.getElementById('ss-diff-select').style.display = 'none';
                document.getElementById('ss-game-container').style.display = 'block';
                document.getElementById('ss-daily-tag').style.display = 'inline-block';
                document.getElementById('ss-daily-tag').textContent = 'Relaxed';
                initGame('relaxed', 'Easy');
            } else {
                document.getElementById('ss-diff-select').style.display = 'flex';
                document.getElementById('ss-game-container').style.display = 'none';
                document.getElementById('ss-daily-tag').style.display = 'none';
                renderDiffSelect();
            }
        });
    });

    // Help & settings
    document.getElementById('ss-btn-help').addEventListener('click', () => {
        document.getElementById('ss-help-modal').classList.add('open');
    });
    document.getElementById('ss-btn-settings').addEventListener('click', () => {
        SFX.toggle();
        document.getElementById('ss-btn-settings').textContent = SFX.enabled ? '🔊' : '🔇';
        showToast(SFX.enabled ? 'Sound On' : 'Sound Off');
    });
    document.getElementById('ss-btn-stats').addEventListener('click', () => {
        let stats = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_stats`)) || { played: 0, won: 0, bestEasy: null, bestMedium: null, bestHard: null, bestExpert: null };
        let streak = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_streak`)) || { current: 0, max: 0 };

        let winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

        const formatTime = (secs) => {
            if (secs === null) return '--';
            const m = Math.floor(secs / 60);
            const s = (secs % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        };

        const html = `
            <div class="ss-stats-row">
                <div class="ss-stat-box"><div class="val">${stats.played}</div><div class="lbl">Played</div></div>
                <div class="ss-stat-box"><div class="val">${winRate}%</div><div class="lbl">Win %</div></div>
            </div>
            <div class="ss-stats-row">
                <div class="ss-stat-box"><div class="val">${streak.current}</div><div class="lbl">Current Streak</div></div>
                <div class="ss-stat-box"><div class="val">${streak.max}</div><div class="lbl">Max Streak</div></div>
            </div>
            <h4 style="margin: 20px 0 12px; text-align: center; color: var(--pv-text); font-size: 0.9rem; text-transform: uppercase;">Best Times</h4>
            <div class="ss-stats-row mb-lg">
                <div class="ss-stat-box"><div class="val" style="color:var(--pv-emerald); font-size: 1rem;">${formatTime(stats.bestEasy)}</div><div class="lbl">Easy</div></div>
                <div class="ss-stat-box"><div class="val" style="color:var(--pv-blue); font-size: 1rem;">${formatTime(stats.bestMedium)}</div><div class="lbl">Medium</div></div>
                <div class="ss-stat-box"><div class="val" style="color:var(--pv-amber); font-size: 1rem;">${formatTime(stats.bestHard)}</div><div class="lbl">Hard</div></div>
                <div class="ss-stat-box"><div class="val" style="color:var(--pv-coral); font-size: 1rem;">${formatTime(stats.bestExpert)}</div><div class="lbl">Expert</div></div>
            </div>
        `;
        document.getElementById('ss-stats-body').innerHTML = html;
        document.getElementById('ss-stats-modal').classList.add('open');
    });

    // Undo btn
    document.getElementById('ss-btn-undo').addEventListener('click', undoMove);

    // Start default
    document.getElementById('ss-daily-tag').style.display = 'inline-block';
    document.getElementById('ss-daily-tag').textContent = 'Daily';
    initGame('daily');

    if (typeof renderCrossPromo === 'function') renderCrossPromo(GAME_ID);
    if (typeof HintManager !== 'undefined') HintManager.init(GAME_ID);
});

/* === SHARE === */
window.shareSS = function () {
    const dayNum = getDailyNumber();
    const isDaily = state.mode === 'daily';
    const underLimit = state.movesLimit !== Infinity && state.movesMade < state.movesLimit;
    const stars = underLimit ? '⭐⭐⭐ (under limit!)' : '';
    let text = `📚 SortStack${isDaily ? ' Daily #' + dayNum : ''}\n`;
    text += `✅ Solved in ${state.movesMade} moves\n`;
    if (stars) text += `${stars}\n`;
    text += 'puzzlevault.pages.dev/sortstack';
    shareResult(text);
};

/* === HINT SYSTEM === */
window.useSortStackHint = function () {
    if (state.isGameOver) return;
    if (state.animations.some(a => a.type === 'arc')) return;

    const revealHint = () => {
        state.hintsUsed++;
        // Find a valid move: source tube with blocks -> destination with matching top or empty
        for (let i = 0; i < state.stacks.length; i++) {
            if (state.locked[i] || state.stacks[i].length === 0) continue;
            const topColor = state.stacks[i][state.stacks[i].length - 1];
            for (let j = 0; j < state.stacks.length; j++) {
                if (i === j || state.locked[j]) continue;
                if (state.stacks[j].length >= STACK_CAP_SIZE) continue;
                if (state.stacks[j].length === 0 || state.stacks[j][state.stacks[j].length - 1] === topColor) {
                    // Found valid move: highlight source and destination
                    showToast(`💡 Move from tube ${i + 1} → tube ${j + 1}`);
                    SFX.play('hint');
                    // Brief visual highlight via selection
                    state.selectedStack = i;
                    setTimeout(() => {
                        state.selectedStack = -1;
                    }, 1500);
                    return;
                }
            }
        }
        showToast('💡 No moves available!');
    };

    if (typeof HintManager !== 'undefined') {
        HintManager.requestHint(revealHint);
    } else {
        revealHint();
    }
};

function renderDiffSelect() {
    const cont = document.getElementById('ss-diff-select');
    cont.innerHTML = `
        <button class="ss-diff-btn" onclick="startFreePlay('Easy')">
            <strong>Easy</strong><span>3 colors · 5 tubes (Unlimited moves)</span>
        </button>
        <button class="ss-diff-btn" onclick="startFreePlay('Medium')">
            <strong>Medium</strong><span>5 colors · 7 tubes (50 moves)</span>
        </button>
        <button class="ss-diff-btn" onclick="startFreePlay('Hard')">
            <strong>Hard</strong><span>7 colors · 9 tubes (40 moves)</span>
        </button>
        <button class="ss-diff-btn" onclick="startFreePlay('Expert')">
            <strong>Expert</strong><span>10 colors · 12 tubes (35 moves)</span>
        </button>
    `;
}

window.startFreePlay = function (diff) {
    document.getElementById('ss-diff-select').style.display = 'none';
    document.getElementById('ss-game-container').style.display = 'block';
    initGame('free', diff);
}

// Ensure resize updates canvas bounds tracking
window.addEventListener('resize', () => {
    updateCanvasSize();
});
