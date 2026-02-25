/* ===================================================
   PuzzleVault — HexMatch Logic (hexmatch-logic.js)
   Hexagonal color matching puzzle
   =================================================== */

// ─── Constants ───
const HEX_RADIUS = 3;          // Grid radius → diameter 7, ~37 cells
const HEX_SIZE = 26;           // Pixel size (center to corner)
const SQRT3 = Math.sqrt(3);
const CANVAS_W = 400;
const CANVAS_H = 440;
const GRID_CX = CANVAS_W / 2;
const GRID_CY = CANVAS_H / 2 + 10;
const TIDE_INTERVAL = 8;
const RAINBOW_INTERVAL = 8;

const COLORS = ['coral', 'blue', 'emerald', 'amber', 'violet', 'cyan'];
const COLOR_HEX = {
    coral: '#F43F5E', blue: '#2563EB', emerald: '#059669',
    amber: '#D97706', violet: '#7C3AED', cyan: '#0891B2'
};
const COLOR_LIGHT = {
    coral: '#FDA4AF', blue: '#93C5FD', emerald: '#6EE7B7',
    amber: '#FCD34D', violet: '#C4B5FD', cyan: '#67E8F9'
};

const CUBE_DIRS = [
    [1, 0, -1], [1, -1, 0], [0, -1, 1],
    [-1, 0, 1], [-1, 1, 0], [0, 1, -1]
];

const SCORE_TABLE = { 3: 30, 4: 60, 5: 120, 6: 300 }; // 7+ = 600

// ─── State ───
const GameState = { IDLE: 0, SELECTING: 1, ANIMATING: 2, GAMEOVER: 3 };

let H = {
    canvas: null, ctx: null, reqId: null,
    grid: {},           // key "q,r" → { color, isBomb, isRainbow }
    validCells: [],     // [{q,r,s}]
    state: GameState.IDLE,
    score: 0, bestScore: 0, turn: 0,
    selection: [],      // [{q,r,s}]
    selColor: null,
    particles: [],
    animations: [],     // [{cells, startTime, duration, type}]
    bombs: [],          // [{q,r,s}]
    tideWarning: false,
    rainbowTimer: 0,    // frames for rainbow animation
    continueUsed: false,
    rng: null
};

// ─── Grid Key Helpers ───
function K(q, r) { return q + ',' + r; }
function Kc(c) { return c.q + ',' + c.r; }

// ─── Cube Coordinate Utilities ───
function isValid(q, r) {
    const s = -q - r;
    return Math.abs(q) <= HEX_RADIUS && Math.abs(r) <= HEX_RADIUS && Math.abs(s) <= HEX_RADIUS;
}

function getNeighbors(q, r) {
    const out = [];
    for (const [dq, dr, ds] of CUBE_DIRS) {
        const nq = q + dq, nr = r + dr;
        if (isValid(nq, nr)) out.push({ q: nq, r: nr, s: -nq - nr });
    }
    return out;
}

