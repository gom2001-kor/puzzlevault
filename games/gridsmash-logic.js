/* ===================================================
   GridSmash — Game Logic (gridsmash-logic.js)
   Block placement puzzle on 10×10 grid
   =================================================== */

/* === PIECE DEFINITIONS (20 types as [row,col] offsets) === */
const PIECES = [
    [[0, 0]], // 1-cell dot
    [[0, 0], [0, 1]], // 2h
    [[0, 0], [1, 0]], // 2v
    [[0, 0], [0, 1], [0, 2]], // 3h
    [[0, 0], [1, 0], [2, 0]], // 3v
    [[0, 0], [1, 0], [1, 1]], // L1
    [[0, 0], [0, 1], [1, 0]], // L2
    [[0, 0], [0, 1], [1, 1]], // L3
    [[0, 1], [1, 0], [1, 1]], // L4
    [[0, 0], [0, 1], [1, 0], [1, 1]], // 2x2 square
    [[0, 1], [1, 0], [1, 1], [1, 2]], // T-down
    [[0, 0], [1, 0], [1, 1], [2, 0]], // T-right
    [[0, 0], [0, 1], [0, 2], [1, 1]], // T-up
    [[0, 0], [0, 1], [1, 0], [2, 0]], // T-left (variant)
    [[0, 0], [0, 1], [1, 1], [1, 2]], // S
    [[0, 1], [0, 2], [1, 0], [1, 1]], // Z
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], // 5h
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], // 5v
    [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], // plus
    [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]], // U
];
const PASTEL_COLORS = ['#93C5FD', '#FCA5A5', '#86EFAC', '#FDE68A', '#C4B5FD', '#FBCFE8'];
const GRID_SIZE = 10;
const CELL_PAD = 2;

/* === GAME STATE === */
let G = {};
function resetState() {
    G = {
        mode: 'classic',
        grid: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
        pieces: [], currentPieceColors: [],
        piecesPlaced: [false, false, false],
        score: 0, linesCleared: 0, bestCombo: 0,
        comboStreak: 0, turn: 1,
        shatterZone: null,
        wildPiece: null, wildUsed: false,
        gameState: 'playing',
        dragPiece: null, dragIdx: -1, dragOffset: { x: 0, y: 0 },
        dragGridPos: null, dragValid: false,
        undoState: null, undoUsed: false,
        // Daily/Sprint
        rng: null, timerValue: 180, timerInterval: null,
        sprintLines: 0, sprintStartTime: 0,
        // Canvas
        canvas: null, ctx: null, cellSize: 0,
        animating: false, clearAnims: [],
    };
}

/* === INIT === */
function initGame() {
    resetState();
    G.canvas = document.getElementById('gs-canvas');
    G.ctx = G.canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setupDragListeners();
    document.getElementById('gs-tabs').addEventListener('click', e => {
        const tab = e.target.closest('.pv-tab');
        if (tab) switchMode(tab.dataset.mode);
    });
    document.getElementById('gs-btn-settings').onclick = () => {
        SFX.toggle();
        document.getElementById('gs-btn-settings').textContent = SFX.enabled ? '🔊' : '🔇';
        showToast(SFX.enabled ? 'Sound On' : 'Sound Off');
    };
    document.getElementById('gs-btn-restart').onclick = () => {
        if (G.gameState !== 'playing' || confirm('Restart current game?')) {
            switchMode(G.mode);
        }
    };
    if (typeof renderCrossPromo === 'function') renderCrossPromo('gridsmash');
    switchMode('classic');
}

function resizeCanvas() {
    const wrap = document.getElementById('gs-canvas-wrap');
    const w = Math.min(500, wrap.clientWidth);
    G.canvas.width = w; G.canvas.height = w;
    G.cellSize = w / GRID_SIZE;
    drawGrid();
}

