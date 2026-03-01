const GAME_ID = 'colorflow';

// 5 packs per SKILL.md
const PACKS = [
    { id: 1, size: 5, levels: 30, pairs: [4, 5], desc: "5×5 Beginner" },
    { id: 2, size: 6, levels: 30, pairs: [5, 6], desc: "6×6 Simple" },
    { id: 3, size: 7, levels: 30, pairs: [6, 8], desc: "7×7 Intermediate" },
    { id: 4, size: 8, levels: 30, pairs: [8, 10], desc: "8×8 Advanced" },
    { id: 5, size: 9, levels: 30, pairs: [10, 12], desc: "9×9 Expert" }
];

let state = {
    packId: 1,
    levelIdx: 1,
    size: 5,
    isPlaying: false,

    puzzlePairs: [],
    boardContent: [],
    paths: {},

    colorsPresent: 0,
    coverage: 0,
    connectedPairs: 0,

    activeColor: null,
    isDragging: false,
    lastDrawnIdx: -1,
    history: [],
    hintsUsed: 0,
    startTime: 0
};

document.addEventListener('DOMContentLoaded', () => {
    initUIEvents();
    renderPacks();
    if (typeof renderCrossPromo === 'function') renderCrossPromo(GAME_ID);
    if (typeof HintManager !== 'undefined') HintManager.init(GAME_ID);

    const soundBtn = document.getElementById('cf-btn-settings');
    if (soundBtn) soundBtn.textContent = localStorage.getItem('pv_sound') === 'off' ? '🔇' : '🔊';
});

function initUIEvents() {
    document.getElementById('cf-back-to-packs').addEventListener('click', () => switchView('packs'));
    document.getElementById('cf-back-to-levels').addEventListener('click', () => {
        if (state.packId) renderLevels(state.packId);
        switchView('levels');
    });

    document.getElementById('cf-btn-help').addEventListener('click', () => document.getElementById('cf-help-modal').classList.add('open'));
    document.getElementById('cf-btn-settings').addEventListener('click', () => {
        SFX.toggle();
        document.getElementById('cf-btn-settings').textContent = SFX.enabled ? '🔊' : '🔇';
        showToast(SFX.enabled ? 'Sound On' : 'Sound Off');
    });
    document.getElementById('cf-btn-stats').addEventListener('click', () => { SFX.play('tap'); showStatsModal(); });

    document.getElementById('cf-btn-reset').addEventListener('click', resetBoard);
    document.getElementById('cf-btn-undo').addEventListener('click', undoLastPathSegment);

    document.getElementById('cf-btn-next').addEventListener('click', () => {
        document.getElementById('cf-result-modal').classList.remove('open');
        const pack = PACKS.find(p => p.id === state.packId);
        if (state.levelIdx < pack.levels) {
            startLevel(state.packId, state.levelIdx + 1);
        } else {
            switchView('packs');
        }
    });

    document.getElementById('cf-btn-result-packs').addEventListener('click', () => {
        document.getElementById('cf-result-modal').classList.remove('open');
        switchView('packs');
    });

    // Pointer events on the grid are handled via event delegation in buildBoardDOM
}

function switchView(v) {
    document.querySelectorAll('.cf-screen').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${v}`).classList.add('active');
}

function renderPacks() {
    const list = document.getElementById('cf-pack-list');
    list.innerHTML = '';
    const progress = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_progress`)) || {};

    PACKS.forEach(pack => {
        let packStars = 0;
        let packMaxStars = pack.levels * 3;
        if (progress[pack.id]) {
            Object.values(progress[pack.id]).forEach(s => packStars += s);
        }

        const btn = document.createElement('div');
        btn.className = 'cf-pack-card';
        btn.innerHTML = `
            <div class="cf-pack-info">
                <div class="cf-pack-name">Pack ${pack.id} <span style="font-weight:400; font-size:0.9rem; color:var(--pv-text-secondary); margin-left:8px;">${pack.size}×${pack.size}</span></div>
                <div class="cf-pack-desc">${pack.desc}</div>
            </div>
            <div class="cf-pack-progress">⭐ ${packStars} / ${packMaxStars}</div>
        `;
        btn.addEventListener('click', () => { SFX.play('tap'); renderLevels(pack.id); switchView('levels'); });
        list.appendChild(btn);
    });
}