function cubeDistance(a, b) {
    return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

function hexToPixel(q, r) {
    return {
        x: GRID_CX + HEX_SIZE * SQRT3 * (q + r / 2),
        y: GRID_CY + HEX_SIZE * 1.5 * r
    };
}

function pixelToHex(px, py) {
    const x = px - GRID_CX, y = py - GRID_CY;
    const q = (SQRT3 / 3 * x - 1 / 3 * y) / HEX_SIZE;
    const r = (2 / 3 * y) / HEX_SIZE;
    const s = -q - r;
    // Cube rounding
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    else rs = -rq - rr;
    return { q: rq, r: rr, s: rs };
}

// ─── Grid Initialization ───
function generateValidCells() {
    H.validCells = [];
    for (let q = -HEX_RADIUS; q <= HEX_RADIUS; q++) {
        for (let r = -HEX_RADIUS; r <= HEX_RADIUS; r++) {
            const s = -q - r;
            if (Math.abs(s) <= HEX_RADIUS) {
                H.validCells.push({ q, r, s });
            }
        }
    }
}

function randomColor() {
    const rng = H.rng || Math;
    const idx = Math.floor((rng.next ? rng.next() : rng.random()) * COLORS.length);
    return COLORS[idx];
}

function initGrid() {
    H.grid = {};
    H.bombs = [];
    for (const c of H.validCells) {
        H.grid[Kc(c)] = { color: randomColor(), isBomb: false, isRainbow: false };
    }
}

// ─── Q-Column Gravity ───
function getQColumn(q) {
    const col = [];
    for (let r = -HEX_RADIUS; r <= HEX_RADIUS; r++) {
        if (isValid(q, r)) col.push({ q, r, s: -q - r });
    }
    return col; // sorted r ascending (top to bottom)
}

function applyGravity() {
    for (let q = -HEX_RADIUS; q <= HEX_RADIUS; q++) {
        const col = getQColumn(q);
        // Collect non-empty tiles from bottom up
        const tiles = [];
        for (const c of col) {
            const cell = H.grid[Kc(c)];
            if (cell) tiles.push({ ...cell });
        }
        // Place tiles at bottom, empty at top
        for (let i = col.length - 1; i >= 0; i--) {
            const tileIdx = i - (col.length - tiles.length);
            if (tileIdx >= 0) {
                H.grid[Kc(col[i])] = tiles[tileIdx];
            } else {
                H.grid[Kc(col[i])] = null;
            }
        }
    }
}

function fillEmpty() {
    for (const c of H.validCells) {
        if (!H.grid[Kc(c)]) {
            H.grid[Kc(c)] = { color: randomColor(), isBomb: false, isRainbow: false };
        }
    }
}

// ─── Selection Logic ───
function canSelect(cell) {
    if (!cell || H.state !== GameState.IDLE) return false;
    const g = H.grid[Kc(cell)];
    return g && !g.isBomb;
}

function isAdjacentToLast(cell) {
    if (H.selection.length === 0) return true;
    const last = H.selection[H.selection.length - 1];
    return cubeDistance(last, cell) === 1;
}

function isInSelection(cell) {
    return H.selection.some(s => s.q === cell.q && s.r === cell.r);
}

function matchesColor(cell) {
    const g = H.grid[Kc(cell)];
    if (!g) return false;
    if (g.isRainbow) return true;
    if (H.selColor === null) return true;
    return g.color === H.selColor;
}

// ─── Hex Bomb ───
function placeBomb(cells) {
    // Find center cell (median by index)
    const mid = Math.floor(cells.length / 2);
    const bombCell = cells[mid];
    H.grid[Kc(bombCell)] = { color: 'bomb', isBomb: true, isRainbow: false };
    H.bombs.push({ q: bombCell.q, r: bombCell.r, s: bombCell.s });
}

function triggerBomb(bq, br) {
    const bs = -bq - br;
    const destroyed = [];
    for (const c of H.validCells) {
        if (cubeDistance(c, { q: bq, r: br, s: bs }) <= 2) {
            if (H.grid[Kc(c)]) {
                destroyed.push(c);
            }
        }
    }
    // Remove destroyed cells
    for (const c of destroyed) {
        H.grid[Kc(c)] = null;
        createParticles(c.q, c.r, '#F43F5E', 6);
    }
    // Remove bomb from tracking
    H.bombs = H.bombs.filter(b => !(b.q === bq && b.r === br));
    // Score
    const pts = destroyed.length * 20;
    H.score += pts;
    showScorePopup(bq, br, pts);
    if (typeof SFX !== 'undefined') SFX.play('combo');
    // Gravity + fill
    setTimeout(() => {
        applyGravity();
        fillEmpty();
        updateUI();
        H.state = GameState.IDLE;
    }, 300);
}

// ─── Rising Tide ───
function risingTide() {
    // Check if any tile at top of q-columns would be pushed out
    for (let q = -HEX_RADIUS; q <= HEX_RADIUS; q++) {
        const col = getQColumn(q);
        if (col.length === 0) continue;
        const topCell = col[0];
        if (H.grid[Kc(topCell)]) {
            // Top cell is occupied — pushing it up would go out of bounds
            gameOver();
            return;
        }
    }
    // Shift all tiles up (decrease r by 1 within each q-column)
    for (let q = -HEX_RADIUS; q <= HEX_RADIUS; q++) {
        const col = getQColumn(q);
        for (let i = 0; i < col.length - 1; i++) {
            H.grid[Kc(col[i])] = H.grid[Kc(col[i + 1])];
        }
        // Bottom cell gets new random tile
        if (col.length > 0) {
            H.grid[Kc(col[col.length - 1])] = { color: randomColor(), isBomb: false, isRainbow: false };
        }
    }
    // Clear bombs that may have shifted
    H.bombs = H.bombs.filter(b => {
        const g = H.grid[Kc(b)];
        return g && g.isBomb;
    });
    if (typeof SFX !== 'undefined') SFX.play('wrong');
}

// ─── Rainbow Tile ───
function spawnRainbow() {
    const empties = H.validCells.filter(c => {
        const g = H.grid[Kc(c)];
        return g && !g.isBomb && !g.isRainbow;
    });
    if (empties.length === 0) return;
    const idx = Math.floor((H.rng ? H.rng.next() : Math.random()) * empties.length);
    const cell = empties[idx];
    H.grid[Kc(cell)] = { color: 'rainbow', isBomb: false, isRainbow: true };
}

// ─── Particles ───
function createParticles(q, r, color, count) {
    const pos = hexToPixel(q, r);
    for (let i = 0; i < (count || 8); i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1.5;
        H.particles.push({
            x: pos.x, y: pos.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 1.5,
            color: color,
            life: 1.0,
            decay: Math.random() * 0.03 + 0.02
        });
    }
}

let scorePopups = [];
function showScorePopup(q, r, pts) {
    const pos = hexToPixel(q, r);
    scorePopups.push({ x: pos.x, y: pos.y, text: '+' + pts, life: 1.0 });
}

// ─── Turn Processing ───
function processTurn(selectedCells) {
    H.state = GameState.ANIMATING;
    const count = selectedCells.length;

    // Score
    let pts;
    if (count >= 7) pts = 600;
    else pts = SCORE_TABLE[count] || 30;
    H.score += pts;

    const midCell = selectedCells[Math.floor(count / 2)];
    showScorePopup(midCell.q, midCell.r, pts);

    if (typeof SFX !== 'undefined') SFX.play(count >= 5 ? 'combo' : 'clear');

    // Remove selected tiles (except bomb placement)
    const bombTarget = count >= 5;
    for (const c of selectedCells) {
        H.grid[Kc(c)] = null;
        createParticles(c.q, c.r, COLOR_HEX[H.selColor] || '#fff', 4);
    }

    // Place bomb if 5+
    if (bombTarget) {
        placeBomb(selectedCells);
    }

    // Gravity + fill after delay
    setTimeout(() => {
        applyGravity();
        fillEmpty();

        // Increment turn
        H.turn++;
        H.tideWarning = (H.turn % TIDE_INTERVAL === TIDE_INTERVAL - 1);

        // Rising Tide
        if (H.turn > 0 && H.turn % TIDE_INTERVAL === 0) {
            H.tideWarning = false;
            risingTide();
        }

        // Rainbow spawn
        if (H.turn > 0 && H.turn % RAINBOW_INTERVAL === 0) {
            spawnRainbow();
        }

        updateUI();
        if (H.state !== GameState.GAMEOVER) {
            H.state = GameState.IDLE;
        }
    }, 350);
}

// ─── Input Handling ───
function setupInput() {
    const getHexFromEvent = (e) => {
        const rect = H.canvas.getBoundingClientRect();
        const scaleX = H.canvas.width / rect.width;
        const scaleY = H.canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const px = (clientX - rect.left) * scaleX;
        const py = (clientY - rect.top) * scaleY;
        const hex = pixelToHex(px, py);
        if (isValid(hex.q, hex.r)) return hex;
        return null;
    };

    const onDown = (e) => {
        e.preventDefault();
        if (H.state === GameState.GAMEOVER) return;

        const hex = getHexFromEvent(e);
        if (!hex) return;

        const cell = H.grid[Kc(hex)];
        if (!cell) return;

        // Bomb tap
        if (cell.isBomb && H.state === GameState.IDLE) {
            H.state = GameState.ANIMATING;
            triggerBomb(hex.q, hex.r);
            return;
        }

        if (H.state !== GameState.IDLE) return;
        if (cell.isBomb) return;

        H.state = GameState.SELECTING;
        H.selection = [hex];
        H.selColor = cell.isRainbow ? null : cell.color;
    };

    const onMove = (e) => {
        e.preventDefault();
        if (H.state !== GameState.SELECTING) return;

        const hex = getHexFromEvent(e);
        if (!hex) return;
        if (isInSelection(hex)) {
            // Allow backtracking (remove last if going back)
            if (H.selection.length >= 2) {
                const prev = H.selection[H.selection.length - 2];
                if (prev.q === hex.q && prev.r === hex.r) {
                    H.selection.pop();
                }
            }
            return;
        }

        const cell = H.grid[Kc(hex)];
        if (!cell || cell.isBomb) return;

        if (!isAdjacentToLast(hex)) return;

        // Color check
        if (cell.isRainbow) {
            // Rainbow matches anything
        } else if (H.selColor === null) {
            H.selColor = cell.color;
        } else if (cell.color !== H.selColor) {
            return;
        }

        H.selection.push(hex);
        if (typeof SFX !== 'undefined') SFX.play('tap');
    };

    const onUp = (e) => {
        if (H.state !== GameState.SELECTING) return;

        if (H.selection.length >= 3) {
            processTurn([...H.selection]);
        } else {
            if (typeof SFX !== 'undefined' && H.selection.length > 0) SFX.play('wrong');
        }

        H.selection = [];
        H.selColor = null;
        if (H.state === GameState.SELECTING) H.state = GameState.IDLE;
    };

    H.canvas.addEventListener('pointerdown', onDown);
    H.canvas.addEventListener('pointermove', onMove);
    H.canvas.addEventListener('pointerup', onUp);
    H.canvas.addEventListener('pointerleave', onUp);
    H.canvas.style.touchAction = 'none';
}

// ─── Rendering ───
function drawHex(ctx, cx, cy, size, fill, stroke, lw) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i - 30); // pointy-top
        const x = cx + size * Math.cos(angle);
        const y = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
}

