const GAME_ID = 'tileturn';

// Level Packs Configuration
const PACKS = [
    { id: 1, name: "Starter", desc: "Basic, 3×3 Grid", mode: "classic", size: 3, levels: 20, tapRange: [1, 5] },
    { id: 2, name: "Apprentice", desc: "Basic, 4×4 Grid", mode: "classic", size: 4, levels: 20, tapRange: [3, 8] },
    { id: 3, name: "Master", desc: "Basic, 5×5 Grid", mode: "classic", size: 5, levels: 20, tapRange: [5, 12] },
    { id: 4, name: "Ripple", desc: "Cascade, 4×4 Grid", mode: "cascade", size: 4, levels: 20, tapRange: [3, 8] },
    { id: 5, name: "Tsunami", desc: "Cascade, 5×5 Grid", mode: "cascade", size: 5, levels: 20, tapRange: [5, 10] },
    { id: 6, name: "Colors", desc: "Spectrum, 4×4 Grid", mode: "spectrum", size: 4, levels: 20, tapRange: [4, 10] },
    { id: 7, name: "Prism", desc: "Spectrum, 5×5 Grid", mode: "spectrum", size: 5, levels: 20, tapRange: [6, 14] }
];

let state = {
    currentPackId: null,
    currentLevel: null,
    mode: "classic",
    size: 3,
    minMoves: 0,

    board: [],
    moves: 0,
    hintsUsed: 0,
    history: [],

    isPlaying: false,
    isAutoSolving: false
};

