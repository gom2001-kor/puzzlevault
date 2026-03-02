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
    state.perfectPaths = null;
    state.startTime = Date.now();

    // Load puzzle
    const puzzle = getLevelData(state.size, levelIdx);
    state.puzzlePairs = puzzle.pairs;
    state.colorsPresent = state.puzzlePairs.length;

    // Force loaded solution over any corrupted stored state
    if (puzzle.solution) {
        state.perfectPaths = puzzle.solution;
    }

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

// Color index to CSS color mapping for hint overlays
const HINT_COLOR_MAP = {
    1: 'var(--pv-coral)',
    2: 'var(--pv-blue)',
    3: 'var(--pv-emerald)',
    4: 'var(--pv-amber)',
    5: 'var(--pv-violet)',
    6: 'var(--pv-pink)',
    7: 'var(--pv-orange)',
    8: 'var(--pv-cyan)',
    9: 'var(--pv-lime)'
};

const HINT_NUM_CIRCLES = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

window.useColorFlowHint = function () {
    if (!state.isPlaying) return;

    const revealHint = () => {
        state.hintsUsed++;

        // Remove any existing hint overlays
        document.querySelectorAll('.cf-hint-overlay, .cf-hint-arrow').forEach(el => el.remove());

        // 1. Calculate perfect 100% coverage solution if not cached
        if (!state.perfectPaths && state.puzzlePairs.length > 0) {
            // Check if pre-computed solution exists in the level data
            const levelData = COLORFLOW_LEVELS[state.size][state.levelIdx];
            if (levelData && levelData.solution) {
                state.perfectPaths = levelData.solution;
                // console.log('Using pre-computed solution from generator.');
            } else {
                console.log('Calculating perfect paths via DFS fallback...');
                const size = state.size;
                const totalCells = size * size;
                const pairs = state.puzzlePairs;
                const endpoints = new Int32Array(totalCells);
                const board = new Int32Array(totalCells);

                pairs.forEach(p => {
                    const c = p[4];
                    endpoints[p[0] * size + p[1]] = c;
                    endpoints[p[2] * size + p[3]] = c;
                    board[p[0] * size + p[1]] = c;
                    board[p[2] * size + p[3]] = c;
                });

                let found = null;
                const rDirs = [0, 1, 0, -1], cDirs = [1, 0, -1, 0];
                let iters = 0;
                const MAX_ITERS = 2500000; // Increased significantly for 9x9 grids

                function solve(colorIdx, r, c, currentPath, currentPathsMap) {
                    if (found || iters++ > MAX_ITERS) return; // limit iterations for safety

                    if (colorIdx >= pairs.length) {
                        let emptyCount = 0;
                        for (let i = 0; i < totalCells; i++) if (board[i] === 0) emptyCount++;
                        if (emptyCount === 0) found = JSON.parse(JSON.stringify(currentPathsMap));
                        return;
                    }

                    const p = pairs[colorIdx];
                    const tr = p[2], tc = p[3], color = p[4];

                    if (r === tr && c === tc) {
                        if (colorIdx + 1 < pairs.length) {
                            const np = pairs[colorIdx + 1];
                            const nextStartIdx = np[0] * size + np[1];
                            const nextPathMap = Object.assign({}, currentPathsMap);
                            const newPath = [nextStartIdx];
                            nextPathMap[np[4]] = newPath;
                            solve(colorIdx + 1, np[0], np[1], newPath, nextPathMap);
                        } else {
                            solve(colorIdx + 1, -1, -1, currentPath, currentPathsMap);
                        }
                        return;
                    }

                    // Warnsdorff's Rule: prefer directions with fewer empty neighbors
                    let validMoves = [];
                    for (let d = 0; d < 4; d++) {
                        const nr = r + rDirs[d], nc = c + cDirs[d];
                        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                            const idx = nr * size + nc;
                            if (board[idx] === 0 || (nr === tr && nc === tc && endpoints[idx] === color)) {
                                let emptyNeighbors = 0;
                                for (let dd = 0; dd < 4; dd++) {
                                    const nnr = nr + rDirs[dd], nnc = nc + cDirs[dd];
                                    if (nnr >= 0 && nnr < size && nnc >= 0 && nnc < size) {
                                        const nIdx = nnr * size + nnc;
                                        if (board[nIdx] === 0 || endpoints[nIdx] > 0) emptyNeighbors++;
                                    }
                                }
                                validMoves.push({ nr, nc, idx, emptyNeighbors });
                            }
                        }
                    }

                    validMoves.sort((a, b) => a.emptyNeighbors - b.emptyNeighbors);

                    for (const move of validMoves) {
                        if (found) return;
                        const prev = board[move.idx];
                        board[move.idx] = color;
                        currentPath.push(move.idx);

                        solve(colorIdx, move.nr, move.nc, currentPath, currentPathsMap);

                        currentPath.pop();
                        board[move.idx] = prev;
                    }
                }

                const firstPair = pairs[0];
                const startIdx = firstPair[0] * size + firstPair[1];
                const initPath = [startIdx];
                solve(0, firstPair[0], firstPair[1], initPath, { [firstPair[4]]: initPath });

                if (found) state.perfectPaths = found;
            }
        }

        let hintColor = null;
        let hintCells = [];

        if (state.perfectPaths) {
            // Find the color pattern that deviates the earliest
            let candidates = [];
            for (const p of state.puzzlePairs) {
                const color = p[4];
                const userPath = state.paths[color] || [];
                const perfectPath = state.perfectPaths[color] || [];

                if (perfectPath.length > 0) {
                    let correctLen = 1;
                    while (correctLen < userPath.length && correctLen < perfectPath.length) {
                        if (userPath[correctLen] === perfectPath[correctLen]) {
                            correctLen++;
                        } else {
                            break;
                        }
                    }

                    const isPerfectlyConnected = (isColorConnected(color) && correctLen === perfectPath.length && userPath.length === perfectPath.length);
                    if (!isPerfectlyConnected) {
                        candidates.push({ color, correctLen, perfectPath });
                    }
                }
            }

            if (candidates.length === 0) {
                showToast('🎉 Perfect coverage achieved! Just connect them all!');
                return;
            }

            // Prioritize the line with the least correctly drawn parts
            candidates.sort((a, b) => a.correctLen - b.correctLen);
            const best = candidates[0];
            hintColor = best.color;

            // 동적 스케일링: 보드 사이즈가 클 수 록 더 많은 힌트를 보여줌. (최소 4칸 ~ 보드 크기 - 1개)
            const hintLength = Math.max(4, state.size - 1);
            let startSlice = Math.max(0, best.correctLen - 1);
            hintCells = best.perfectPath.slice(startSlice, startSlice + hintLength);
            console.log(`[Hint Debug] state.size=${state.size}, hintLength=${hintLength}, startSlice=${startSlice}, hintCells.length=${hintCells.length}`);

        } else {
            // Ultimate fallback (BFS if DFS failed/timed out, very rare)
            console.warn('DFS fallback: using BFS hint.');

            // Helper to check if a line is correctly connected (used for BFS fallback)
            const checkLineCorrectness = (pairIndex) => {
                const p = state.puzzlePairs[pairIndex];
                const color = p[4];
                const userPath = state.paths[color] || [];
                const startIdx = getIdx(p[0], p[1]);
                const endIdx = getIdx(p[2], p[3]);

                if (userPath.length === 0 || userPath[0] !== startIdx) return false;

                // Check if the path reaches the end point
                if (userPath[userPath.length - 1] !== endIdx) return false;

                // Check for self-intersection or incorrect turns (simple check)
                const pathSet = new Set();
                for (let i = 0; i < userPath.length; i++) {
                    if (pathSet.has(userPath[i]) && i !== 0 && i !== userPath.length - 1) return false; // Allow endpoints to be revisited if path loops
                    pathSet.add(userPath[i]);
                }
                return true;
            };

            let unsolved = [];
            for (let i = 0; i < state.puzzlePairs.length; i++) {
                if (!checkLineCorrectness(i)) unsolved.push(i);
            }
            if (unsolved.length === 0) {
                showToast('🎉 All pairs connected!');
                return;
            }

            const targetLine = unsolved[0];
            const p = state.puzzlePairs[targetLine];
            hintColor = p[4]; // Use p[4] for color
            const startIdx = getIdx(p[0], p[1]);
            const endIdx = getIdx(p[2], p[3]);

            // A very simple BFS to find A path (might not be coverage 100%)
            let queue = [[startIdx]];
            let visited = new Set([startIdx]);
            let foundPath = null;
            const rDirs = [0, 1, 0, -1], cDirs = [1, 0, -1, 0];

            while (queue.length > 0) {
                let path = queue.shift();
                let lastIdx = path[path.length - 1];
                if (lastIdx === endIdx) {
                    foundPath = path;
                    break;
                }
                let r = Math.floor(lastIdx / state.size);
                let c = lastIdx % state.size;
                for (let d = 0; d < 4; d++) {
                    let nr = r + rDirs[d], nc = c + cDirs[d];
                    if (nr >= 0 && nr < state.size && nc >= 0 && nc < state.size) {
                        let idx = nr * state.size + nc;
                        // Allow moving into empty cells, the target endpoint, or cells already part of this color's path
                        const isCurrentColorPath = state.paths[hintColor] && state.paths[hintColor].includes(idx);
                        if (!visited.has(idx) && (state.boardContent[idx] === 0 || idx === endIdx || state.boardContent[idx] === hintColor || isCurrentColorPath)) {
                            visited.add(idx);
                            queue.push([...path, idx]);
                        }
                    }
                }
            }

            if (foundPath) {
                // Determine how much is already drawn
                let correctLen = 1;
                const drawnPath = state.paths[hintColor] || [];
                for (let i = 1; i < drawnPath.length; i++) {
                    if (i < foundPath.length && drawnPath[i] === foundPath[i]) {
                        correctLen++;
                    } else break;
                }
                let startSlice = Math.max(0, correctLen - 1);
                hintCells = foundPath.slice(startSlice, startSlice + Math.max(4, state.size - 1));
            } else {
                hintCells = [startIdx, endIdx];
            }
        }

        if (!hintCells || hintCells.length < 2) {
            showToast("No clear path found. Try undoing some lines.");
            return;
        }

        state.hintsUsed++;

        // Clear previous hints
        document.querySelectorAll('.cf-hint-overlay, .cf-hint-arrow').forEach(el => el.remove());

        // HINT_NUM_CIRCLES extends up to 10 for larger boards (Using Global Array directly)
        const numSequenceCount = Math.min(hintCells.length, HINT_NUM_CIRCLES.length);

        const cssColor = HINT_COLOR_MAP[hintColor] || 'var(--pv-amber)';

        // 3. Render 3-4 blocks of hint path
        hintCells.forEach((idx, i) => {
            const cell = document.getElementById(`cf-cell-${idx}`);
            if (!cell) return;

            const overlay = document.createElement('div');
            overlay.className = 'cf-hint-overlay';
            overlay.style.backgroundColor = `color-mix(in srgb, ${cssColor} 50%, transparent)`;
            overlay.textContent = HINT_NUM_CIRCLES[i] || '';
            overlay.style.animationDelay = `${i * 0.15}s`;
            cell.appendChild(overlay);

            if (i < hintCells.length - 1) {
                const nextIdx = hintCells[i + 1];
                const cr = Math.floor(idx / state.size);
                const cc = idx % state.size;
                const nr = Math.floor(nextIdx / state.size);
                const nc = nextIdx % state.size;
                const dr = nr - cr;
                const dc = nc - cc;

                let arrowChar = '';
                let arrowClass = '';
                if (dc === 1) { arrowChar = '→'; arrowClass = 'arrow-r'; }
                else if (dc === -1) { arrowChar = '←'; arrowClass = 'arrow-l'; }
                else if (dr === 1) { arrowChar = '↓'; arrowClass = 'arrow-d'; }
                else if (dr === -1) { arrowChar = '↑'; arrowClass = 'arrow-u'; }

                if (arrowChar) {
                    const arrow = document.createElement('div');
                    arrow.className = `cf-hint-arrow ${arrowClass}`;
                    arrow.textContent = arrowChar;
                    cell.appendChild(arrow);
                }
            }
        });

        // 4. Auto-remove after 3.5 seconds
        setTimeout(() => {
            document.querySelectorAll('.cf-hint-overlay, .cf-hint-arrow').forEach(el => el.remove());
        }, 3500);

        SFX.play('hint');
        const colorNameMap = {
            1: "Red", 2: "Blue", 3: "Green", 4: "Orange", 5: "Purple",
            6: "Pink", 7: "Orange", 8: "Cyan", 9: "Lime", 10: "Yellow" // Added more colors for completeness
        };
        const cName = colorNameMap[hintColor] || "This";

        // Dynamic Toast message depending on how many hints are shown
        showToast(`💡 ${cName} path: follow ① to ${HINT_NUM_CIRCLES[numSequenceCount - 1]} sequence!`);
    };

    if (typeof HintManager !== 'undefined') {
        HintManager.requestHint(revealHint);
    } else {
        revealHint();
    }
};
