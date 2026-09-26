/* ===================================================
   PuzzleVault — MergeChain Logic (mergechain-logic.js)
   Physics-based drop & merge puzzle
   =================================================== */

// Game Constants & Configuration
const CONSTANTS = {
    canvasWidth: 300,
    canvasHeight: 500,
    bounce: -0.3,
    friction: 0.99,
    wallBounce: -0.3,
    dangerLineY: 75,
    dangerTimeLimit: 3000,
    timeAttackLimit: 120,
};

// Difficulty presets
const DIFFICULTY = {
    easy: {
        label: 'Easy',
        gravity: 0.35,
        cooldownMs: 600,
        dropValues: [2, 2, 2, 4],           // 75% 2, 25% 4
        progressiveRate: 0,                   // No scaling
        dangerTime: 4000,                     // 4s grace
    },
    normal: {
        label: 'Normal',
        gravity: 0.5,
        cooldownMs: 500,
        dropValues: [2, 2, 4, 4, 4, 8],      // ~33% 2, ~50% 4, ~17% 8
        progressiveRate: 0.003,               // Mild scaling
        dangerTime: 3000,
    },
    hard: {
        label: 'Hard',
        gravity: 0.65,
        cooldownMs: 400,
        dropValues: [2, 4, 4, 8, 8, 8],      // More 8s, harder to stack
        progressiveRate: 0.008,               // Moderate scaling
        dangerTime: 2500,
    },
    expert: {
        label: 'Expert',
        gravity: 0.85,
        cooldownMs: 300,
        dropValues: [2, 4, 8, 8, 16, 16],    // 16s appear! Huge radii fill fast
        progressiveRate: 0.015,               // Aggressive scaling
        dangerTime: 2000,
    }
};

// Ball configurations from skills.md
const BALL_TYPES = {
    2: { radius: 20, colors: ['#FCA5A5', '#FECDD3'], size: 14 },
    4: { radius: 25, colors: ['#FDE68A', '#FEF3C7'], size: 16 },
    8: { radius: 30, colors: ['#86EFAC', '#BBF7D0'], size: 18 },
    16: { radius: 36, colors: ['#93C5FD', '#BFDBFE'], size: 20 },
    32: { radius: 42, colors: ['#C4B5FD', '#DDD6FE'], size: 22 },
    64: { radius: 48, colors: ['#FBCFE8', '#FCE7F3'], size: 24 },
    128: { radius: 55, colors: ['#FDE68A', '#FEF9C3'], size: 26 },
    256: { radius: 62, colors: ['#A7F3D0', '#D1FAE5'], size: 28 },
    512: { radius: 70, colors: ['#BFDBFE', '#DBEAFE'], size: 30 },
    1024: { radius: 78, colors: ['#DDD6FE', '#EDE9FE'], size: 32 },
    2048: { radius: 88, colors: ['#FDE68A', '#FEF3C7'], size: 36 },
    4096: { radius: 95, colors: ['#F43F5E', '#FDA4AF'], size: 38 }, // Beyond 2048
    8192: { radius: 100, colors: ['#7C3AED', '#C4B5FD'], size: 40 }
};

// State
let M = {
    mode: 'classic',
    difficulty: 'normal', // easy, normal, hard, expert
    balls: [],
    particles: [],
    nextVal: 2,
    score: 0,
    maxMerge: 2,
    chain: 0,
    chainTimeout: null,
    isPlaying: false,
    continueUsed: false,
    hintsUsed: 0,

    // Interaction
    isDragging: false,
    mouseX: CONSTANTS.canvasWidth / 2,
    lastDropTime: 0,

    // Danger state
    dangerStartTime: null,
    dangerSafeStart: null,
    inDanger: false,

    // Time Attack
    timeLeft: CONSTANTS.timeAttackLimit,
    timerInterval: null,

    // Progressive difficulty
    currentGravity: 0.5,
    currentCooldown: 500,
    gameStartTime: 0,

    // Random generator
    rng: null,

    // DOM
    canvas: null,
    ctx: null,
    reqId: null,
    lastFrameTime: 0,
    rawPreviewX: CONSTANTS.canvasWidth / 2
};

