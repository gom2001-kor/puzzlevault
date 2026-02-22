const GAME_ID = 'tileturn';

// Level Packs Configuration
const PACKS = [
    { id: 1, name: "Starter", desc: "Classic Mod, 3×3 Grid", mode: "classic", size: 3, levels: 20, tapRange: [1, 5] },
    { id: 2, name: "Apprentice", desc: "Classic Mod, 4×4 Grid", mode: "classic", size: 4, levels: 30, tapRange: [3, 8] },
    { id: 3, name: "Master", desc: "Classic Mod, 5×5 Grid", mode: "classic", size: 5, levels: 40, tapRange: [5, 12] },
    { id: 4, name: "Ripple", desc: "Cascade Mod, 4×4 Grid", mode: "cascade", size: 4, levels: 30, tapRange: [3, 8] },
    { id: 5, name: "Tsunami", desc: "Cascade Mod, 5×5 Grid", mode: "cascade", size: 5, levels: 40, tapRange: [5, 10] },
    { id: 6, name: "Colors", desc: "Spectrum Mod, 4×4 Grid", mode: "spectrum", size: 4, levels: 30, tapRange: [4, 10] },
    { id: 7, name: "Prism", desc: "Spectrum Mod, 5×5 Grid", mode: "spectrum", size: 5, levels: 40, tapRange: [6, 14] }
];

let state = {
    currentPackId: null,
    currentLevel: null,
    mode: "classic", // classic, cascade, spectrum
    size: 3,
    minMoves: 0,

    board: [], // 1D array of states. Classic/Cascade: 0=OFF, 1=ON. Spectrum: 0,1,2.
    moves: 0,
    history: [], // For undo functionality

    isPlaying: false
};

document.addEventListener('DOMContentLoaded', () => {
    initUIEvents();
    renderPacks();
    if (typeof renderCrossPromo === 'function') renderCrossPromo(GAME_ID);

    const soundBtn = document.getElementById('tt-btn-settings');
    if (soundBtn) soundBtn.textContent = localStorage.getItem('pv_sound') === 'off' ? '🔇' : '🔊';
});

function initUIEvents() {
    // Navigation
    document.getElementById('tt-back-to-packs').addEventListener('click', () => switchView('packs'));
    document.getElementById('tt-back-to-levels').addEventListener('click', () => {
        if (state.currentPackId) renderLevels(state.currentPackId);
        switchView('levels');
    });

    // Modals
    document.getElementById('tt-btn-help').addEventListener('click', () => {
        document.getElementById('tt-help-modal').classList.add('open');
    });
    document.getElementById('tt-btn-settings').addEventListener('click', () => {
        SFX.toggle();
        document.getElementById('tt-btn-settings').textContent = SFX.enabled ? '🔊' : '🔇';
        showToast(SFX.enabled ? 'Sound On' : 'Sound Off');
    });
    document.getElementById('tt-btn-stats').addEventListener('click', () => { SFX.play('tap'); showStatsModal(); });

    // Game Controls
    document.getElementById('tt-btn-undo').addEventListener('click', undoMove);
    document.getElementById('tt-btn-reset').addEventListener('click', resetLevel);

    // Result Modal
    document.getElementById('tt-btn-next-level').addEventListener('click', () => {
        document.getElementById('tt-result-modal').classList.remove('open');
        const pack = PACKS.find(p => p.id === state.currentPackId);
        if (state.currentLevel < pack.levels) {
            startLevel(state.currentPackId, state.currentLevel + 1);
        } else {
            switchView('packs');
        }
    });

    document.getElementById('tt-btn-result-levels').addEventListener('click', () => {
        document.getElementById('tt-result-modal').classList.remove('open');
        renderLevels(state.currentPackId);
        switchView('levels');
    });
}

function switchView(viewName) {
    document.querySelectorAll('.tt-screen').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
}