/* === MODE SWITCHING === */
function switchMode(mode) {
    document.querySelectorAll('#gs-tabs .pv-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    clearInterval(G.timerInterval);
    resetState();
    G.mode = mode;
    G.canvas = document.getElementById('gs-canvas');
    G.ctx = G.canvas.getContext('2d');
    resizeCanvas();
    document.getElementById('gs-timer').style.display = (mode === 'daily') ? 'block' : 'none';
    document.getElementById('gs-sprint-info').style.display = (mode === 'sprint') ? 'block' : 'none';
    if (mode === 'daily') {
        G.rng = new SeededRandom(getDailySeed('gridsmash'));
        G.timerValue = 180;
        startTimer();
    } else if (mode === 'sprint') {
        G.sprintStartTime = Date.now();
        G.sprintLines = 0;
    } else if (mode === 'zen') {
        // no shatter zone, no score tracking
    }
    if (mode !== 'daily') G.rng = null;
    spawnPieces();
    updateUI();
    drawGrid();
}

function startTimer() {
    const el = document.getElementById('gs-timer');
    el.style.display = 'block';
    // Show initial value immediately
    el.textContent = '3:00';
    el.className = 'gs-timer safe';
    G.timerInterval = setInterval(() => {
        G.timerValue = Math.max(0, G.timerValue - 0.1);
        const s = Math.ceil(G.timerValue);
        const m = Math.floor(s / 60);
        el.textContent = `${m}:${(s % 60).toString().padStart(2, '0')}`;
        el.className = 'gs-timer ' + (s > 30 ? 'safe' : '');
        if (G.timerValue <= 0) { clearInterval(G.timerInterval); endGame(); }
    }, 100);
}

/* === PIECE SPAWNING === */
function spawnPieces() {
    G.pieces = [];
    G.currentPieceColors = [];
    G.piecesPlaced = [false, false, false];
    const colors = shuffleArr([...PASTEL_COLORS]).slice(0, 3);
    let hasSpecial = false;
    for (let i = 0; i < 3; i++) {
        // Special block chance from turn 16
        if (!hasSpecial && G.turn >= 16 && randFloat() < 0.2 && G.mode !== 'zen') {
            const type = randInt(0, 2); // 0=crystal, 1=frost, 2=wild
            if (type === 2) {
                G.wildPiece = { cells: [[0, 0]], special: 'wild' };
                G.wildUsed = false;
                document.getElementById('gs-wild-slot').style.display = '';
                renderWild();
                G.pieces.push(getRandomPiece());
            } else {
                const p = getRandomPiece();
                p.special = type === 0 ? 'crystal' : 'frost';
                G.pieces.push(p);
            }
            hasSpecial = true;
        } else {
            G.pieces.push(getRandomPiece());
        }
        G.currentPieceColors.push(colors[i]);
    }
    if (!hasSpecial) {
        G.wildPiece = null;
        document.getElementById('gs-wild-slot').style.display = 'none';
    }
    renderDock();
}

function getRandomPiece() {
    const idx = randInt(0, PIECES.length - 1);
    return { cells: PIECES[idx].map(c => [...c]), special: null };
}

/* === ROTATE PIECE 90° CLOCKWISE === */
function rotatePiece(piece) {
    const cells = piece.cells;
    // Find bounds
    let minR = Infinity, minC = Infinity;
    cells.forEach(([r, c]) => { minR = Math.min(minR, r); minC = Math.min(minC, c); });
    // Normalize to origin
    const norm = cells.map(([r, c]) => [r - minR, c - minC]);
    // Rotate 90° clockwise: (r,c) -> (c, maxR - r)
    const maxR = Math.max(...norm.map(([r]) => r));
    const rotated = norm.map(([r, c]) => [c, maxR - r]);
    // Normalize again
    let rMin = Infinity, cMin = Infinity;
    rotated.forEach(([r, c]) => { rMin = Math.min(rMin, r); cMin = Math.min(cMin, c); });
    piece.cells = rotated.map(([r, c]) => [r - rMin, c - cMin]);
    return piece;
}

function randFloat() { return G.rng ? G.rng.next() : Math.random(); }
function randInt(a, b) { return G.rng ? G.rng.nextInt(a, b) : Math.floor(Math.random() * (b - a + 1)) + a; }
function shuffleArr(arr) {
    if (G.rng) return G.rng.shuffle(arr);
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
}

/* === RENDER DOCK PIECES === */
function renderDock() {
    const dock = document.getElementById('gs-dock');
    dock.innerHTML = '';
    G.pieces.forEach((piece, idx) => {
        const c = document.createElement('canvas');
        const bounds = getPieceBounds(piece.cells);
        const s = 28;
        c.width = (bounds.cols) * s + 4;
        c.height = (bounds.rows) * s + 4;
        c.dataset.idx = idx;
        if (G.piecesPlaced[idx]) c.classList.add('placed');
        const ctx = c.getContext('2d');
        const color = G.currentPieceColors[idx];
        piece.cells.forEach(([r, col]) => {
            drawRoundedRect(ctx, (col - bounds.minC) * s + 2, (r - bounds.minR) * s + 2, s - 2, s - 2, 4, color, piece.special);
        });
        if (piece.special === 'crystal') drawSpecialIcon(ctx, c.width / 2, c.height / 2, '💎');
        if (piece.special === 'frost') drawSpecialIcon(ctx, c.width / 2, c.height / 2, '🧊');
        dock.appendChild(c);
    });
}

function renderWild() {
    const c = document.getElementById('gs-wild-canvas');
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 50, 50);
    drawRoundedRect(ctx, 5, 5, 40, 40, 6, '#FDE68A', 'wild');
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⭐', 25, 25);
}