// --- Initialization ---
function initMergeChain() {
    M.canvas = document.getElementById('mc-canvas');
    M.ctx = M.canvas.getContext('2d', { alpha: false });

    // Setup tabs
    document.querySelectorAll('#mc-tabs .pv-tab').forEach(t => {
        t.addEventListener('click', (e) => switchMode(e.target.dataset.mode));
    });

    // Setup buttons
    document.getElementById('mc-btn-restart').addEventListener('click', () => startMode(M.mode));
    document.getElementById('mc-btn-help').addEventListener('click', () => {
        document.getElementById('mc-help-modal').classList.add('open');
    });
    document.getElementById('mc-btn-settings').addEventListener('click', toggleSound);
    document.getElementById('mc-btn-stats').addEventListener('click', showStats);

    // Difficulty selector
    document.querySelectorAll('#mc-diff .mc-diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#mc-diff .mc-diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            M.difficulty = btn.dataset.diff;
            startMode(M.mode);
        });
    });

    // Canvas sizing
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Input Handling
    setupInput();

    // Default mode from URL or 'classic'
    const urlParams = new URLSearchParams(window.location.search);
    const m = urlParams.get('mode') || 'classic';
    switchMode(m);

    if (typeof renderCrossPromo === 'function') renderCrossPromo('mergechain');
    if (typeof HintManager !== 'undefined') HintManager.init('mergechain');
}

function setupInput() {
    const handleMove = (e) => {
        if (!M.isPlaying || Date.now() - M.lastDropTime < M.currentCooldown) return;
        const rect = M.canvas.getBoundingClientRect();
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;

        // Map to canvas coordinate space
        let x = (clientX - rect.left) * (CONSTANTS.canvasWidth / rect.width);

        // Clamp to allowed range (keep preview ball mostly visible)
        const pr = getTypeInfo(M.nextVal).radius;
        M.mouseX = Math.max(pr, Math.min(CONSTANTS.canvasWidth - pr, x));
    };

    const handleStart = (e) => {
        if (!M.isPlaying) return;
        M.isDragging = true;
        handleMove(e);
    };

    const handleEnd = (e) => {
        if (!M.isPlaying || !M.isDragging) return;
        M.isDragging = false;
        dropBall();
    };

    M.canvas.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', (e) => { if (M.isDragging) handleMove(e); });
    document.addEventListener('mouseup', handleEnd);

    M.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e); }, { passive: false });
    document.addEventListener('touchmove', (e) => { if (M.isDragging) handleMove(e); }, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', () => { M.isDragging = false; });
    M.canvas.addEventListener('keydown', event => {
        if (!M.isPlaying || event.altKey || event.ctrlKey || event.metaKey) return;
        if (!['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === ' ' || event.key === 'Enter') { if (!event.repeat) dropBall(); return; }
        const radius = getTypeInfo(M.nextVal).radius;
        M.mouseX = Math.max(radius, Math.min(CONSTANTS.canvasWidth - radius, M.mouseX + (event.key === 'ArrowLeft' ? -12 : 12)));
        M.keyboardAim = true;
    });
}

function resizeCanvas() {
    // Physics remains 300 × 500; the backing bitmap uses up to 2× pixel density.
    M.ctx = PVDepth.setupCanvas(M.canvas, CONSTANTS.canvasWidth, CONSTANTS.canvasHeight);
}

// --- Game Modes ---
function switchMode(mode) {
    document.querySelectorAll('#mc-tabs .pv-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.mode === mode);
    });
    startMode(mode);
}

function startMode(mode) {
    if (M.reqId !== null) cancelAnimationFrame(M.reqId);
    if (M.timerInterval !== null) clearInterval(M.timerInterval);

    M.mode = mode;
    M.balls = [];
    M.particles = [];
    M.score = 0;
    M.maxMerge = 2;
    M.chain = 0;
    M.isPlaying = true;
    M.continueUsed = false;
    M.inDanger = false;
    M.dangerStartTime = null;
    M.dangerSafeStart = null;
    M.rawPreviewX = CONSTANTS.canvasWidth / 2;
    M.mouseX = CONSTANTS.canvasWidth / 2;
    M.keyboardAim = false;
    M.gameStartTime = Date.now();
    M.hintsUsed = 0;
    document.getElementById('mc-canvas-wrap').classList.remove('danger');

    // Apply difficulty preset
    const diff = DIFFICULTY[M.difficulty] || DIFFICULTY.normal;
    M.currentGravity = diff.gravity;
    M.currentCooldown = diff.cooldownMs;
    CONSTANTS.dangerTimeLimit = diff.dangerTime;

    // Seed RNG
    if (mode === 'daily') {
        const seed = getDailySeed('mergechain');
        M.rng = new SeededRandom(seed);
        document.getElementById('mc-title').innerHTML = `<span>🔮</span><span>MergeChain</span><span class="nv-daily-tag" style="font-size: 0.75rem; color: var(--pv-blue); font-weight: 600; background: rgba(37, 99, 235, .1); padding: 2px 8px; border-radius: 100px;">Daily #${getDailyNumber()}</span>`;
    } else {
        M.rng = { nextInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min, next: () => Math.random() };
        document.getElementById('mc-title').innerHTML = `<span>🔮</span><span>MergeChain</span>`;
    }

    // UI Resets
    document.getElementById('mc-timer').style.display = (mode === 'time') ? 'block' : 'none';
    M.timeLeft = CONSTANTS.timeAttackLimit;
    if (mode === 'time') {
        updateTimerDisplay();
        M.timerInterval = setInterval(() => {
            M.timeLeft--;
            updateTimerDisplay();
            if (M.timeLeft <= 0) gameOver('Time\'s Up!');
        }, 1000);
    }

    updateUI();
    M.nextVal = generateNextValue();
    M.lastDropTime = 0;
    M.lastFrameTime = performance.now();
    gameLoop(M.lastFrameTime);
}

// --- Gameplay Mechanics ---
function generateNextValue() {
    const diff = DIFFICULTY[M.difficulty] || DIFFICULTY.normal;
    const pool = diff.dropValues;
    const idx = Math.floor(M.rng.next() * pool.length);
    return pool[idx];
}

function getTypeInfo(val) {
    return BALL_TYPES[val] || BALL_TYPES[8192];
}

function dropBall() {
    if (!M.isPlaying) return;
    const now = Date.now();
    if (now - M.lastDropTime < M.currentCooldown) return;

    M.lastDropTime = now;

    const info = getTypeInfo(M.nextVal);
    M.mouseX = Math.max(info.radius, Math.min(CONSTANTS.canvasWidth - info.radius, M.mouseX));
    M.balls.push({
        val: M.nextVal,
        x: M.mouseX,
        y: info.radius + 10,
        vx: 0,
        vy: 2,
        radius: info.radius,
        merged: false,
        bornAt: Date.now(), // Track age for danger-check exclusion
        id: Math.random()
    });

    if (typeof SFX !== 'undefined') SFX.play('tap');

    // Generate next
    M.nextVal = generateNextValue();
    M.chain = 0; // Reset chain on new drop
    updateUI();
}

function createParticles(x, y, color) {
    if (PVDepth.reduced()) return;
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        M.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 2,
            color: color,
            life: 1.0,
            decay: Math.random() * 0.03 + 0.02
        });
    }
    M.particles = M.particles.slice(-120);
}