document.addEventListener('DOMContentLoaded', () => {
    initUIEvents();
    renderPacks();
    if (typeof renderCrossPromo === 'function') renderCrossPromo(GAME_ID);
    if (typeof HintManager !== 'undefined') HintManager.init(GAME_ID);

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

    const handleModalAdClick = (callback) => {
        if (typeof AdController !== 'undefined') {
            AdController.showRewardAd(callback);
        } else {
            callback();
        }
    };

    const btnHintRestart = document.getElementById('tt-btn-hint-restart');
    if (btnHintRestart) {
        btnHintRestart.addEventListener('click', () => {
            handleModalAdClick(() => {
                document.getElementById('tt-hint-restart-modal').classList.remove('open');
                resetLevel();
            });
        });
    }

    const btnHintClose = document.getElementById('tt-btn-hint-close');
    if (btnHintClose) {
        btnHintClose.addEventListener('click', () => {
            handleModalAdClick(() => {
                document.getElementById('tt-hint-restart-modal').classList.remove('open');
            });
        });
    }

    const btnHintView = document.getElementById('tt-btn-hint-view');
    if (btnHintView) {
        btnHintView.addEventListener('click', () => {
            handleModalAdClick(() => {
                document.getElementById('tt-hint-restart-modal').classList.remove('open');
            });
        });
    }
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
function backwardStepCascade(boardArr, tapIdx, size) {
    const tr = Math.floor(tapIdx / size);
    const tc = tapIdx % size;
    const M_indices = [];
    const addIfValid = (r, c) => {
        if (r >= 0 && r < size && c >= 0 && c < size) M_indices.push(r * size + c);
    };
    addIfValid(tr, tc);
    addIfValid(tr - 1, tc);
    addIfValid(tr + 1, tc);
    addIfValid(tr, tc - 1);
    addIfValid(tr, tc + 1);

    const predecessors = [];
    const numSubsets = 1 << M_indices.length;

    for (let mask = 0; mask < numSubsets; mask++) {
        const A = [];
        for (let bit = 0; bit < M_indices.length; bit++) {
            if ((mask & (1 << bit)) !== 0) A.push(M_indices[bit]);
        }

        const cascadeMask = new Array(size * size).fill(0);
        A.forEach(idx => {
            const r = Math.floor(idx / size);
            const c = idx % size;
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            dirs.forEach(([dr, dc]) => {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    cascadeMask[nr * size + nc] ^= 1;
                }
            });
        });

        const X_test = [...boardArr];
        M_indices.forEach(idx => X_test[idx] ^= 1);
        for (let i = 0; i < cascadeMask.length; i++) {
            if (cascadeMask[i]) X_test[i] ^= 1;
        }

        let valid = true;
        for (let bit = 0; bit < M_indices.length; bit++) {
            const idx = M_indices[bit];
            const shouldBeZero = (mask & (1 << bit)) !== 0;
            const isZero = (X_test[idx] === 0);
            if (shouldBeZero !== isZero) {
                valid = false;
                break;
            }
        }
        if (valid) predecessors.push(X_test);
    }
    return predecessors;
}

function generatePuzzle(pack, levelIdx) {
    let ratio = (levelIdx - 1) / Math.max(1, (pack.levels - 1));
    let tRange = pack.tapRange;
    let minTapsTarget = Math.round(tRange[0] + ratio * (tRange[1] - tRange[0]));

    const seed = getDailySeed(`${GAME_ID}_p${pack.id}_l${levelIdx}`);
    const rng = new SeededRandom(seed);
    let size = pack.size;
    let totalCells = size * size;

    let board = new Array(totalCells).fill(pack.mode === 'spectrum' ? 2 : 1);
    let historyMoves = [];
    let tapCounts = new Array(totalCells).fill(0);

    let validMovesMade = 0;
    let attempts = 0;

    while (validMovesMade < minTapsTarget && attempts < 1000) {
        attempts++;
        let cell = rng.nextInt(0, totalCells - 1);
        while (tapCounts[cell] > 1 || (historyMoves.length > 0 && historyMoves[historyMoves.length - 1] === cell)) {
            cell = rng.nextInt(0, totalCells - 1);
            if (rng.next() < 0.1) break;
        }

        if (pack.mode === 'cascade') {
            const predecessors = backwardStepCascade(board, cell, size);
            if (predecessors.length > 0) {
                board = predecessors[rng.nextInt(0, predecessors.length - 1)];
                tapCounts[cell]++;
                historyMoves.push(cell);
                validMovesMade++;
            }
        } else {
            tapCounts[cell]++;
            historyMoves.push(cell);
            applyTapLogic(board, cell, size, pack.mode, true);
            validMovesMade++;
        }
    }

    return {
        board: board,
        minTaps: validMovesMade,
        solutionSequence: historyMoves.reverse()
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

    // Cascade propagates 2 levels deep (now only used directly by forward logic if we need it)
    // NOTE: Generating backward no longer uses applyTapLogic for cascade!
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
    state.hintsUsed = 0;
    state.history = [];
    state.isPlaying = true;
    state.isAutoSolving = false;

    // Generate puzzle
    const setup = generatePuzzle(pack, levelIdx);
    state.board = [...setup.board];
    state.minMoves = setup.minTaps;
    state.solution = setup.solutionSequence;

    // Update UI headers
    document.getElementById('tt-game-level-lbl').textContent = `Pack ${pack.id} - Level ${levelIdx}`;
    document.getElementById('tt-game-star-req-lbl').textContent = `⭐⭐⭐ ≤ ${state.minMoves} moves`;
    updateMoveCounter();

    buildBoardDOM();
    switchView('game');
}

function resetLevel() {
    if (state.currentPackId === null) return;
    SFX.play('tap');

    // Jump to the very first history state if it exists, or restart
    if (state.history.length > 0) {
        state.board = [...state.history[0].board];
        state.history = [];
        state.moves = 0;
        state.isPlaying = true;
        state.isAutoSolving = false;
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
    if (!state.isPlaying || state.isAutoSolving) return;

    // Save history
    state.history.push({
        board: [...state.board],
        moves: state.moves
    });

    state.moves++;
    updateMoveCounter();
    SFX.play('combo');

    if (state.mode === 'cascade') {
        // Cascade: 2-step with 300ms delay per SKILL.md
        // Step 1: normal toggle (target + adjacent)
        const step1Before = [...state.board];
        applyTapLogic(state.board, idx, state.size, 'classic', false); // apply as classic first

        // Animate step 1
        const step1Affected = getAffectedIndices(idx, state.size, 'classic');
        step1Affected.forEach(aIdx => {
            const tile = document.getElementById(`tt-tile-${aIdx}`);
            if (tile) {
                applyTileStateCSS(tile, state.board[aIdx], state.mode);
                tile.classList.remove('anim-ripple');
                void tile.offsetWidth;
                tile.classList.add('anim-ripple');
            }
        });

        // Determine which tiles were turned ON in step 1
        const turnedOnInStep1 = [];
        for (let i = 0; i < state.board.length; i++) {
            if (step1Before[i] === 0 && state.board[i] === 1) turnedOnInStep1.push(i);
        }

        // Step 2: after 300ms, tiles turned ON toggle THEIR adjacent
        if (turnedOnInStep1.length > 0) {
            setTimeout(() => {
                turnedOnInStep1.forEach(tIdx => {
                    const tr2 = Math.floor(tIdx / state.size);
                    const tc2 = tIdx % state.size;
                    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                    dirs.forEach(([dr, dc]) => {
                        const nr = tr2 + dr, nc = tc2 + dc;
                        if (nr >= 0 && nr < state.size && nc >= 0 && nc < state.size) {
                            const ni = nr * state.size + nc;
                            state.board[ni] = 1 - state.board[ni];
                            const tile = document.getElementById(`tt-tile-${ni}`);
                            if (tile) {
                                applyTileStateCSS(tile, state.board[ni], state.mode);
                                tile.classList.remove('anim-ripple');
                                void tile.offsetWidth;
                                tile.classList.add('anim-ripple');
                            }
                        }
                    });
                });
                setTimeout(() => checkWinCondition(), 150);
            }, 300);
        } else {
            setTimeout(() => checkWinCondition(), 150);
        }
    } else {
        // Classic/Spectrum: normal toggle
        applyTapLogic(state.board, idx, state.size, state.mode, false);

        const affectedIndices = getAffectedIndices(idx, state.size, state.mode);
        const tr = Math.floor(idx / state.size);
        const tc = idx % state.size;

        affectedIndices.forEach(aIdx => {
            const ar = Math.floor(aIdx / state.size);
            const ac = aIdx % state.size;
            const dist = Math.abs(ar - tr) + Math.abs(ac - tc);
            const delay = dist * 50;

            setTimeout(() => {
                const tile = document.getElementById(`tt-tile-${aIdx}`);
                if (tile) {
                    applyTileStateCSS(tile, state.board[aIdx], state.mode);
                    tile.classList.remove('anim-ripple');
                    void tile.offsetWidth;
                    tile.classList.add('anim-ripple');
                }
            }, delay);
        });

        const maxDist = 2;
        setTimeout(() => checkWinCondition(), maxDist * 50 + 100);
    }
}

function checkWinCondition() {
    if (!state.isPlaying) return;

    let isWin = false;
    if (state.mode === 'classic' || state.mode === 'cascade') {
        isWin = state.board.every(val => val === 1);
    } else if (state.mode === 'spectrum') {
        // SKILL.md: Goal is all tiles to Green (2)
        isWin = state.board.every(val => val === 2);
    }

    if (isWin) {
        handleWin();
    }
}

function handleWin() {
    state.isPlaying = false;
    SFX.play('win');

    if (state.isAutoSolving) {
        document.getElementById('tt-hint-restart-modal').classList.add('open');
        return;
    }

    // Calculate Stars
    let stars = 1;
    if (state.moves <= state.minMoves) stars = 3;
    else if (state.moves <= state.minMoves + 2) stars = 2;

    // Calculate Score per SKILL.md: 300 base + efficiency + no-hint ×1.2 + pack clear 2000
    let score = 300;
    if (state.moves <= state.minMoves) {
        score += (state.minMoves) * 50; // efficiency bonus for minimum moves
    } else {
        score += Math.max(0, (state.minMoves * 2 - state.moves) * 20);
    }
    if (state.hintsUsed === 0) score = Math.round(score * 1.2);

    // Check pack clear
    const progress = JSON.parse(localStorage.getItem(`pv_${GAME_ID}_progress`)) || {};
    if (!progress[state.currentPackId]) progress[state.currentPackId] = {};

    const currentStars = progress[state.currentPackId][state.currentLevel] || 0;
    if (stars > currentStars) {
        progress[state.currentPackId][state.currentLevel] = stars;
        localStorage.setItem(`pv_${GAME_ID}_progress`, JSON.stringify(progress));
    }

    // Check if entire pack is now complete for pack clear bonus
    const pack = PACKS.find(p => p.id === state.currentPackId);
    let packComplete = true;
    for (let i = 1; i <= pack.levels; i++) {
        if (!progress[state.currentPackId][i]) { packComplete = false; break; }
    }
    if (packComplete) score += 2000;

    // Display Result Overlay
    const modal = document.getElementById('tt-result-modal');

    let starHtml = '';
    if (stars === 3) starHtml = '⭐⭐⭐';
    else if (stars === 2) starHtml = '⭐⭐<span class="tt-star-empty">★</span>';
    else starHtml = '⭐<span class="tt-star-empty">★★</span>';

    document.getElementById('tt-res-stars').innerHTML = starHtml;

    let msg = `Score: ${score}`;
    if (stars === 3) msg += ' — Perfect! Minimum moves.';
    else if (stars === 2) msg += ' — Great! Close to minimum.';
    else msg += ' — Cleared! Try fewer moves.';

    document.getElementById('tt-res-msg').textContent = msg;

    // Render mini cross-promo
    const promoContainer = document.getElementById('tt-mini-promo');
    if (promoContainer && typeof renderMiniCrossPromo === 'function') {
        renderMiniCrossPromo(GAME_ID, promoContainer);
    }

    modal.classList.add('open');

    // Ad refresh when completing levels
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

/* === SHARE === */
window.shareTT = function () {
    const size = state.size;
    let grid = '';
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const val = state.board[r * size + c];
            if (state.mode === 'spectrum') {
                grid += val === 2 ? '🟩' : val === 1 ? '🟦' : '⬜';
            } else {
                grid += val === 1 ? '🟦' : '⬜';
            }
        }
        grid += '\n';
    }
    let text = `🔄 TileTurn Pack ${state.currentPackId} Lvl ${state.currentLevel}\n`;
    text += `✅ Solved in ${state.moves} moves (min: ${state.minMoves})\n`;
    text += grid;
    text += 'puzzlevault.pages.dev/tileturn';
    if (typeof shareResult === 'function') shareResult(text);
};

/* === HINT SYSTEM === */
window.useTileTurnHint = function () {
    if (!state.isPlaying || state.isAutoSolving) return;

    const revealHint = () => {
        if (state.hintsUsed === 0) state.hintsUsed++;

        // Reset board to pristine state to show the perfect solution
        if (state.history.length > 0) {
            state.board = [...state.history[0].board];
            state.history = [];
            state.moves = 0;
            updateMoveCounter();
            refreshBoardDOM();
        }

        state.isAutoSolving = true;
        let stepIndex = 0;

        const solveNext = () => {
            if (!state.isPlaying || !state.isAutoSolving) return;

            if (stepIndex >= state.solution.length) {
                checkWinCondition();
                return;
            }

            const nextMoveIdx = state.solution[stepIndex];
            stepIndex++;

            const tile = document.getElementById(`tt-tile-${nextMoveIdx}`);
            if (tile) {
                tile.style.boxShadow = '0 0 12px 4px #D97706';
                tile.style.border = '3px solid #D97706';
                SFX.play('hint');
                setTimeout(() => {
                    if (tile) {
                        tile.style.boxShadow = '';
                        tile.style.border = '';
                    }
                }, 400);
            }

            // Simulate tap
            state.isAutoSolving = false;
            handleTileTap(nextMoveIdx);
            state.isAutoSolving = true;

            const nextDelay = state.mode === 'cascade' ? 800 : 500;
            setTimeout(solveNext, nextDelay);
        };

        solveNext();
    };

    if (typeof HintManager !== 'undefined') {
        HintManager.requestHint(revealHint);
    } else {
        revealHint();
    }
};