function renderLevels(packId) {
    state.packId = packId;
    const pack = PACKS.find(p => p.id === packId);
    document.getElementById('cf-pack-title').textContent = `Pack ${pack.id}`;

    const grid = document.getElementById('cf-level-grid');
    grid.innerHTML = '';

    const progress = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_progress`)) || {};
    const packProgress = progress[packId] || {};

    let highestUnlocked = 1;
    for (let i = 1; i <= pack.levels; i++) if (packProgress[i]) highestUnlocked = i + 1;

    // Load level data to determine max unlocked logically based on hardcoded length
    // We will simulate fallback generating if missing
    let packLevelsCount = (typeof COLORFLOW_LEVELS !== 'undefined' && COLORFLOW_LEVELS[pack.size]) ? COLORFLOW_LEVELS[pack.size].length : 0;

    for (let i = 1; i <= pack.levels; i++) {
        const btn = document.createElement('button');
        const stars = packProgress[i] || 0;
        // Also bound check if we have data for this level
        const hasData = (i <= packLevelsCount || typeof getFallbackLevel === 'function');
        const isLocked = i > highestUnlocked || !hasData;

        btn.className = `cf-level-btn ${isLocked ? 'locked' : ''}`;

        let starsHtml = '';
        if (!isLocked && stars > 0) {
            starsHtml = `<div class="cf-level-stars">`;
            starsHtml += (stars >= 1) ? '<span class="cf-star-filled">★</span>' : '<span class="cf-star-empty">★</span>';
            starsHtml += (stars >= 2) ? '<span class="cf-star-filled">★</span>' : '<span class="cf-star-empty">★</span>';
            starsHtml += (stars >= 3) ? '<span class="cf-star-filled">★</span>' : '<span class="cf-star-empty">★</span>';
            starsHtml += `</div>`;
        }

        btn.innerHTML = `<div class="cf-level-num">${isLocked && !hasData ? '🚧' : (isLocked ? '🔒' : i)}</div>${starsHtml}`;

        if (!isLocked) {
            btn.addEventListener('click', () => { SFX.play('tap'); startLevel(packId, i); });
        }
        grid.appendChild(btn);
    }
}

function getLevelData(size, levelIdx) {
    if (typeof COLORFLOW_LEVELS !== 'undefined' && COLORFLOW_LEVELS[size] && COLORFLOW_LEVELS[size][levelIdx - 1]) {
        return COLORFLOW_LEVELS[size][levelIdx - 1];
    }
    // Fallback stub for dev
    return {
        size: size,
        pairs: [
            [0, 0, size - 1, size - 1, 1],
            [0, size - 1, size - 1, 0, 2]
        ]
    };
}

function startLevel(packId, levelIdx) {
    const pack = PACKS.find(p => p.id === packId);
    state.packId = packId;
    state.levelIdx = levelIdx;
    state.size = pack.size;
    state.isPlaying = true;

    // reset state
    state.puzzlePairs = [];
    state.boardContent = new Array(state.size * state.size).fill(null).map(() => ({ type: 'empty', color: null, neighbors: [] }));
    state.paths = {};
    state.colorsPresent = 0;
    state.connectedPairs = 0;
    state.coverage = 0;
    state.activeColor = null;
    state.isDragging = false;
    state.lastDrawnIdx = -1;
    state.history = [];
    state.hintsUsed = 0;
    state.startTime = Date.now();

    // Load puzzle
    const puzzle = getLevelData(state.size, levelIdx);
    state.puzzlePairs = puzzle.pairs;
    state.colorsPresent = state.puzzlePairs.length;

    // Place markers
    state.puzzlePairs.forEach(p => {
        let idx1 = p[0] * state.size + p[1];
        let idx2 = p[2] * state.size + p[3];
        state.boardContent[idx1] = { type: 'marker', color: p[4], neighbors: [] };
        state.boardContent[idx2] = { type: 'marker', color: p[4], neighbors: [] };
        state.paths[p[4]] = [];
    });

    document.getElementById('cf-game-level-lbl').textContent = `${state.size}×${state.size} - Level ${levelIdx}`;

    buildBoardDOM();
    updateMetaUI();
    switchView('game');
}

function getIdx(r, c) { return r * state.size + c; }
function getRC(idx) { return [Math.floor(idx / state.size), idx % state.size]; }

function buildBoardDOM() {
    const grid = document.getElementById('cf-grid');
    grid.innerHTML = '';

    grid.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${state.size}, 1fr)`;

    const containerWidth = Math.min(window.innerWidth - 64, 450); // clamp for pc
    const gap = 2; // match css
    const cellSize = Math.floor((containerWidth - (gap * (state.size - 1))) / state.size);

    // Remove old listeners to prevent duplicates on level transitions
    grid.removeEventListener('pointerdown', handlePointerDown);
    grid.removeEventListener('pointermove', handlePointerMove);
    grid.removeEventListener('pointerup', handlePointerUp);
    grid.removeEventListener('pointercancel', handlePointerUp);

    // Bind pointer events on the grid wrapper for smoother continuous drawing
    grid.addEventListener('pointerdown', handlePointerDown);
    grid.addEventListener('pointermove', handlePointerMove);
    grid.addEventListener('pointerup', handlePointerUp);
    grid.addEventListener('pointercancel', handlePointerUp);

    for (let i = 0; i < state.size * state.size; i++) {
        const cell = document.createElement('div');
        cell.className = 'cf-cell';
        cell.id = `cf-cell-${i}`;
        cell.dataset.idx = i;
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;

        const content = state.boardContent[i];
        if (content.type === 'marker') {
            const m = document.createElement('div');
            m.className = `cf-marker c-${content.color}`;
            cell.appendChild(m);
        }

        grid.appendChild(cell);
    }
}