function showChainPopup(mult) {
    const popup = document.getElementById('mc-chain-popup');
    popup.textContent = `CHAIN x${mult}!`;
    popup.classList.add('show');
    popup.classList.remove('fadeout');

    setTimeout(() => {
        popup.classList.add('fadeout');
        setTimeout(() => popup.classList.remove('show', 'fadeout'), 300);
    }, 800);
}

// --- Physics Engine ---
function updatePhysics() {
    if (!M.isPlaying) return;

    // Progressive difficulty: ramp up gravity and reduce cooldown over time
    const diff = DIFFICULTY[M.difficulty] || DIFFICULTY.normal;
    if (diff.progressiveRate > 0) {
        const elapsed = (Date.now() - M.gameStartTime) / 1000; // seconds
        M.currentGravity = diff.gravity + elapsed * diff.progressiveRate;
        M.currentCooldown = Math.max(200, diff.cooldownMs - elapsed * (diff.progressiveRate * 100));
    }

    let dangerFound = false;

    // 1. Apply forces & move
    for (let i = 0; i < M.balls.length; i++) {
        let b = M.balls[i];
        b.impact = Math.max(0, (b.impact || 0) - .08);

        // Gravity (uses current progressive value)
        b.vy += M.currentGravity;

        // Friction / Air resistance
        b.vx *= CONSTANTS.friction;
        b.vy *= 0.995;

        // Move
        b.x += b.vx;
        b.y += b.vy;

        // Wall collisions
        if (b.x - b.radius < 0) {
            b.x = b.radius;
            b.vx *= CONSTANTS.wallBounce;
        } else if (b.x + b.radius > CONSTANTS.canvasWidth) {
            b.x = CONSTANTS.canvasWidth - b.radius;
            b.vx *= CONSTANTS.wallBounce;
        }

        // Floor collision
        if (b.y + b.radius > CONSTANTS.canvasHeight) {
            if (b.vy > 1.5) b.impact = Math.min(1, b.vy / 12);
            b.y = CONSTANTS.canvasHeight - b.radius;
            b.vy *= CONSTANTS.bounce;
            // Friction on floor
            b.vx *= 0.8;
        }

        // Very bouncy roof to prevent leaving map
        if (b.y - b.radius < -100) {
            b.vy += 2;
        }

        // Check danger — ball top edge above danger line.
        // Exclude freshly dropped balls (< 1.5s old) that are still falling through.
        const ballAge = Date.now() - (b.bornAt || 0);
        if (b.y - b.radius < CONSTANTS.dangerLineY && ballAge > 1500) {
            dangerFound = true;
        }
    }

    // 2. Ball-Ball Collisions (simplified elastic)
    // Multiple sweeps for stability
    const iterations = 3;
    let mergesThisFrame = [];

    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < M.balls.length; i++) {
            for (let j = i + 1; j < M.balls.length; j++) {
                let b1 = M.balls[i];
                let b2 = M.balls[j];

                if (b1.merged || b2.merged) continue;

                let dx = b2.x - b1.x;
                let dy = b2.y - b1.y;
                let distSq = dx * dx + dy * dy;
                let minDist = b1.radius + b2.radius;

                if (distSq < minDist * minDist) {
                    let dist = Math.sqrt(distSq);
                    if (dist === 0) { dx = 0; dy = 1; dist = 1; }

                    // Merge check
                    if (b1.val === b2.val) {
                        b1.merged = true;
                        b2.merged = true;
                        mergesThisFrame.push({ b1, b2 });
                        continue;
                    }

                    // Normal collision resolution (Position correction)
                    let overlap = minDist - dist;
                    let nx = dx / dist;
                    let ny = dy / dist;

                    // Move apart based on mass ratio (radius approx proportional to mass)
                    // Simplified: move equally
                    b1.x -= nx * (overlap / 2) * 0.8;
                    b1.y -= ny * (overlap / 2) * 0.8;
                    b2.x += nx * (overlap / 2) * 0.8;
                    b2.y += ny * (overlap / 2) * 0.8;

                    // Velocity resolution (Elastic)
                    let kx = b1.vx - b2.vx;
                    let ky = b1.vy - b2.vy;
                    let p = 2.0 * (nx * kx + ny * ky) / 2; // Equal mass approx
                    if (Math.abs(p) > 2) {
                        b1.impact = Math.min(1, Math.abs(p) / 15);
                        b2.impact = Math.min(1, Math.abs(p) / 15);
                    }

                    // Damping to simulate energy loss
                    let damping = 0.6;

                    b1.vx -= p * nx * damping;
                    b1.vy -= p * ny * damping;
                    b2.vx += p * nx * damping;
                    b2.vy += p * ny * damping;
                }
            }
        }
    }

    // 3. Process Merges
    if (mergesThisFrame.length > 0) {
        processMerges(mergesThisFrame);
    }

    // Clean up merged
    M.balls = M.balls.filter(b => !b.merged);

    // 4. Update particles
    for (let i = M.particles.length - 1; i >= 0; i--) {
        let p = M.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) M.particles.splice(i, 1);
    }

    // 5. Danger Logic
    handleDangerState(dangerFound);
}