// ---------------------------
// VIEW 1: Packs
// ---------------------------
function renderPacks() {
    const list = document.getElementById('tt-pack-list');
    list.innerHTML = '';

    // Retrieve progress
    const progress = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_progress`)) || {};

    PACKS.forEach(pack => {
        // Calculate stars
        let packStars = 0;
        let packMaxStars = pack.levels * 3;
        if (progress[pack.id]) {
            Object.values(progress[pack.id]).forEach(stars => packStars += stars);
        }

        const btn = document.createElement('div');
        btn.className = 'tt-pack-card';

        let badgeClass = 'badge-classic';
        if (pack.mode === 'cascade') badgeClass = 'badge-cascade';
        if (pack.mode === 'spectrum') badgeClass = 'badge-spectrum';

        btn.innerHTML = `
            <div class="tt-pack-info">
                <div class="tt-pack-name">
                    Pack ${pack.id}: ${pack.name} 
                    <span class="tt-pack-badge ${badgeClass}">${pack.mode}</span>
                </div>
                <div class="tt-pack-desc">${pack.desc}</div>
            </div>
            <div class="tt-pack-progress">⭐ ${packStars} / ${packMaxStars}</div>
        `;
        btn.addEventListener('click', () => {
            SFX.play('tap');
            renderLevels(pack.id);
            switchView('levels');
        });
        list.appendChild(btn);
    });
}

// ---------------------------
// VIEW 2: Levels
// ---------------------------
function renderLevels(packId) {
    state.currentPackId = packId;
    const pack = PACKS.find(p => p.id === packId);

    document.getElementById('tt-pack-title').textContent = `Pack ${pack.id}: ${pack.name}`;

    const grid = document.getElementById('tt-level-grid');
    grid.innerHTML = '';

    const progress = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_progress`)) || {};
    const packProgress = progress[packId] || {};

    let highestUnlocked = 1;
    for (let i = 1; i <= pack.levels; i++) {
        if (packProgress[i]) highestUnlocked = i + 1;
    }

    for (let i = 1; i <= pack.levels; i++) {
        const btn = document.createElement('button');
        const stars = packProgress[i] || 0;
        const isLocked = i > highestUnlocked;

        btn.className = `tt-level-btn ${isLocked ? 'locked' : ''}`;

        let starsHtml = '';
        if (!isLocked) {
            starsHtml = `
                <div class="tt-level-stars">
                    ${stars >= 1 ? '<span class="tt-star-filled">★</span>' : '<span class="tt-star-empty">★</span>'}
                    ${stars >= 2 ? '<span class="tt-star-filled">★</span>' : '<span class="tt-star-empty">★</span>'}
                    ${stars >= 3 ? '<span class="tt-star-filled">★</span>' : '<span class="tt-star-empty">★</span>'}
                </div>
            `;
        }

        btn.innerHTML = `
            <div class="tt-level-num">${isLocked ? '🔒' : i}</div>
            ${starsHtml}
        `;

        if (!isLocked) {
            btn.addEventListener('click', () => {
                SFX.play('tap');
                startLevel(packId, i);
            });
        }
        grid.appendChild(btn);
    }
}

// ---------------------------
// INITIALIZATION / PUZZLE GEN
// ---------------------------
function generatePuzzle(pack, levelIdx) {
    // Determine number of backward taps based on level progress within the pack's range
    let ratio = (levelIdx - 1) / Math.max(1, (pack.levels - 1));
    let tRange = pack.tapRange;
    let minTapsTarget = Math.round(tRange[0] + ratio * (tRange[1] - tRange[0]));

    // Seeded Random for determinism per level
    // So identical pack/level always generates identical puzzle
    const seed = getDailySeed(`${GAME_ID}_p${pack.id}_l${levelIdx}`);
    const rng = new SeededRandom(seed);

    let size = pack.size;
    let totalCells = size * size;

    // Start in Solved State
    // Classic/Cascade: Target is 1 (ON). Spectrum: Target is 2 (Blue/Unified). 
    let board = new Array(totalCells).fill(pack.mode === 'spectrum' ? 2 : 1);

    // Reverse tap logic
    let historyMoves = [];

    // To prevent immediate trivial repeats, keep track of recent taps
    let tapCounts = new Array(totalCells).fill(0);

    for (let i = 0; i < minTapsTarget; i++) {
        // Pick a random cell
        let cell = rng.nextInt(0, totalCells - 1);

        // Slightly discourage tapping the exact same cell multiple times back-to-back
        // in order to actually scramble the board
        while (tapCounts[cell] > 1 || (historyMoves.length > 0 && historyMoves[historyMoves.length - 1] === cell)) {
            cell = rng.nextInt(0, totalCells - 1);
            // Safety breakout if taking too long 
            if (rng.next() < 0.1) break;
        }

        tapCounts[cell]++;
        historyMoves.push(cell);

        // Apply reverse tap
        if (pack.mode === 'classic' || pack.mode === 'cascade') {
            // Toggling is symmetric, so reverse tap == forward tap
            applyTapLogic(board, cell, size, pack.mode, true);
        } else if (pack.mode === 'spectrum') {
            // Spectrum cycles 0->1->2->0 forward. 
            // Backward is 0->2, 2->1, 1->0
            applyTapLogic(board, cell, size, pack.mode, true); // true = reverse
        }
    }

    // MinTaps could theoretically be lower if moves cancelled out, but we'll use target
    // for a generous baseline.
    return {
        board: board,
        minTaps: minTapsTarget
    };
}