function getPieceBounds(cells) {
    let minR = 99, maxR = 0, minC = 99, maxC = 0;
    cells.forEach(([r, c]) => { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); });
    return { minR, maxR, minC, maxC, rows: maxR - minR + 1, cols: maxC - minC + 1 };
}

/* === DRAW HELPERS === */
function drawRoundedRect(ctx, x, y, w, h, r, color, special) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath(); ctx.fill();
    // Inner shadow
    ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#000';
    ctx.fillRect(x + 2, y + h - 4, w - 4, 3);
    ctx.globalAlpha = 0.1; ctx.fillStyle = '#fff';
    ctx.fillRect(x + 2, y + 1, w - 4, 3);
    ctx.restore();
    if (special === 'frost') {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    } else if (special === 'crystal') {
        ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#60A5FA';
        ctx.fillRect(x, y, w, h); ctx.restore();
    }
}

function drawSpecialIcon(ctx, x, y, emoji) {
    ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
}

/* === DRAW GRID === */
function drawGrid() {
    const { ctx, cellSize: cs } = G;
    const w = G.canvas.width;
    ctx.clearRect(0, 0, w, w);
    // Background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--pv-grid-bg').trim() || '#E2E8F0';
    ctx.fillRect(0, 0, w, w);
    // Shatter Zone highlight
    if (G.shatterZone && G.shatterZone.active) {
        ctx.fillStyle = 'rgba(253,230,138,0.35)';
        for (let r = G.shatterZone.rowStart; r < GRID_SIZE; r++) {
            ctx.fillRect(0, r * cs, w, cs);
        }
    }
    // Grid lines
    ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath(); ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, w); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cs); ctx.lineTo(w, i * cs); ctx.stroke();
    }
    // Filled cells
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = G.grid[r][c];
            if (cell) {
                const pad = CELL_PAD;
                drawRoundedRect(ctx, c * cs + pad, r * cs + pad, cs - pad * 2, cs - pad * 2, 4, cell.color, cell.frozen ? 'frost' : null);
                if (cell.frozen) {
                    ctx.fillStyle = '#fff'; ctx.font = `${cs * 0.28}px sans-serif`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(`×${cell.frozenCount}`, c * cs + cs / 2, r * cs + cs / 2);
                }
            }
        }
    }
    // Drag preview
    if (G.dragPiece && G.dragGridPos) {
        const { row, col } = G.dragGridPos;
        const piece = G.dragPiece;
        const color = G.dragIdx === -1 ? '#FDE68A' : G.currentPieceColors[G.dragIdx];
        piece.cells.forEach(([dr, dc]) => {
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                ctx.save();
                ctx.globalAlpha = G.dragValid ? 0.5 : 0.3;
                const pad = CELL_PAD;
                if (!G.dragValid) {
                    drawRoundedRect(ctx, c * cs + pad, r * cs + pad, cs - pad * 2, cs - pad * 2, 4, '#F43F5E', null);
                } else {
                    drawRoundedRect(ctx, c * cs + pad, r * cs + pad, cs - pad * 2, cs - pad * 2, 4, color, null);
                }
                ctx.restore();
            }
        });
    }
}