function processMerges(merges) {
    let playSound = false;
    let newBalls = [];

    for (const m of merges) {
        let newVal = m.b1.val * 2;
        let info = getTypeInfo(newVal);

        // Midpoint
        let nx = (m.b1.x + m.b2.x) / 2;
        let ny = (m.b1.y + m.b2.y) / 2;

        // Average velocity + pop upwards
        let nvx = (m.b1.vx + m.b2.vx) / 2;
        let nvy = (m.b1.vy + m.b2.vy) / 2 - 2; // Upward impulse

        let newBall = {
            val: newVal,
            x: nx,
            y: ny,
            vx: nvx,
            vy: nvy,
            radius: info.radius,
            merged: false,
            bornAt: Date.now(),
            impact: 1,
            id: Math.random()
        };
        newBalls.push(newBall);

        // Scoring & Chain
        M.chain++;
        let multiplier = Math.max(1, M.chain);
        let earned = newVal * multiplier;
        M.score += earned;
        M.maxMerge = Math.max(M.maxMerge, newVal);

        if (M.chain > 1) {
            showChainPopup(M.chain);
            if (typeof SFX !== 'undefined') SFX.play('combo');
        } else {
            playSound = true;
        }

        // Visual
        createParticles(nx, ny, info.colors[1]);

        // Extend chain timeout
        if (M.chainTimeout) clearTimeout(M.chainTimeout);
        M.chainTimeout = setTimeout(() => { M.chain = 0; }, 1000);
    }

    if (playSound && typeof SFX !== 'undefined') SFX.play('clear');

    M.balls.push(...newBalls);
    updateUI();
}