function renderCellVisuals(idx) {
    const cellEl = document.getElementById(`cf-cell-${idx}`);
    if (!cellEl) return;

    const content = state.boardContent[idx];

    // Clear dynamic path classes
    Array.from(cellEl.children).forEach(c => {
        if (c.classList.contains('cf-path-core')) c.remove();
    });

    if (content.type === 'marker') {
        // Toggle connected animation
        const markerEl = cellEl.querySelector('.cf-marker');
        if (markerEl) {
            let isConn = isColorConnected(content.color);
            if (isConn) {
                markerEl.classList.add('connected');
                // Ensure FX div exists
                if (!cellEl.querySelector('.cf-flow-fx')) {
                    const fx = document.createElement('div');
                    fx.className = `cf-flow-fx c-${content.color}`;
                    //cellEl.appendChild(fx); // Optional visual clutter
                }
            } else {
                markerEl.classList.remove('connected');
                const fx = cellEl.querySelector('.cf-flow-fx');
                if (fx) fx.remove();
            }
        }
    }

    if (content.type === 'path' || content.type === 'marker') {
        const color = content.color;

        // Render directional path boxes based on neighbors
        // neighbors contains indices
        content.neighbors.forEach(nIdx => {
            const pathBox = document.createElement('div');
            pathBox.className = `cf-path-core c-${color}`;

            // Determine relative direction
            const [cr, cc] = getRC(idx);
            const [nr, nc] = getRC(nIdx);

            if (nr < cr) pathBox.classList.add('cf-path-u');
            if (nr > cr) pathBox.classList.add('cf-path-d');
            if (nc < cc) pathBox.classList.add('cf-path-l');
            if (nc > cc) pathBox.classList.add('cf-path-r');

            cellEl.appendChild(pathBox);
        });

        // If path (not marker), add center node if has neighbors
        if (content.type === 'path' && content.neighbors.length > 0) {
            const center = document.createElement('div');
            center.className = `cf-path-core cf-path-node c-${color}`;
            cellEl.appendChild(center);
        }
    }
}

// Check if a color has successfully connected its two endpoints
function isColorConnected(color) {
    const path = state.paths[color];
    if (!path || path.length < 2) return false;

    const startIdx = path[0];
    const endIdx = path[path.length - 1];

    return state.boardContent[startIdx].type === 'marker' &&
        state.boardContent[endIdx].type === 'marker' &&
        startIdx !== endIdx;
}