// Applies tap logic. Reverse is used during generation for asymmetric modes (Spectrum)
function applyTapLogic(boardArr, tapIdx, size, mode, isReverse = false) {
    const tr = Math.floor(tapIdx / size);
    const tc = tapIdx % size;

    // Helper to toggle a specific cell
    const toggleCell = (r, c) => {
        if (r < 0 || r >= size || c < 0 || c >= size) return;
        let idx = r * size + c;
        if (mode === 'classic' || mode === 'cascade') {
            boardArr[idx] = 1 - boardArr[idx];
        } else if (mode === 'spectrum') {
            if (isReverse) {
                boardArr[idx] = (boardArr[idx] + 2) % 3; // equivalent to -1 mod 3
            } else {
                boardArr[idx] = (boardArr[idx] + 1) % 3;
            }
        }
    };

    // Level 1 logic (affect target and adjacent 4)
    toggleCell(tr, tc); // Center
    toggleCell(tr - 1, tc); // Top
    toggleCell(tr + 1, tc); // Bottom
    toggleCell(tr, tc - 1); // Left
    toggleCell(tr, tc + 1); // Right

    // Cascade propagates 2 levels deep
    if (mode === 'cascade') {
        const cascadeOpts = [
            [-2, 0], [2, 0], [0, -2], [0, 2], // Outermost tips
            [-1, -1], [-1, 1], [1, -1], [1, 1] // Diagonals
        ];
        cascadeOpts.forEach(offset => {
            toggleCell(tr + offset[0], tc + offset[1]);
        });
    }
}

// Get the affected indices for animation purposes (returns array of cell indices)
function getAffectedIndices(tapIdx, size, mode) {
    const tr = Math.floor(tapIdx / size);
    const tc = tapIdx % size;
    let affected = [];

    const addIfValid = (r, c) => {
        if (r >= 0 && r < size && c >= 0 && c < size) affected.push(r * size + c);
    };

    addIfValid(tr, tc);
    addIfValid(tr - 1, tc);
    addIfValid(tr + 1, tc);
    addIfValid(tr, tc - 1);
    addIfValid(tr, tc + 1);

    if (mode === 'cascade') {
        const cascadeOpts = [
            [-2, 0], [2, 0], [0, -2], [0, 2],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];
        cascadeOpts.forEach(o => addIfValid(tr + o[0], tc + o[1]));
    }
    return affected;
}

// ---------------------------
// VIEW 3: GAMEPLAY
// ---------------------------
function startLevel(packId, levelIdx) {
    state.currentPackId = packId;
    state.currentLevel = levelIdx;

    const pack = PACKS.find(p => p.id === packId);
    state.mode = pack.mode;
    state.size = pack.size;
    state.moves = 0;
    state.history = [];
    state.isPlaying = true;

    // Generate puzzle
    const setup = generatePuzzle(pack, levelIdx);
    state.board = [...setup.board];
    state.minMoves = setup.minTaps;

    // Update UI headers
    document.getElementById('tt-game-level-lbl').textContent = `Pack ${pack.id} - Level ${levelIdx}`;
    document.getElementById('tt-game-star-req-lbl').textContent = `⭐⭐⭐ ≤ ${state.minMoves} moves`;
    updateMoveCounter();

    buildBoardDOM();
    switchView('game');
}

function resetLevel() {
    if (!state.isPlaying) return;
    SFX.play('tap');

    // Jump to the very first history state if it exists, or restart
    if (state.history.length > 0) {
        state.board = [...state.history[0].board];
        state.history = [];
        state.moves = 0;
        updateMoveCounter();
        refreshBoardDOM();
    } else {
        // If no history, we haven't made a move, basically already reset
        // but just to be safe, we can trigger startLevel again
        startLevel(state.currentPackId, state.currentLevel);
    }
}

function undoMove() {
    if (!state.isPlaying || state.history.length === 0) return;
    SFX.play('tap');

    const prevState = state.history.pop();
    state.board = [...prevState.board];
    state.moves = prevState.moves;

    updateMoveCounter();
    refreshBoardDOM();
}