function handleDangerState(isDanger) {
    const wrap = document.getElementById('mc-canvas-wrap');

    if (isDanger) {
        M.dangerSafeStart = null; // Reset grace timer
        if (!M.inDanger) {
            M.inDanger = true;
            M.dangerStartTime = Date.now();
            wrap.classList.add('danger');
        } else {
            const elapsed = Date.now() - M.dangerStartTime;
            if (elapsed > CONSTANTS.dangerTimeLimit) {
                gameOver('Field is full!');
            }
        }
    } else {
        // Grace period: only clear danger after 500ms of sustained safety.
        // Physics jitter can briefly push balls below the line; don't reset the 3s timer instantly.
        if (M.inDanger) {
            if (!M.dangerSafeStart) {
                M.dangerSafeStart = Date.now();
            } else if (Date.now() - M.dangerSafeStart > 500) {
                M.inDanger = false;
                M.dangerStartTime = null;
                M.dangerSafeStart = null;
                wrap.classList.remove('danger');
            }
        }
    }
}

// --- Render ---
function drawBlock(ctx, x, y, radius, val, impact = 0) {
    const info = getTypeInfo(val);
    PVDepth.sphere(ctx, x, y, radius, info.colors[0], val, info.size, impact);
}

/** First straight-down contact only; subsequent bounces/rolling are not predicted. */
function getDropGuide(x, radius, balls = M.balls) {
    x = Math.max(radius, Math.min(CONSTANTS.canvasWidth - radius, x));
    let y = CONSTANTS.canvasHeight - radius, target = null;
    for (const ball of balls) {
        if (ball.merged) continue;
        const dx = x - ball.x, distance = radius + ball.radius;
        if (Math.abs(dx) >= distance) continue;
        const contact = ball.y - Math.sqrt(distance * distance - dx * dx);
        if (contact < y) { y = contact; target = ball; }
    }
    return { x, y: Math.max(radius + 10, y), target };
}