function render() {
    const ctx = H.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle hex grid background pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (const c of H.validCells) {
        const pos = hexToPixel(c.q, c.r);
        drawHex(ctx, pos.x, pos.y, HEX_SIZE, null, 'rgba(255,255,255,0.05)', 1);
    }

    // Rising Tide warning — highlight bottom row
    if (H.tideWarning) {
        for (let q = -HEX_RADIUS; q <= HEX_RADIUS; q++) {
            const col = getQColumn(q);
            if (col.length > 0) {
                const bot = col[col.length - 1];
                const pos = hexToPixel(bot.q, bot.r);
                drawHex(ctx, pos.x, pos.y, HEX_SIZE + 2, 'rgba(217,119,6,0.2)', '#D97706', 2);
            }
        }
    }

    // Selection glow
    const selSet = new Set(H.selection.map(s => Kc(s)));
    const selReady = H.selection.length >= 3;

    // Draw tiles
    H.rainbowTimer = (H.rainbowTimer + 1) % 360;
    for (const c of H.validCells) {
        const g = H.grid[Kc(c)];
        if (!g) continue;
        const pos = hexToPixel(c.q, c.r);
        const isSelected = selSet.has(Kc(c));

        let fillColor, lightColor;
        if (g.isBomb) {
            fillColor = '#1E293B';
            lightColor = '#475569';
        } else if (g.isRainbow) {
            const hue = (H.rainbowTimer + c.q * 40 + c.r * 40) % 360;
            fillColor = `hsl(${hue}, 80%, 55%)`;
            lightColor = `hsl(${hue}, 80%, 75%)`;
        } else {
            fillColor = COLOR_HEX[g.color] || '#fff';
            lightColor = COLOR_LIGHT[g.color] || '#fff';
        }

        // Gradient fill
        const grd = ctx.createRadialGradient(
            pos.x - HEX_SIZE * 0.2, pos.y - HEX_SIZE * 0.2, HEX_SIZE * 0.1,
            pos.x, pos.y, HEX_SIZE * 0.9
        );
        grd.addColorStop(0, lightColor);
        grd.addColorStop(1, fillColor);
        drawHex(ctx, pos.x, pos.y, HEX_SIZE - 2, grd, 'rgba(0,0,0,0.15)', 1.5);

        // Selected highlight
        if (isSelected) {
            const glowColor = selReady ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)';
            drawHex(ctx, pos.x, pos.y, HEX_SIZE - 1, null, glowColor, 3);
        }

        // Bomb icon
        if (g.isBomb) {
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${HEX_SIZE * 0.8}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', pos.x, pos.y);
        }

        // Rainbow star
        if (g.isRainbow) {
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${HEX_SIZE * 0.7}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⭐', pos.x, pos.y);
        }
    }

    // Selection line
    if (H.selection.length >= 2) {
        ctx.beginPath();
        ctx.strokeStyle = selReady ? '#FFFFFF' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = selReady ? 4 : 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 0; i < H.selection.length; i++) {
            const pos = hexToPixel(H.selection[i].q, H.selection[i].r);
            if (i === 0) ctx.moveTo(pos.x, pos.y);
            else ctx.lineTo(pos.x, pos.y);
        }
        ctx.stroke();
    }

    // Selection count indicator
    if (H.selection.length >= 1) {
        const last = H.selection[H.selection.length - 1];
        const pos = hexToPixel(last.q, last.r);
        ctx.fillStyle = selReady ? '#059669' : '#F43F5E';
        ctx.beginPath();
        ctx.arc(pos.x + HEX_SIZE * 0.6, pos.y - HEX_SIZE * 0.6, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(H.selection.length, pos.x + HEX_SIZE * 0.6, pos.y - HEX_SIZE * 0.6);
    }

    // Particles
    for (let i = H.particles.length - 1; i >= 0; i--) {
        const p = H.particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.1;
        p.life -= p.decay;
        if (p.life <= 0) { H.particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Score popups
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const sp = scorePopups[i];
        sp.life -= 0.02;
        sp.y -= 1;
        if (sp.life <= 0) { scorePopups.splice(i, 1); continue; }
        ctx.globalAlpha = sp.life;
        ctx.fillStyle = '#FDE68A';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sp.text, sp.x, sp.y);
    }
    ctx.globalAlpha = 1;

    // Rising Tide warning text
    if (H.tideWarning) {
        ctx.fillStyle = 'rgba(217,119,6,0.9)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌊 Rising Tide in 1 turn!', CANVAS_W / 2, 22);
    }

    // Turn counter on canvas
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Turn ' + H.turn, CANVAS_W - 12, 22);
}