/* === DRAG & DROP === */
function setupDragListeners() {
    const wrap = document.getElementById('gs-canvas-wrap');
    const dock = document.getElementById('gs-dock');
    const wildSlot = document.getElementById('gs-wild-slot');
    // Prevent default touch behavior on dock for reliable pointer events
    dock.style.touchAction = 'none';
    // Track tap vs drag
    let tapStartTime = 0;
    let tapIdx = -1;
    let tapStartX = 0;
    let tapStartY = 0;
    const TAP_MOVE_THRESHOLD = 10; // pixels — ignore tiny movements (touch jitter)
    const TAP_TIME_THRESHOLD = 250; // ms

    // Dock pieces: short tap = rotate, drag = start drag
    dock.addEventListener('pointerdown', e => {
        const pc = e.target.closest('canvas');
        if (!pc || pc.classList.contains('placed')) return;
        e.preventDefault();
        const idx = parseInt(pc.dataset.idx);
        tapStartTime = Date.now();
        tapIdx = idx;
        tapStartX = e.clientX;
        tapStartY = e.clientY;
    });
    // Detect drag start only when moved beyond threshold
    window.addEventListener('pointermove', e => {
        if (tapIdx >= 0 && !G.dragPiece) {
            const dx = e.clientX - tapStartX;
            const dy = e.clientY - tapStartY;
            if (Math.abs(dx) > TAP_MOVE_THRESHOLD || Math.abs(dy) > TAP_MOVE_THRESHOLD) {
                // Moved enough — start drag
                const pc = dock.querySelectorAll('canvas')[tapIdx];
                if (pc && !pc.classList.contains('placed')) {
                    startDrag(tapIdx, G.pieces[tapIdx], e);
                    pc.classList.add('dragging');
                }
                tapIdx = -1;
            }
        }
        onDragMove(e);
    });
    // Detect tap (short press, no movement)
    window.addEventListener('pointerup', e => {
        if (tapIdx >= 0) {
            const elapsed = Date.now() - tapStartTime;
            const dx = e.clientX - tapStartX;
            const dy = e.clientY - tapStartY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (elapsed < TAP_TIME_THRESHOLD && dist < TAP_MOVE_THRESHOLD) {
                // Short tap without movement = rotate
                if (G.gameState === 'playing' && !G.piecesPlaced[tapIdx]) {
                    rotatePiece(G.pieces[tapIdx]);
                    SFX.play('tap');
                    renderDock();
                }
            }
            tapIdx = -1;
        }
        onDragEnd(e);
    });
    // Wild piece
    wildSlot.addEventListener('pointerdown', e => {
        if (G.wildUsed || !G.wildPiece) return;
        startDrag(-1, G.wildPiece, e);
    });
    // Right-click during drag = rotate piece
    window.addEventListener('contextmenu', e => {
        if (G.dragPiece) {
            e.preventDefault();
            rotatePiece(G.dragPiece);
            SFX.play('tap');
            if (G.dragGridPos) {
                G.dragValid = canPlace(G.dragPiece, G.dragGridPos.row, G.dragGridPos.col);
            }
            if (G.dragIdx >= 0) renderDock();
            drawGrid();
        }
    });
}

function startDrag(idx, piece, e) {
    if (G.gameState !== 'playing' || G.animating) return;
    G.dragIdx = idx;
    G.dragPiece = piece;
    G.dragOffset = { x: 0, y: 0 };
    e.preventDefault();
}

function onDragMove(e) {
    if (!G.dragPiece) return;
    const rect = G.canvas.getBoundingClientRect();
    const scaleX = G.canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleX;
    const cs = G.cellSize;
    const bounds = getPieceBounds(G.dragPiece.cells);
    const col = Math.round((x / cs) - bounds.cols / 2);
    const row = Math.round((y / cs) - bounds.rows / 2);
    G.dragGridPos = { row, col };
    G.dragValid = canPlace(G.dragPiece, row, col);
    drawGrid();
}

function onDragEnd(e) {
    if (!G.dragPiece) return;
    if (G.dragValid && G.dragGridPos) {
        placePiece(G.dragPiece, G.dragGridPos.row, G.dragGridPos.col, G.dragIdx);
    }
    // Remove dragging class
    document.querySelectorAll('.gs-dock canvas.dragging').forEach(c => c.classList.remove('dragging'));
    G.dragPiece = null; G.dragIdx = -1; G.dragGridPos = null; G.dragValid = false;
    drawGrid();
}