function render() {
    let ct = M.ctx;
    const W = CONSTANTS.canvasWidth;
    const H = CONSTANTS.canvasHeight;

    // Recessed vessel with a lit back wall and an inset floor.
    const well = ct.createLinearGradient(0, 0, W, H);
    well.addColorStop(0, '#334155'); well.addColorStop(.45, '#1E293B'); well.addColorStop(1, '#0F172A');
    ct.fillStyle = well;
    ct.fillRect(0, 0, W, H);

    // Subtle grid lines
    ct.strokeStyle = 'rgba(255,255,255,0.04)';
    ct.lineWidth = 1;
    const gridStep = 50;
    for (let gx = gridStep; gx < W; gx += gridStep) {
        ct.beginPath(); ct.moveTo(gx, 0); ct.lineTo(gx, H); ct.stroke();
    }
    for (let gy = gridStep; gy < H; gy += gridStep) {
        ct.beginPath(); ct.moveTo(0, gy); ct.lineTo(W, gy); ct.stroke();
    }
    const edge = ct.createLinearGradient(0, 0, W, 0);
    edge.addColorStop(0, 'rgba(2,6,23,.5)'); edge.addColorStop(.06, 'rgba(255,255,255,.06)');
    edge.addColorStop(.5, 'rgba(255,255,255,0)'); edge.addColorStop(.94, 'rgba(255,255,255,.06)'); edge.addColorStop(1, 'rgba(2,6,23,.5)');
    ct.fillStyle = edge; ct.fillRect(0, 0, W, H);
    ct.fillStyle = 'rgba(148,163,184,.2)'; ct.fillRect(0, H - 5, W, 5);

    // Danger Line
    ct.beginPath();
    ct.moveTo(0, CONSTANTS.dangerLineY);
    ct.lineTo(W, CONSTANTS.dangerLineY);
    ct.lineWidth = 2;
    ct.setLineDash([8, 8]);
    ct.strokeStyle = M.inDanger ? '#F43F5E' : '#D97706';
    ct.stroke();
    ct.setLineDash([]);

    if (!M.isDragging && !M.keyboardAim) {
        const label = document.getElementById('mc-aim-status');
        if (label && label.textContent !== PVDepth.t('landing')) label.textContent = PVDepth.t('landing');
    }

    // Preview Ball (if cooldown passed)
    if (M.isPlaying && Date.now() - M.lastDropTime >= M.currentCooldown) {
        let alpha = M.isDragging || M.keyboardAim ? 1.0 : 0.85;
        ct.globalAlpha = alpha;

        const pInfo = getTypeInfo(M.nextVal);
        const targetX = Math.max(pInfo.radius, Math.min(W - pInfo.radius, M.mouseX));
        // Smoothly follow
        if (!M.rawPreviewX) M.rawPreviewX = targetX;
        M.rawPreviewX += (targetX - M.rawPreviewX) * (PVDepth.reduced() ? 1 : .3);

        drawBlock(ct, M.rawPreviewX, pInfo.radius + 10, pInfo.radius, M.nextVal);

        // Aim line
        if (M.isDragging || M.keyboardAim) {
            const guide = getDropGuide(targetX, pInfo.radius);
            const matching = guide.target && guide.target.val === M.nextVal;
            ct.beginPath();
            ct.moveTo(targetX, pInfo.radius * 2 + 10);
            ct.lineTo(targetX, guide.y);
            ct.strokeStyle = matching ? '#86EFAC' : 'rgba(255,255,255,.55)';
            ct.lineWidth = 2;
            ct.setLineDash([4, 7]); ct.stroke(); ct.setLineDash([]);
            ct.beginPath(); ct.arc(guide.x, guide.y, pInfo.radius - 2, 0, Math.PI * 2);
            ct.fillStyle = matching ? 'rgba(134,239,172,.14)' : 'rgba(255,255,255,.07)'; ct.fill(); ct.stroke();
            if (matching) {
                ct.beginPath(); ct.arc(guide.target.x, guide.target.y, guide.target.radius + 3, 0, Math.PI * 2); ct.stroke();
            }
            const label = document.getElementById('mc-aim-status');
            const message = matching ? PVDepth.t('contact', M.nextVal) : PVDepth.t('landing');
            if (label && label.textContent !== message) label.textContent = message;
        }

        ct.globalAlpha = 1.0;
    }

    // Draw Balls
    for (let b of M.balls) {
        drawBlock(ct, b.x, b.y, b.radius, b.val, b.impact);
    }

    // Draw Particles
    for (let p of M.particles) {
        ct.globalAlpha = p.life;
        ct.beginPath();
        ct.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ct.fillStyle = p.color;
        ct.fill();
    }
    ct.globalAlpha = 1.0;
}

function gameLoop(timestamp) {
    if (!M.isPlaying) return;

    // Delta time could be used for advanced physics, but fixed step is stabler
    updatePhysics();
    render();

    M.reqId = requestAnimationFrame(gameLoop);
}

// --- UI & State ---
function updateUI() {
    document.getElementById('mc-score').textContent = formatNumber(M.score);
    document.getElementById('mc-max').textContent = M.maxMerge;
    document.getElementById('mc-chain').textContent = M.chain > 0 ? `x${M.chain}` : '0';
}

function updateTimerDisplay() {
    const el = document.getElementById('mc-timer');
    const min = Math.floor(M.timeLeft / 60);
    const sec = M.timeLeft % 60;
    el.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    if (M.timeLeft <= 10) el.style.color = 'var(--pv-coral)';
    else el.style.color = 'var(--pv-text)';
}

function toggleSound() {
    if (typeof SFX === 'undefined') return;
    SFX.toggle();
    const btn = document.getElementById('mc-btn-settings');
    btn.textContent = SFX.enabled ? '🔊' : '🔇';
}