function gameLoop() {
    render();
    H.reqId = requestAnimationFrame(gameLoop);
}

// ─── UI Updates ───
function updateUI() {
    document.getElementById('hx-score').textContent = formatNumber(H.score);
    document.getElementById('hx-best').textContent = formatNumber(H.bestScore);
    document.getElementById('hx-turn').textContent = H.turn;
}

function toggleSound() {
    if (typeof SFX === 'undefined') return;
    SFX.toggle();
    document.getElementById('hx-btn-settings').textContent = SFX.enabled ? '🔊' : '🔇';
}

// ─── Game Over & Results ───
function gameOver() {
    H.state = GameState.GAMEOVER;
    if (H.reqId) cancelAnimationFrame(H.reqId);
    if (typeof SFX !== 'undefined') SFX.play('gameover');

    // Save stats
    if (typeof updateStats === 'function') {
        updateStats('hexmatch', H.score);
    }
    H.bestScore = Math.max(H.bestScore, H.score);
    localStorage.setItem('pv_hexmatch_best', H.bestScore);

    showResult();

    if (typeof AdController !== 'undefined') {
        setTimeout(() => AdController.showInterstitial(), 800);
    }
}

function continueGame() {
    // Remove top rows (all cells at r = -HEX_RADIUS, -HEX_RADIUS+1)
    for (const c of H.validCells) {
        if (c.r <= -HEX_RADIUS + 1) {
            H.grid[Kc(c)] = null;
        }
    }
    H.continueUsed = true;
    applyGravity();
    fillEmpty();
    document.getElementById('hx-result').classList.remove('open');
    H.state = GameState.IDLE;
    updateUI();
    if (typeof SFX !== 'undefined') SFX.play('clear');
    gameLoop();
}