// ------------------------
// Pointer Interaction
// ------------------------
function getIdxFromEvent(e) {
    // Rely on elementFromPoint to get the exact cell dragging over
    let target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) return -1;
    let cell = target.closest('.cf-cell');
    if (!cell) return -1;
    return parseInt(cell.dataset.idx);
}

function saveSnapshot() {
    state.history.push({
        paths: JSON.parse(JSON.stringify(state.paths)),
        boardContent: JSON.parse(JSON.stringify(state.boardContent))
    });
}

function handlePointerDown(e) {
    if (!state.isPlaying) return;
    e.preventDefault(); // prevent scroll

    const idx = getIdxFromEvent(e);
    if (idx === -1) return;

    const content = state.boardContent[idx];

    if (content.type === 'marker') {
        const col = content.color;

        // Set drag start state — don't clear path immediately.
        // Path will only be cleared once user actually drags to a new cell (in handlePointerMove).
        state.activeColor = col;
        state.isDragging = true;
        state._pendingClear = true; // Flag: clear on first move
        state.lastDrawnIdx = idx;
        SFX.play('tap');
    }
}

function handlePointerMove(e) {
    if (!state.isPlaying || !state.isDragging || state.activeColor === null) return;
    e.preventDefault(); // Stop mobile scroll

    const idx = getIdxFromEvent(e);
    if (idx === -1 || idx === state.lastDrawnIdx) return;

    const col = state.activeColor;

    // Check adjacency (Manhattan limit = 1)
    const [lr, lc] = getRC(state.lastDrawnIdx);
    const [cr, cc] = getRC(idx);

    if (Math.abs(lr - cr) + Math.abs(lc - cc) !== 1) {
        // Did we jump or move diagonally?
        return;
    }

    // Deferred clear: only clear the old path once user actually drags to a new cell
    if (state._pendingClear) {
        saveSnapshot();
        clearPath(col);
        state.paths[col].push(state.lastDrawnIdx);
        state._pendingClear = false;
    }

    // Stop drawing if path is already completed
    if (isColorConnected(col)) return;

    const targetContent = state.boardContent[idx];

    // Handle moving backwards over own path (undo)
    const currentPath = state.paths[col];
    if (currentPath.length >= 2 && idx === currentPath[currentPath.length - 2]) {
        // Popping the last drawn point
        const poppedIdx = currentPath.pop();

        // Remove bidirectional links
        state.boardContent[state.lastDrawnIdx].neighbors = state.boardContent[state.lastDrawnIdx].neighbors.filter(n => n !== idx);
        state.boardContent[idx].neighbors = state.boardContent[idx].neighbors.filter(n => n !== state.lastDrawnIdx);

        // Clean cell if empty
        if (state.boardContent[poppedIdx].type !== 'marker') {
            state.boardContent[poppedIdx] = { type: 'empty', color: null, neighbors: [] };
        }

        state.lastDrawnIdx = idx;
        renderCellVisuals(idx);
        renderCellVisuals(poppedIdx);
        updateMetaUI();
        return;
    }

    // Handle collision / target state
    if (targetContent.type === 'marker') {
        if (targetContent.color === col) {
            // Hit the destination!
            addPathSegment(state.lastDrawnIdx, idx, col);
            state.lastDrawnIdx = idx;
            SFX.play('combo');
            // Refresh markers to show connected states
            renderCellVisuals(currentPath[0]);
            renderCellVisuals(idx);
            updateMetaUI();
            checkWinState();
        }
        // If hitting a DIFFERENT color marker, completely block movement
        return;
    }

    // Overwrite existing path of DIFFERENT color
    if (targetContent.type === 'path' && targetContent.color !== col) {
        // Sever the old path at this tile
        severPath(targetContent.color, idx);
    }

    // Self-intersection (don't allow cutting own path)
    if (targetContent.type === 'path' && targetContent.color === col) {
        return;
    }

    // Safely add segment
    if (targetContent.type === 'empty' || (targetContent.type === 'path' && targetContent.color !== col)) {
        addPathSegment(state.lastDrawnIdx, idx, col);
        state.lastDrawnIdx = idx;
        SFX.play('tap'); // very subtle click
        updateMetaUI();
    }
}