// --- Game Over & Results ---
function gameOver(reason) {
    M.isPlaying = false;
    if (M.reqId) cancelAnimationFrame(M.reqId);
    if (M.timerInterval !== null) clearInterval(M.timerInterval);
    document.getElementById('mc-canvas-wrap').classList.remove('danger');

    if (typeof SFX !== 'undefined') SFX.play('gameover');

    // Save stats
    if (typeof updateStats === 'function') {
        updateStats('mergechain', M.score);

        if (M.mode === 'daily') {
            const today = getTodayUTC();
            localStorage.setItem(`pv_mergechain_daily_${today}`, M.score);
            updateStreak('mergechain');
        }

        // Add specific mergechain max score record
        const maxKey = `pv_mergechain_maxMerge`;
        const currMax = parseInt(localStorage.getItem(maxKey) || '0');
        if (M.maxMerge > currMax) localStorage.setItem(maxKey, M.maxMerge);
    }

    showResult(reason);

    // Render mini cross-promo in result card
    setTimeout(() => {
        const promoContainer = document.getElementById('mc-mini-promo');
        if (promoContainer && typeof renderMiniCrossPromo === 'function') {
            renderMiniCrossPromo('mergechain', promoContainer);
        }
    }, 100);

    // Ad refresh
    if (typeof AdController !== 'undefined') AdController.refreshBottomAd();

    // Show interstitial after 2s delay
    setTimeout(() => {
        if (typeof AdController !== 'undefined' && !M.isPlaying && document.getElementById('mc-result').classList.contains('open')) {
            AdController.showInterstitial();
        }
    }, 2000);
}

function continueGame() {
    // Remove balls above the danger line
    const removedCount = M.balls.filter(b => b.y - b.radius < CONSTANTS.dangerLineY).length;
    M.balls = M.balls.filter(b => b.y - b.radius >= CONSTANTS.dangerLineY);

    // Push remaining balls down slightly to create breathing room
    for (let b of M.balls) {
        b.vy = Math.min(b.vy, 0); // Stop upward motion
    }

    // Create particles for visual feedback
    for (let i = 0; i < (PVDepth.reduced() ? 0 : 20); i++) {
        M.particles.push({
            x: Math.random() * CONSTANTS.canvasWidth,
            y: CONSTANTS.dangerLineY,
            vx: (Math.random() - 0.5) * 6,
            vy: Math.random() * -4 - 1,
            radius: Math.random() * 3 + 2,
            color: '#059669',
            life: 1.0,
            decay: Math.random() * 0.02 + 0.01
        });
    }

    // Mark as used
    M.continueUsed = true;

    // Reset danger state
    M.inDanger = false;
    M.dangerStartTime = null;
    M.dangerSafeStart = null;
    document.getElementById('mc-canvas-wrap').classList.remove('danger');

    // Close result overlay
    document.getElementById('mc-result').classList.remove('open');

    // Resume game
    M.isPlaying = true;
    M.lastDropTime = Date.now(); // Brief cooldown after continue

    if (typeof SFX !== 'undefined') SFX.play('clear');

    // Restart Time Attack timer if applicable
    if (M.mode === 'time' && M.timeLeft > 0) {
        M.timerInterval = setInterval(() => {
            M.timeLeft--;
            updateTimerDisplay();
            if (M.timeLeft <= 0) gameOver('Time\'s Up!');
        }, 1000);
    }

    M.lastFrameTime = performance.now();
    gameLoop(M.lastFrameTime);
}

function showResult(titleStr) {
    const overlay = document.getElementById('mc-result');
    const card = document.getElementById('mc-result-card');

    card.innerHTML = `
        <button class="pv-modal-close" onclick="document.getElementById('mc-result').classList.remove('open')" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--pv-text-secondary)">✕</button>
        <div class="result-icon">💥</div>
        <div class="result-title">${titleStr}</div>
        <div class="result-score">${formatNumber(M.score)}</div>
        
        <div class="result-stats">
            <div class="result-stat-item">
                <div class="result-stat-value" style="color:var(--pv-blue)">${M.maxMerge}</div>
                <div class="result-stat-label">Max Merge</div>
            </div>
            <div class="result-stat-item">
                <div class="result-stat-value">${M.balls.length}</div>
                <div class="result-stat-label">Balls Left</div>
            </div>
        </div>
        
        ${!M.continueUsed ? `<div id="ad-reward" style="text-align:center;margin-bottom:12px">
            <button class="pv-btn" onclick="continueGame()" style="background:var(--pv-emerald);color:#fff;width:100%;padding:12px;font-size:1rem;font-weight:700;border-radius:var(--pv-radius);border:none;cursor:pointer">
                ↻ Continue once
            </button>
            <p style="font-size:.7rem;color:var(--pv-text-secondary);margin-top:4px">Removes balls above danger line (1 use)</p>
        </div>` : ''}
        <div class="result-actions">
            <button class="pv-btn pv-btn-primary" onclick="shareResultMC()">📤 Share</button>
            <button class="pv-btn pv-btn-secondary" onclick="document.getElementById('mc-result').classList.remove('open'); startMode(M.mode)">🔄 Play Again</button>
        </div>
        <div id="mc-mini-promo" style="margin-top:12px"></div>
    `;

    overlay.classList.add('open');
}