function showResult() {
    const overlay = document.getElementById('hx-result');
    const card = document.getElementById('hx-result-card');

    card.innerHTML = `
        <button class="pv-modal-close" onclick="document.getElementById('hx-result').classList.remove('open')" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--pv-text-secondary)">✕</button>
        <div class="result-icon">⬡</div>
        <div class="result-title">Game Over</div>
        <div class="result-score">${formatNumber(H.score)}</div>
        <div class="result-stats">
            <div class="result-stat-item">
                <div class="result-stat-value">${H.turn}</div>
                <div class="result-stat-label">Turns</div>
            </div>
            <div class="result-stat-item">
                <div class="result-stat-value" style="color:var(--pv-blue)">${formatNumber(H.bestScore)}</div>
                <div class="result-stat-label">Best</div>
            </div>
        </div>
        ${!H.continueUsed ? `<div id="ad-reward" style="text-align:center;margin-bottom:12px">
            <button class="pv-btn" onclick="continueGame()" style="background:var(--pv-emerald);color:#fff;width:100%;padding:12px;font-size:1rem;font-weight:700;border-radius:var(--pv-radius);border:none;cursor:pointer">
                🎬 Watch Ad to Continue
            </button>
            <p style="font-size:.7rem;color:var(--pv-text-secondary);margin-top:4px">Clears top rows (1 use)</p>
        </div>` : ''}
        <div class="result-actions">
            <button class="pv-btn pv-btn-primary" onclick="shareResultHX()">📤 Share</button>
            <button class="pv-btn pv-btn-secondary" onclick="document.getElementById('hx-result').classList.remove('open'); startGame()">🔄 Play Again</button>
        </div>
    `;
    overlay.classList.add('open');
}