/* === PLACEMENT VALIDATION === */
function canPlace(piece, row, col) {
    return piece.cells.every(([dr, dc]) => {
        const r = row + dr, c = col + dc;
        return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !G.grid[r][c];
    });
}

/* === PLACE PIECE === */
function placePiece(piece, row, col, idx) {
    // Save undo state
    G.undoState = {
        grid: G.grid.map(r => r.map(c => c ? { ...c } : null)),
        score: G.score, linesCleared: G.linesCleared, piecesPlaced: [...G.piecesPlaced],
    };
    const color = idx === -1 ? '#FDE68A' : G.currentPieceColors[idx];
    let cellsPlaced = 0;
    piece.cells.forEach(([dr, dc]) => {
        G.grid[row + dr][col + dc] = { color };
        cellsPlaced++;
    });
    G.score += cellsPlaced;
    SFX.play('tap');

    // Special block effects
    if (piece.special === 'crystal') {
        const destroyed = destroyCrystal(row, col, piece.cells);
        G.score += destroyed * 10;
        SFX.play('combo');
    }
    if (piece.special === 'frost') {
        applyFrost();
    }

    // Mark placed
    if (idx === -1) {
        G.wildUsed = true;
        document.getElementById('gs-wild-slot').style.display = 'none';
    } else {
        G.piecesPlaced[idx] = true;
        const dockCanvases = document.querySelectorAll('.gs-dock canvas');
        if (dockCanvases[idx]) dockCanvases[idx].classList.add('placed');
    }

    // Check line clears
    checkLineClears();
    updateUI();
    drawGrid();

    // Check if all 3 placed → next turn
    const regularPlaced = G.piecesPlaced.every(p => p);
    if (regularPlaced) {
        nextTurn();
    }
}

/* === CRYSTAL BLOCK === */
function destroyCrystal(row, col, cells) {
    let destroyed = 0;
    // Center point = average of piece cells
    const cr = row + Math.floor(cells.length > 1 ? 1 : 0);
    const cc = col + Math.floor(cells.length > 1 ? 1 : 0);
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const r = cr + dr, c = cc + dc;
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && G.grid[r][c]) {
                G.grid[r][c] = null;
                destroyed++;
            }
        }
    }
    return destroyed;
}

/* === FROST BLOCK === */
function applyFrost() {
    const empty = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!G.grid[r][c]) empty.push([r, c]);
        }
    }
    const shuffled = shuffleArr(empty).slice(0, 2);
    shuffled.forEach(([r, c]) => {
        G.grid[r][c] = { color: '#E2E8F0', frozen: true, frozenCount: 2 };
    });
}

/* === LINE CLEAR === */
function checkLineClears() {
    const toClear = { rows: new Set(), cols: new Set() };
    // Check rows
    for (let r = 0; r < GRID_SIZE; r++) {
        if (G.grid[r].every(c => c !== null)) toClear.rows.add(r);
    }
    // Check columns
    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) { if (!G.grid[r][c]) { full = false; break; } }
        if (full) toClear.cols.add(c);
    }
    const totalLines = toClear.rows.size + toClear.cols.size;
    if (totalLines === 0) {
        G.comboStreak = 0;
        return;
    }
    G.comboStreak++;
    G.linesCleared += totalLines;
    if (totalLines > G.bestCombo) G.bestCombo = totalLines;

    // Combo score
    const comboScore = [0, 100, 300, 600, 1200, 2500];
    let lineScore = comboScore[Math.min(totalLines, 5)] || 2500;
    // Streak multiplier
    const streakMult = G.comboStreak >= 4 ? 3 : G.comboStreak >= 3 ? 2 : G.comboStreak >= 2 ? 1.5 : 1;
    lineScore = Math.round(lineScore * streakMult);
    // Shatter Zone multiplier
    let inZone = false;
    if (G.shatterZone && G.shatterZone.active) {
        toClear.rows.forEach(r => { if (r >= G.shatterZone.rowStart) inZone = true; });
    }
    if (inZone) lineScore *= 3;

    G.score += lineScore;

    // Show combo popup
    if (totalLines >= 2 || G.comboStreak >= 2) {
        showComboPopup(totalLines, G.comboStreak, inZone);
    }
    SFX.play(totalLines >= 3 ? 'combo' : 'clear');

    // Clear cells (handle frozen)
    const cellsToClear = new Set();
    toClear.rows.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) cellsToClear.add(`${r},${c}`); });
    toClear.cols.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) cellsToClear.add(`${r},${c}`); });
    cellsToClear.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        const cell = G.grid[r][c];
        if (cell && cell.frozen) {
            cell.frozenCount--;
            if (cell.frozenCount <= 0) G.grid[r][c] = null;
        } else {
            G.grid[r][c] = null;
        }
    });

    // Sprint check
    if (G.mode === 'sprint') {
        G.sprintLines += totalLines;
        updateSprintInfo();
        if (G.sprintLines >= 40) {
            G.gameState = 'won';
            endGame();
        }
    }
}