function shareResultMC() {
    let modeText = M.mode === 'daily' ? `Daily #${getDailyNumber()}` : (M.mode === 'time' ? 'Time Attack' : 'Classic');
    let text = `🔮 MergeChain ${modeText}\n`;
    text += `Highest: ${M.maxMerge} 🏆\n`;
    text += `Score: ${formatNumber(M.score)}\n`;
    if (M.chain > 0) text += `Chain: ×${M.chain}\n`;
    text += 'puzzlevault.pages.dev/mergechain';

    if (typeof shareResult === 'function') shareResult(text);
    else navigator.clipboard.writeText(text).then(() => alert('Copied!'));
}

/* === HINT SYSTEM === */
function useMergeChainHint() {
    if (!M.isPlaying) return;

    const doHint = () => {
        M.hintsUsed++;
        // Show ghost ball at optimal column
        // Find the column where dropping would likely merge
        let bestX = CONSTANTS.canvasWidth / 2;
        let bestScore = -1;

        for (let testX = 30; testX < CONSTANTS.canvasWidth - 30; testX += 20) {
            let score = 0;
            for (const b of M.balls) {
                if (b.val === M.nextVal) {
                    const dist = Math.abs(b.x - testX);
                    if (dist < b.radius * 3) {
                        score += (b.radius * 3 - dist);
                    }
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestX = testX;
            }
        }

        // Draw ghost ball overlay for 2.5 seconds
        const ghostDuration = 2500;
        const ghostStart = Date.now();
        const ghostVal = M.nextVal;
        const ghostInfo = getTypeInfo(ghostVal);

        function drawGhost() {
            if (Date.now() - ghostStart > ghostDuration || !M.isPlaying) return;
            const ct = M.ctx;
            const alpha = PVDepth.reduced() ? .55 : 0.4 + Math.sin((Date.now() - ghostStart) * 0.006) * 0.2;
            ct.globalAlpha = alpha;
            drawBlock(ct, bestX, ghostInfo.radius + 10, ghostInfo.radius, ghostVal);
            // Golden ring
            ct.beginPath();
            ct.arc(bestX, ghostInfo.radius + 10, ghostInfo.radius + 4, 0, Math.PI * 2);
            ct.strokeStyle = '#D97706';
            ct.lineWidth = 3;
            ct.stroke();
            ct.globalAlpha = 1.0;
            requestAnimationFrame(drawGhost);
        }
        requestAnimationFrame(drawGhost);

        if (typeof SFX !== 'undefined') SFX.play('hint');
        if (typeof showToast === 'function') showToast('💡 Try dropping here!');
    };

    if (typeof HintManager !== 'undefined') {
        HintManager.requestHint(doHint);
    } else {
        doHint();
    }
}

function showStats() {
    const modal = document.getElementById('mc-stats-modal');
    const body = document.getElementById('mc-stats-body');

    const bestScore = localStorage.getItem('pv_mergechain_best') || '0';
    const streak = localStorage.getItem('pv_mergechain_streak') || '0';
    const maxMerge = localStorage.getItem('pv_mergechain_maxMerge') || '0';

    body.innerHTML = `
        <div class="nv-stats-row">
            <div>
                <div class="val" style="color:var(--pv-blue)">${formatNumber(parseInt(bestScore))}</div>
                <div class="lbl">Best Score</div>
            </div>
            <div>
                <div class="val">${maxMerge}</div>
                <div class="lbl">Highest Merge</div>
            </div>
            <div>
                <div class="val" style="color:var(--pv-coral)">${streak}🔥</div>
                <div class="lbl">Daily Streak</div>
            </div>
        </div>
    `;

    modal.classList.add('open');
}

// Initial Sound Icon sync
if (typeof SFX !== 'undefined') {
    document.getElementById('mc-btn-settings').textContent = (localStorage.getItem('pv_sound') !== 'off') ? '🔊' : '🔇';
}

// Boot
initMergeChain();