function handlePointerUp(e) {
    if (state.isDragging) {
        // If user just tapped a marker without dragging, don't clear the path
        state._pendingClear = false;
        state.isDragging = false;
        state.activeColor = null;
        state.lastDrawnIdx = -1;
        checkWinState();
    }
}

// Adding visual segment
function addPathSegment(fromIdx, toIdx, color) {
    state.paths[color].push(toIdx);

    if (state.boardContent[toIdx].type === 'empty') {
        state.boardContent[toIdx] = { type: 'path', color: color, neighbors: [] };
    }

    // Wire bidirectional
    state.boardContent[fromIdx].neighbors.push(toIdx);
    state.boardContent[toIdx].neighbors.push(fromIdx);

    renderCellVisuals(fromIdx);
    renderCellVisuals(toIdx);
}

// Clear entire path for a color
function clearPath(color) {
    const path = [...state.paths[color]];
    state.paths[color] = [];

    path.forEach(idx => {
        const c = state.boardContent[idx];
        c.neighbors = [];
        if (c.type === 'path') {
            state.boardContent[idx] = { type: 'empty', color: null, neighbors: [] };
        }
        renderCellVisuals(idx);
    });
    // Check start and end markers visually
    state.puzzlePairs.forEach(p => {
        if (p[4] === color) {
            renderCellVisuals(getIdx(p[0], p[1]));
            renderCellVisuals(getIdx(p[2], p[3]));
        }
    });

    updateMetaUI();
}

// Sever a different color's path at a specific index
function severPath(colorToSever, severIdx) {
    const oldPath = state.paths[colorToSever];
    const breakPos = oldPath.indexOf(severIdx);
    if (breakPos === -1) return;

    // Everything from breakPos onward is deleted
    const removedIndices = oldPath.slice(breakPos);

    // Update path array
    state.paths[colorToSever] = oldPath.slice(0, breakPos);

    // Clean deleted segments
    removedIndices.forEach(idx => {
        if (state.boardContent[idx].type === 'path') {
            state.boardContent[idx] = { type: 'empty', color: null, neighbors: [] };
        } else if (state.boardContent[idx].type === 'marker') {
            state.boardContent[idx].neighbors = [];
        }
        renderCellVisuals(idx);
    });

    // Special case: the cell just before breakPos needs its neighbor link severed forward
    if (breakPos > 0) {
        const retainIdx = oldPath[breakPos - 1];
        state.boardContent[retainIdx].neighbors = state.boardContent[retainIdx].neighbors.filter(n => n !== severIdx);
        renderCellVisuals(retainIdx);
    }

    // Refresh markers for the severed color
    const severedWasConn = oldPath.length >= 2 && state.boardContent[oldPath[oldPath.length - 1]].type === 'marker';
    // If it *was* connected prior to severing (this happens if we sever near the end), make sure end marker updates visually
    state.puzzlePairs.forEach(p => {
        if (p[4] === colorToSever) {
            renderCellVisuals(getIdx(p[0], p[1]));
            renderCellVisuals(getIdx(p[2], p[3]));
        }
    });
}

function undoLastPathSegment() {
    if (!state.isPlaying || !state.history || state.history.length === 0) return;

    const snapshot = state.history.pop();
    state.paths = snapshot.paths;
    state.boardContent = snapshot.boardContent;

    for (let i = 0; i < state.size * state.size; i++) {
        renderCellVisuals(i);
    }
    updateMetaUI();
    SFX.play('tap');
}

function resetBoard() {
    if (!state.isPlaying) return;
    saveSnapshot();
    SFX.play('tap');
    state.boardContent.forEach(b => {
        if (b.type === 'path') {
            b.type = 'empty';
            b.color = null;
        }
        b.neighbors = [];
    });
    for (let color in state.paths) {
        state.paths[color] = [];
    }

    for (let i = 0; i < state.size * state.size; i++) {
        renderCellVisuals(i);
    }
    updateMetaUI();
}