function showComboPopup(lines, streak, inZone) {
    const popup = document.getElementById('gs-combo-popup');
    let text = `${lines} Line${lines > 1 ? 's' : ''}!`;
    if (streak >= 2) text += ` ×${streak} Streak`;
    if (inZone) text += ' 💥Zone';
    popup.textContent = text;
    popup.className = 'gs-combo-popup show';
    setTimeout(() => popup.classList.add('fadeout'), 800);
    setTimeout(() => popup.className = 'gs-combo-popup', 1400);
}

/* === NEXT TURN === */
function nextTurn() {
    G.turn++;
    // Shatter Zone logic
    if (G.mode !== 'zen') {
        if (G.shatterZone && G.shatterZone.active) {
            G.shatterZone.turnsLeft--;
            if (G.shatterZone.turnsLeft <= 0) {
                expireShatterZone();
                G.shatterZone = null;
            }
            updateZoneBar();
        }
        if (G.turn % 10 === 0 && !G.shatterZone) {
            G.shatterZone = { active: true, rowStart: GRID_SIZE - 2, turnsLeft: 5 };
            updateZoneBar();
        }
    }
    // Spawn new pieces
    spawnPieces();
    // Check game over
    if (!canAnyPieceFit()) {
        G.gameState = 'lost';
        endGame();
    }
    updateUI();
    drawGrid();
}

function expireShatterZone() {
    for (let r = G.shatterZone.rowStart; r < GRID_SIZE; r++) {
        const emptyCells = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!G.grid[r][c]) emptyCells.push(c);
        }
        const toFill = Math.floor(emptyCells.length * 0.5);
        const shuffled = shuffleArr(emptyCells).slice(0, toFill);
        shuffled.forEach(c => {
            G.grid[r][c] = { color: PASTEL_COLORS[randInt(0, PASTEL_COLORS.length - 1)] };
        });
    }
}

function updateZoneBar() {
    const bar = document.getElementById('gs-zone-bar');
    if (G.shatterZone && G.shatterZone.active) {
        bar.style.display = '';
        bar.textContent = `⚡ Shatter Zone: ${G.shatterZone.turnsLeft} turn${G.shatterZone.turnsLeft > 1 ? 's' : ''} left`;
    } else {
        bar.style.display = 'none';
    }
}

function updateSprintInfo() {
    const el = document.getElementById('gs-sprint-info');
    if (G.mode !== 'sprint') return;
    const elapsed = ((Date.now() - G.sprintStartTime) / 1000).toFixed(1);
    el.textContent = `Lines: ${G.sprintLines}/40 · Time: ${elapsed}s`;
}

/* === GAME OVER CHECK === */
function canAnyPieceFit() {
    for (let i = 0; i < G.pieces.length; i++) {
        if (G.piecesPlaced[i]) continue;
        if (canPieceFitAnywhere(G.pieces[i])) return true;
    }
    if (G.wildPiece && !G.wildUsed) return true;
    return false;
}

function canPieceFitAnywhere(piece) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (canPlace(piece, r, c)) return true;
        }
    }
    return false;
}

/* === END GAME === */
function endGame() {
    clearInterval(G.timerInterval);
    G.gameState = G.gameState === 'won' ? 'won' : 'lost';
    const score = G.score;
    // Save
    const best = parseInt(localStorage.getItem('pv_gridsmash_best') || '0');
    if (score > best) localStorage.setItem('pv_gridsmash_best', score);
    if (typeof updateStats === 'function') updateStats('gridsmash', score);
    SFX.play(G.gameState === 'won' ? 'win' : 'gameover');
    // Show GAME OVER popup
    setTimeout(() => showGameOver(), 400);
}