function shareResultHX() {
    let flag = H.continueUsed ? ' 🔄' : '';
    let text = `⬡ HexMatch${flag}\nScore: ${formatNumber(H.score)}\nTurns: ${H.turn}\npuzzlevault.pages.dev/games/hexmatch`;
    if (typeof shareResult === 'function') shareResult(text);
    else navigator.clipboard.writeText(text).then(() => alert('Copied!'));
}

function showStats() {
    const modal = document.getElementById('hx-stats-modal');
    const body = document.getElementById('hx-stats-body');
    const best = localStorage.getItem('pv_hexmatch_best') || '0';
    const played = localStorage.getItem('pv_hexmatch_played') || '0';
    body.innerHTML = `
        <div class="nv-stats-row">
            <div>
                <div class="val" style="color:var(--pv-blue)">${formatNumber(parseInt(best))}</div>
                <div class="lbl">Best Score</div>
            </div>
            <div>
                <div class="val">${played}</div>
                <div class="lbl">Games Played</div>
            </div>
        </div>
    `;
    modal.classList.add('open');
}

// ─── Game Start ───
function startGame() {
    if (H.reqId) cancelAnimationFrame(H.reqId);
    H.score = 0;
    H.turn = 0;
    H.selection = [];
    H.selColor = null;
    H.particles = [];
    H.bombs = [];
    H.tideWarning = false;
    H.continueUsed = false;
    H.state = GameState.IDLE;
    H.bestScore = parseInt(localStorage.getItem('pv_hexmatch_best') || '0');

    // Track games played
    const played = parseInt(localStorage.getItem('pv_hexmatch_played') || '0');
    localStorage.setItem('pv_hexmatch_played', played + 1);

    initGrid();
    updateUI();
    gameLoop();
}

function initHexMatch() {
    H.canvas = document.getElementById('hx-canvas');
    H.ctx = H.canvas.getContext('2d');
    H.canvas.width = CANVAS_W;
    H.canvas.height = CANVAS_H;

    generateValidCells();
    setupInput();

    // Buttons
    document.getElementById('hx-btn-restart').addEventListener('click', startGame);
    document.getElementById('hx-btn-help').addEventListener('click', () => {
        document.getElementById('hx-help-modal').classList.add('open');
    });
    document.getElementById('hx-btn-settings').addEventListener('click', toggleSound);
    document.getElementById('hx-btn-stats').addEventListener('click', showStats);

    // Initial sound icon
    if (typeof SFX !== 'undefined') {
        document.getElementById('hx-btn-settings').textContent = (localStorage.getItem('pv_sound') !== 'off') ? '🔊' : '🔇';
    }

    startGame();
}

// Boot
initHexMatch();