// ---------------------------
// Game State & Win Evaluation
// ---------------------------
function updateMetaUI() {
    state.connectedPairs = Object.keys(state.paths).filter(col => isColorConnected(parseInt(col))).length;

    let occupiedCells = 0;
    state.boardContent.forEach(b => {
        if (b.type === 'marker' || b.type === 'path') occupiedCells++;
    });

    state.coverage = Math.floor((occupiedCells / (state.size * state.size)) * 100);

    document.getElementById('cf-pairs-lbl').textContent = `${state.connectedPairs}/${state.colorsPresent}`;

    document.getElementById('cf-cov-pct').textContent = `${state.coverage}%`;
    const bar = document.getElementById('cf-cov-fill');
    bar.style.width = `${state.coverage}%`;
    if (state.coverage === 100) bar.style.backgroundColor = 'var(--pv-emerald)';
    else bar.style.backgroundColor = 'var(--pv-blue)';
}

function getManhattanDist(p1r, p1c, p2r, p2c) {
    return Math.abs(p1r - p2r) + Math.abs(p1c - p2c);
}

function checkWinState() {
    if (!state.isPlaying) return;

    // Check if ALL pairs connected
    if (state.connectedPairs < state.colorsPresent) return;

    // WIN triggering immediately upon full connections
    state.isPlaying = false;
    SFX.play('win');

    // Calculate Stars
    let stars = 1;
    if (state.coverage === 100) stars = 3;
    else if (state.coverage >= 80) stars = 2;

    // Calculate Score per SKILL.md: 200 base + coverage%×5 + speed bonus + no-hint ×1.3
    let baseScore = 200;
    let coverageBonus = Math.round(state.coverage * 5);
    let elapsed = Math.round((Date.now() - state.startTime) / 1000);
    let timeLimit = state.size * state.size * 3; // generous time limit
    let speedBonus = Math.max(0, (timeLimit - elapsed) * 2);
    let totalScore = baseScore + coverageBonus + speedBonus;

    // Flow Bonus: 100% coverage = 2× score
    if (state.coverage === 100) totalScore *= 2;

    // No-hint bonus: ×1.3
    if (state.hintsUsed === 0) totalScore = Math.round(totalScore * 1.3);

    // Save
    const progress = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_progress`)) || {};
    if (!progress[state.packId]) progress[state.packId] = {};
    const curStars = progress[state.packId][state.levelIdx] || 0;
    if (stars > curStars) {
        progress[state.packId][state.levelIdx] = stars;
        localStorage.setItem(`pv_${GAME_ID}_progress`, JSON.stringify(progress));
    }

    // Modal
    document.getElementById('cf-res-cov-score').textContent = `${coverageBonus}`;
    document.getElementById('cf-res-eff-score').textContent = `+${speedBonus}`;
    document.getElementById('cf-res-total').textContent = totalScore;

    let sHtml = '';
    if (stars === 3) { sHtml = '⭐⭐⭐'; document.getElementById('cf-res-msg').textContent = `Perfect Coverage! Score: ${totalScore}`; }
    else if (stars === 2) { sHtml = '⭐⭐<span class="cf-star-empty">★</span>'; document.getElementById('cf-res-msg').textContent = `Great! ${state.coverage}% coverage. Score: ${totalScore}`; }
    else { sHtml = '⭐<span class="cf-star-empty">★★</span>'; document.getElementById('cf-res-msg').textContent = `Cleared! ${state.coverage}% coverage. Score: ${totalScore}`; }

    document.getElementById('cf-res-stars').innerHTML = sHtml;

    // Render mini cross-promo
    const promoContainer = document.getElementById('cf-mini-promo');
    if (promoContainer && typeof renderMiniCrossPromo === 'function') {
        renderMiniCrossPromo(GAME_ID, promoContainer);
    }

    document.getElementById('cf-result-modal').classList.add('open');

    // Ad refresh
    if (typeof AdController !== 'undefined') AdController.refreshBottomAd();

    // Show interstitial after 2s delay
    setTimeout(() => {
        if (typeof AdController !== 'undefined' && AdController.shouldShowInterstitial()) {
            AdController.showInterstitial();
        }
    }, 2000);
}

// ---------------------------
// Stats Modal
// ---------------------------
function showStatsModal() {
    const progress = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_progress`)) || {};
    let totalStars = 0;
    let packsCompleted = 0;

    PACKS.forEach(p => {
        let starsForPack = 0;
        let levelsCompleted = 0;
        if (progress[p.id]) {
            Object.values(progress[p.id]).forEach(s => {
                starsForPack += s;
                if (s > 0) levelsCompleted++;
            });
        }
        totalStars += starsForPack;
        if (levelsCompleted === p.levels) packsCompleted++;
    });

    const body = document.getElementById('cf-stats-body');
    const totalMaxStars = PACKS.reduce((acc, p) => acc + (p.levels * 3), 0);

    body.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom: 12px; font-size: 1.1rem; border-bottom: 1px solid var(--pv-border); padding-bottom: 8px;">
            <span style="color:var(--pv-text-secondary);">Total Stars:</span> 
            <strong><span style="color:var(--pv-amber);">⭐</span> ${totalStars} / ${totalMaxStars}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom: 12px; font-size: 1.1rem; border-bottom: 1px solid var(--pv-border); padding-bottom: 8px;">
            <span style="color:var(--pv-text-secondary);">Packs Finished:</span> 
            <strong>${packsCompleted} / ${PACKS.length}</strong>
        </div>
        <p style="font-size:0.9rem; color:var(--pv-text-secondary); text-align:center; margin-top:20px;">Keep connecting paths to earn more stars!</p>
    `;

    document.getElementById('cf-stats-modal').classList.add('open');
}

/* === SHARE === */
window.shareCF = function () {
    let text = `🎨 ColorFlow Pack ${state.packId} Level ${state.levelIdx}\n`;
    const stars = state.coverage === 100 ? '⭐⭐⭐' : state.coverage >= 80 ? '⭐⭐' : '⭐';
    text += `${stars} ${state.coverage}% Coverage!\n`;
    const elapsed = Math.round((Date.now() - state.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    text += `Time: ${mins}:${String(secs).padStart(2, '0')}`;
    if (state.hintsUsed === 0) text += ' | No hints';
    text += '\npuzzlevault.pages.dev/colorflow';
    if (typeof shareResult === 'function') shareResult(text);
};

/* === HINT SYSTEM === */
window.useColorFlowHint = function () {
    if (!state.isPlaying) return;

    const revealHint = () => {
        state.hintsUsed++;
        // Find a disconnected color and highlight 3-4 cells of a path suggestion
        let hintColor = null;
        for (const p of state.puzzlePairs) {
            if (!isColorConnected(p[4])) {
                hintColor = p[4];
                break;
            }
        }
        if (hintColor === null) {
            showToast('🎉 All pairs connected!');
            return;
        }

        // Highlight the two endpoints and 1-2 adjacent cells
        const pair = state.puzzlePairs.find(p => p[4] === hintColor);
        const startIdx = getIdx(pair[0], pair[1]);
        const endIdx = getIdx(pair[2], pair[3]);
        const hintCells = [startIdx];

        // BFS-like: find 2-3 cells from start toward end
        const [sr, sc] = [pair[0], pair[1]];
        const [er, ec] = [pair[2], pair[3]];
        let cr = sr, cc = sc;
        for (let step = 0; step < 3; step++) {
            if (cr === er && cc === ec) break;
            if (Math.abs(er - cr) >= Math.abs(ec - cc)) {
                cr += (er > cr) ? 1 : -1;
            } else {
                cc += (ec > cc) ? 1 : -1;
            }
            hintCells.push(getIdx(cr, cc));
        }

        // Highlight with golden pulse
        hintCells.forEach(idx => {
            const cell = document.getElementById(`cf-cell-${idx}`);
            if (cell) {
                cell.style.boxShadow = '0 0 10px 3px #D97706';
                cell.style.border = '2px solid #D97706';
                setTimeout(() => {
                    cell.style.boxShadow = '';
                    cell.style.border = '';
                }, 2500);
            }
        });
        SFX.play('hint');
        showToast('💡 Try connecting this path!');
    };

    if (typeof HintManager !== 'undefined') {
        HintManager.requestHint(revealHint);
    } else {
        revealHint();
    }
};