function getPercentile(score) {
    if (score >= 30000) return 1;
    if (score >= 20000) return 5;
    if (score >= 15000) return 10;
    if (score >= 8000) return 25;
    if (score >= 4000) return 50;
    return 100;
}

/* === GAME OVER POPUP === */
function showGameOver() {
    if (G.mode !== 'daily' && G.mode !== 'zen') AdController.showInterstitial();
    const pct = getPercentile(G.score);
    const isSprint = G.mode === 'sprint' && G.gameState === 'won';
    const elapsed = isSprint ? ((Date.now() - G.sprintStartTime) / 1000).toFixed(1) + 's' : '';
    const statsEl = document.getElementById('gs-gameover-stats');
    statsEl.innerHTML = `
      <div style="text-align:center"><div style="font-size:1.4rem;font-weight:800">${formatNumber(G.score)}</div><div style="font-size:.65rem;color:var(--pv-text-secondary)">SCORE</div></div>
      <div style="text-align:center"><div style="font-size:1.4rem;font-weight:800">${G.linesCleared}</div><div style="font-size:.65rem;color:var(--pv-text-secondary)">LINES</div></div>
      <div style="text-align:center"><div style="font-size:1.4rem;font-weight:800">×${G.bestCombo}</div><div style="font-size:.65rem;color:var(--pv-text-secondary)">BEST COMBO</div></div>
      <div style="text-align:center"><div style="font-size:1.4rem;font-weight:800">${G.turn}</div><div style="font-size:.65rem;color:var(--pv-text-secondary)">TURNS</div></div>
      ${isSprint ? `<div style="text-align:center"><div style="font-size:1.4rem;font-weight:800">${elapsed}</div><div style="font-size:.65rem;color:var(--pv-text-secondary)">TIME</div></div>` : ''}
    `;
    // Update title based on win/lose
    const popup = document.getElementById('gs-gameover');
    const titleEl = popup.querySelector('div[style*="font-size:2rem"]');
    const subEl = popup.querySelector('div[style*="font-size:.9rem"]');
    const iconEl = popup.querySelector('div[style*="font-size:3rem"]');
    if (G.gameState === 'won') {
        iconEl.textContent = '🏆';
        titleEl.textContent = isSprint ? 'Sprint Complete!' : 'You Win!';
        titleEl.style.color = 'var(--pv-emerald)';
        subEl.textContent = 'Great job! Check your results.';
    } else {
        iconEl.textContent = '💥';
        titleEl.textContent = 'GAME OVER';
        titleEl.style.color = 'var(--pv-coral)';
        subEl.textContent = G.mode === 'daily' ? 'Time\'s up!' : 'No more moves available!';
    }
    popup.style.display = 'flex';
    popup.classList.add('open');
}

function closeGameOver() {
    const popup = document.getElementById('gs-gameover');
    popup.classList.remove('open');
    popup.style.display = 'none';
}

/* === RESULT SCREEN (kept for share) === */
function showResult(score, pct) {
    // Now handled by showGameOver
}

/* === SHARE === */
function shareGS() {
    const pct = getPercentile(G.score);
    let text = `🧱 GridSmash${G.mode === 'daily' ? ' Daily #' + getDailyNumber() : ''}\n`;
    text += `Score: ${formatNumber(G.score)}\n`;
    text += `Lines: ${G.linesCleared} | Combo: ×${G.bestCombo}`;
    if (G.shatterZone) text += ' | Shatter: ✓';
    text += `\n🏆 Top ${pct}%\npuzzlevault.pages.dev/games/gridsmash`;
    shareResult(text);
}

/* === UPDATE UI === */
function updateUI() {
    document.getElementById('gs-score').textContent = formatNumber(G.score);
    document.getElementById('gs-lines').textContent = G.linesCleared;
    document.getElementById('gs-combo').textContent = '×' + G.comboStreak;
    document.getElementById('gs-turn').textContent = G.turn;
    if (G.mode === 'sprint') updateSprintInfo();
}

/* === INIT ON LOAD === */
document.addEventListener('DOMContentLoaded', initGame);