function buildBoardDOM() {
    const gridEl = document.getElementById('tt-grid');
    gridEl.innerHTML = '';

    // Set grid CSS
    gridEl.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${state.size}, 1fr)`;

    // Calculate tile sizes
    const containerWidth = Math.min(window.innerWidth - 64, 400); // minus padding
    const gap = 8;
    const tileSize = (containerWidth - (gap * (state.size - 1))) / state.size;

    for (let i = 0; i < state.board.length; i++) {
        const tile = document.createElement('div');
        tile.className = 'tt-tile';
        tile.style.width = `${tileSize}px`;
        tile.style.height = `${tileSize}px`;
        tile.id = `tt-tile-${i}`;

        applyTileStateCSS(tile, state.board[i], state.mode);

        tile.addEventListener('click', () => handleTileTap(i));

        gridEl.appendChild(tile);
    }
}

function applyTileStateCSS(tileEl, val, mode) {
    // Reset all spec and on classes
    tileEl.classList.remove('is-on', 'spec-0', 'spec-1', 'spec-2');

    if (mode === 'classic' || mode === 'cascade') {
        if (val === 1) tileEl.classList.add('is-on');
    } else if (mode === 'spectrum') {
        tileEl.classList.add(`spec-${val}`);
    }
}

function refreshBoardDOM() {
    for (let i = 0; i < state.board.length; i++) {
        const tile = document.getElementById(`tt-tile-${i}`);
        if (tile) applyTileStateCSS(tile, state.board[i], state.mode);
    }
}

function updateMoveCounter() {
    document.getElementById('tt-move-count').textContent = state.moves;
}

function handleTileTap(idx) {
    if (!state.isPlaying) return;

    // Save history
    state.history.push({
        board: [...state.board],
        moves: state.moves
    });

    state.moves++;
    updateMoveCounter();
    SFX.play('combo'); // Light click sound

    // Apply Logic
    applyTapLogic(state.board, idx, state.size, state.mode, false);

    // Animate and refresh (with staggered start times for ripple effect)
    const affectedIndices = getAffectedIndices(idx, state.size, state.mode);

    // Calculate distance for ripple staggering
    const tr = Math.floor(idx / state.size);
    const tc = idx % state.size;

    affectedIndices.forEach(aIdx => {
        const ar = Math.floor(aIdx / state.size);
        const ac = aIdx % state.size;
        const dist = Math.abs(ar - tr) + Math.abs(ac - tc);

        const delay = dist * 50; // 50ms per step

        setTimeout(() => {
            const tile = document.getElementById(`tt-tile-${aIdx}`);
            if (tile) {
                applyTileStateCSS(tile, state.board[aIdx], state.mode);
                tile.classList.remove('anim-ripple');
                void tile.offsetWidth; // Reflow
                tile.classList.add('anim-ripple');
            }
        }, delay);
    });

    // Check Win Condition after the longest ripple has triggered
    const maxDist = state.mode === 'cascade' ? 4 : 2;
    setTimeout(() => {
        checkWinCondition();
    }, maxDist * 50 + 100);
}

function checkWinCondition() {
    if (!state.isPlaying) return;

    let isWin = false;
    if (state.mode === 'classic' || state.mode === 'cascade') {
        // All ON (1)
        isWin = state.board.every(val => val === 1);
    } else if (state.mode === 'spectrum') {
        // All same color (doesn't matter which color, just unified)
        const first = state.board[0];
        isWin = state.board.every(val => val === first);
    }

    if (isWin) {
        handleWin();
    }
}

function handleWin() {
    state.isPlaying = false;
    SFX.play('win');

    // Calculate Stars
    let stars = 1;
    if (state.moves <= state.minMoves) stars = 3;
    else if (state.moves <= state.minMoves + 2) stars = 2;

    // Save progress
    const progress = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_progress`)) || {};
    if (!progress[state.currentPackId]) progress[state.currentPackId] = {};

    // Only overwrite if better stars
    const currentStars = progress[state.currentPackId][state.currentLevel] || 0;
    if (stars > currentStars) {
        progress[state.currentPackId][state.currentLevel] = stars;
        localStorage.setItem(`pv_${GAME_ID}_progress`, JSON.stringify(progress));
    }

    // Display Result Overlay
    const modal = document.getElementById('tt-result-modal');

    let starHtml = '';
    if (stars === 3) starHtml = '⭐⭐⭐';
    else if (stars === 2) starHtml = '⭐⭐<span class="tt-star-empty">★</span>';
    else starHtml = '⭐<span class="tt-star-empty">★★</span>';

    document.getElementById('tt-res-stars').innerHTML = starHtml;

    let msg = '';
    if (stars === 3) msg = 'Perfect! Solved in minimum moves.';
    else if (stars === 2) msg = 'Great job! But it can be solved in fewer moves.';
    else msg = 'Cleared! Try using less moves next time.';

    document.getElementById('tt-res-msg').textContent = msg;

    modal.classList.add('open');

    // Check Interstitial
    if (state.currentLevel % 10 === 0 && window.AdController) {
        AdController.showInterstitial();
    }
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

    const body = document.getElementById('tt-stats-body');
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
        <p style="font-size:0.9rem; color:var(--pv-text-secondary); text-align:center; margin-top:20px;">Keep turning tiles to earn more stars!</p>
    `;

    document.getElementById('tt-stats-modal').classList.add('open');
}
