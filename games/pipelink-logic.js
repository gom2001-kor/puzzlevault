/**
 * PipeLink Logic - PuzzleVault
 * A circuit connection puzzle game.
 */

const PipeLink = {
    // Canvas context
    canvas: null,
    ctx: null,

    // Grid settings
    size: 4,
    cellSize: 0,
    margin: 4, // internal cell margin

    // Game state
    grid: [],
    sources: [], // [{r, c, type:'A'}, {r, c, type:'B'}]
    dests: [],   // [{r, c, type:'A'}, {r, c, type:'B'}]
    moves: 0,
    hintsUsed: 0,
    packId: 1,
    levelId: 1,
    gameState: 'menu',
    dualMode: false,
    isAutoSolving: false,

    // Animation state
    animations: [],
    lastFrameTime: 0,

    // History for undo/reset
    initialGridState: null,

    // Theming (matching global.css variables)
    colors: {
        bg: '#0F172A',
        grid: '#1E293B',
        slate: '#475569',
        amber: '#D97706',
        cyan: '#0891B2',
        emerald: '#059669',
        lock: '#EF4444',
        amberGlow: 'rgba(217, 119, 6, 0.4)',
        cyanGlow: 'rgba(8, 145, 178, 0.4)'
    },

    /**
     * TILE TYPES AND PATHS
     * Rotations: 0=Up, 1=Right, 2=Down, 3=Left
     * connections array defines where the path exits the tile [Top, Right, Bottom, Left]
     * A value of 1 means connected. 0 means disconnected.
     */
    TILE_DEFS: {
        0: { name: 'Empty', connects: [0, 0, 0, 0] },
        1: { name: 'Straight', connects: [1, 0, 1, 0] }, // Vertical
        2: { name: 'L-Bend', connects: [1, 1, 0, 0] },   // Top to Right
        3: { name: 'T-Junc', connects: [1, 1, 1, 0] },   // Top, Right, Bottom
        4: { name: 'Cross', connects: [1, 1, 1, 1] },    // All four
        5: { name: 'Source', connects: [0, 1, 0, 0], isEnd: true }, // Emits right initially
        6: { name: 'Dest', connects: [0, 0, 0, 1], isEnd: true }    // Receives left initially
    },

    // UI Elements
    ui: {
        movesLbl: null,
        levelLbl: null,
        statusA: null,
        statusB: null,
        connLblA: null,
        connLblB: null,
        packList: null,
        levelGrid: null,
        viewPacks: null,
        viewLevels: null,
        viewGame: null,
        packTitle: null,
        resStars: null,
        resMsg: null,
        resTaps: null,
        resUtil: null
    },

    // Local Storage keys
    STORAGE_PREFIX: 'pv_pipelink_',

    /**
     * Entry point
     */
    init() {
        // Cache UI elements
        this.canvas = document.getElementById('pl-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.ui.movesLbl = document.getElementById('pl-moves-lbl');
        this.ui.levelLbl = document.getElementById('pl-game-level-lbl');
        this.ui.statusA = document.getElementById('pl-status-A');
        this.ui.statusB = document.getElementById('pl-status-B');
        this.ui.connLblA = document.getElementById('pl-conn-lbl-A');
        this.ui.connLblB = document.getElementById('pl-conn-lbl-B');

        this.ui.packList = document.getElementById('pl-pack-list');
        this.ui.levelGrid = document.getElementById('pl-level-grid');
        this.ui.viewPacks = document.getElementById('view-packs');
        this.ui.viewLevels = document.getElementById('view-levels');
        this.ui.viewGame = document.getElementById('view-game');
        this.ui.packTitle = document.getElementById('pl-pack-title');

        this.ui.resStars = document.getElementById('pl-res-stars');
        this.ui.resMsg = document.getElementById('pl-res-msg');
        this.ui.resTaps = document.getElementById('pl-res-taps');
        this.ui.resUtil = document.getElementById('pl-res-util');

        this.bindEvents();
        this.resizeCanvas();
        this.renderPackList();

        if (typeof renderCrossPromo === 'function') renderCrossPromo('pipelink');
        if (typeof HintManager !== 'undefined') HintManager.init('pipelink');

        // Start animation loop
        requestAnimationFrame(this.renderLoop.bind(this));
    },

    bindEvents() {
        window.addEventListener('resize', () => {
            if (this.gameState === 'playing') {
                this.resizeCanvas();
                this.drawBoard();
            }
        });

        // Pointer events for Canvas
        let lastTapTime = 0;
        let lastTapCell = null;

        this.canvas.addEventListener('pointerdown', (e) => {
            if (this.gameState !== 'playing') return;
            e.preventDefault();

            // Initialize audio on first interact
            if (SFX && SFX.ctx && SFX.ctx.state === 'suspended') {
                SFX.ctx.resume();
            }

            const rect = this.canvas.getBoundingClientRect();
            // Handle touch scaling
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            let clientX = e.clientX;
            let clientY = e.clientY;

            // If touches exist, it might be a touch event wrapper
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }

            const x = (clientX - rect.left) * scaleX;
            const y = (clientY - rect.top) * scaleY;

            const c = Math.floor(x / this.cellSize);
            const r = Math.floor(y / this.cellSize);

            if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
                const cell = this.grid[r][c];

                // Block interaction with Sources/Dests or Locked tiles
                if (cell.type === 0 || cell.type === 5 || cell.type === 6) return;

                if (cell.locked) {
                    this.triggerShake(r, c);
                    if (SFX) SFX.play('wrong');
                    return;
                }

                // Detect double-tap
                const now = Date.now();
                const isDoubleTap = (now - lastTapTime < 300 && lastTapCell && lastTapCell.r === r && lastTapCell.c === c);

                lastTapTime = now;
                lastTapCell = { r, c };

                if (isDoubleTap) {
                    // Double tap: +180 deg. (It already rotated +90 on first tap, so add another 90 = 180 total)
                    this.rotateTile(r, c, 1);
                } else {
                    // Single tap: +90 deg
                    this.rotateTile(r, c, 1);
                }
            }
        });

        // Navigation
        document.getElementById('pl-back-to-packs').addEventListener('click', () => {
            this.renderPackList();
            this.switchView('packs');
        });
        document.getElementById('pl-back-to-levels').addEventListener('click', () => {
            this.renderLevelList();
            this.switchView('levels');
        });
        document.getElementById('pl-btn-result-packs').addEventListener('click', () => {
            document.getElementById('pl-result-modal').classList.remove('open');
            this.renderPackList();
            this.switchView('packs');
        });
        document.getElementById('pl-btn-next').addEventListener('click', () => {
            document.getElementById('pl-result-modal').classList.remove('open');
            this.loadLevel(this.packId, this.levelId + 1);
        });
        document.getElementById('pl-btn-reset').addEventListener('click', () => {
            this.resetLevel();
        });
        document.getElementById('pl-btn-hint').addEventListener('click', () => {
            if (window.AdController) {
                AdController.showRewardAd(() => {
                    this.useHint();
                });
            } else {
                this.useHint();
            }
        });

        const btnHintRestart = document.getElementById('pl-btn-hint-restart');
        if (btnHintRestart) {
            btnHintRestart.addEventListener('click', () => {
                if (typeof AdController !== 'undefined') {
                    // PipeLink AdController usually implements showRewardAd
                    AdController.showRewardAd(() => {
                        document.getElementById('pl-hint-restart-modal').classList.remove('open');
                        this.resetLevel();
                    });
                } else {
                    document.getElementById('pl-hint-restart-modal').classList.remove('open');
                    this.resetLevel();
                }
            });
        }

        // Modals & Extras
        document.getElementById('pl-btn-help').addEventListener('click', () => {
            document.getElementById('pl-help-modal').classList.add('open');
        });
        document.getElementById('pl-btn-settings').addEventListener('click', (e) => {
            if (SFX) SFX.toggle();
            e.target.textContent = (SFX && SFX.enabled) ? '🔊' : '🔇';
        });
        document.getElementById('pl-btn-stats').addEventListener('click', () => {
            this.showStats();
        });
    },

    resizeCanvas() {
        // Find optimal canvas size (responsive)
        const container = document.querySelector('.pl-board-container');
        if (!container) return;

        let targetSize = container.clientWidth - 32; // minus padding
        if (targetSize <= 0) targetSize = Math.min(400, window.innerWidth - 64);

        const maxSize = Math.min(500, window.innerHeight * 0.5);
        targetSize = Math.min(targetSize, maxSize);

        // Prevent negative or zero
        if (targetSize < 50) targetSize = 300;

        // To avoid blurry text on high DPI, scale the internal resolution by devicePixelRatio
        const dpr = window.devicePixelRatio || 1;

        // Define canvas logical size
        this.canvas.style.width = targetSize + 'px';
        this.canvas.style.height = targetSize + 'px';

        // Define canvas actual size array memory
        const res = targetSize * dpr;
        this.canvas.width = res;
        this.canvas.height = res;

        // Calculate cell size based on board logic size
        this.cellSize = res / this.size;
    },

    /**
     * Board Data Generation (Random solvable board)
     */
    generateBoard(pack, level) {
        // Base sizes: Pack 1=4x4, Pack 2=5x5, Pack 3=6x6, Pack 4=7x7(Dual), Pack 5=8x8+(Dual+Locks)
        let baseSize = 3 + pack;
        if (baseSize > 10) baseSize = 10;

        this.size = baseSize;
        this.packId = pack;
        this.levelId = level;
        this.dualMode = (pack >= 4);

        // Seed based on pack and level
        let rng = new SeededRandom(this.getGlobalSeed(pack, level));
        let success = false;
        let attempts = 0;

        while (!success && attempts < 2000) {
            attempts++;

            // Initialize empty grid
            this.grid = Array(this.size).fill().map((_, r) =>
                Array(this.size).fill().map((_, c) => ({
                    type: 0, // empty
                    rot: 0,
                    locked: false,
                    colorA: false,
                    colorB: false
                }))
            );

            this.sources = [];
            this.dests = [];

            // Place Source A and Dest A randomly on opposite sides for better puzzles
            let r1 = rng.nextInt(0, this.size - 1);
            let c1 = 0; // Left edge
            let r2 = rng.nextInt(0, this.size - 1);
            let c2 = this.size - 1; // Right edge

            let sA = { r: r1, c: c1, t: 'A' };
            let dA = { r: r2, c: c2, t: 'A' };
            this.sources.push(sA);
            this.dests.push(dA);

            this.grid[sA.r][sA.c] = { type: 5, rot: 0, locked: true, colorA: true, colorB: false, targetRot: 0 }; // Emit Right
            this.grid[dA.r][dA.c] = { type: 6, rot: 0, locked: true, colorA: false, colorB: false, targetRot: 0 };

            // Pre-allocate Dual Source B if needed
            if (this.dualMode) {
                let sB = { r: 0, c: rng.nextInt(1, this.size - 2), t: 'B' }; // Top edge
                let dB = { r: this.size - 1, c: rng.nextInt(1, this.size - 2), t: 'B' }; // Bottom edge

                // Ensure B doesn't accidentally overlap A
                while ((sB.r === sA.r && sB.c === sA.c) || (sB.r === dA.r && sB.c === dA.c)) {
                    sB.c = rng.nextInt(1, this.size - 2);
                }
                while ((dB.r === sA.r && dB.c === sA.c) || (dB.r === dA.r && dB.c === dA.c)) {
                    dB.c = rng.nextInt(1, this.size - 2);
                }

                this.sources.push(sB);
                this.dests.push(dB);

                this.grid[sB.r][sB.c] = { type: 5, rot: 1, locked: true, colorA: false, colorB: true, targetRot: 1 }; // Emit Down
                this.grid[dB.r][dB.c] = { type: 6, rot: 0, locked: true, colorA: false, colorB: false, targetRot: 0 };
            }

            // Generate Paths
            let allowT = attempts < 500;
            let pathAOK = this.carvePath(sA.r, sA.c, dA.r, dA.c, rng, 'A', allowT);
            let pathBOK = true;

            if (pathAOK && this.dualMode) {
                const sB = this.sources[1];
                const dB = this.dests[1];
                pathBOK = this.carvePath(sB.r, sB.c, dB.r, dB.c, rng, 'B', allowT);
            }

            if (pathAOK && pathBOK) {
                // Fill remaining empty cells with random valid-looking tiles
                for (let r = 0; r < this.size; r++) {
                    for (let c = 0; c < this.size; c++) {
                        if (this.grid[r][c].type === 0) {
                            this.grid[r][c].type = rng.nextInt(1, 3); // mostly straights and Ls
                            this.grid[r][c].targetRot = rng.nextInt(0, 3);
                            this.grid[r][c].rot = this.grid[r][c].targetRot; // temp for testing
                        } else {
                            this.grid[r][c].targetRot = this.grid[r][c].rot;
                        }
                    }
                }

                // Verify Solvability of targetRot state (checking for Dual Mode leaks)
                for (let r = 0; r < this.size; r++) {
                    for (let c = 0; c < this.size; c++) {
                        this.grid[r][c].colorA = false;
                        this.grid[r][c].colorB = false;
                    }
                }

                this.traverseLine(sA, true, false);
                let winA = this.grid[dA.r][dA.c].colorA;
                let winB = !this.dualMode;

                if (this.dualMode) {
                    const sB = this.sources[1];
                    const dB = this.dests[1];
                    this.traverseLine(sB, false, true);
                    winB = this.grid[dB.r][dB.c].colorB;
                }

                // If perfectly solvable with no cross-circuit leaks
                if (winA && winB) {
                    success = true;
                    // Apply scrambles and locks now that we know targetRot forms a valid un-leaked board
                    for (let r = 0; r < this.size; r++) {
                        for (let c = 0; c < this.size; c++) {
                            // Clear test colors
                            this.grid[r][c].colorA = false;
                            this.grid[r][c].colorB = false;

                            if (this.grid[r][c].type === 5 || this.grid[r][c].type === 6) {
                                this.grid[r][c].locked = true; // Source/Dest always locked
                            } else {
                                this.grid[r][c].locked = false;
                                // Lock randomly for difficulty (anchor points) in later packs
                                if (pack >= 5 && rng.next() > 0.85 && this.grid[r][c].type !== 4) {
                                    this.grid[r][c].locked = true;
                                    this.grid[r][c].rot = this.grid[r][c].targetRot; // Must be locked in correct position
                                } else {
                                    // Scramble orientation for user to solve
                                    this.grid[r][c].rot = rng.nextInt(0, 3);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Save initial state for Reset functionality
        this.initialGridState = JSON.stringify(this.grid);
        this.moves = 0;
        this.gameState = 'playing';
        this.isAutoSolving = false;

        this.updateConnectionLogic();
        this.updateUI();
        this.resizeCanvas();
        this.drawBoard();
    },

    /**
     * Generation Pathfinding
     */
    carvePath(sr, sc, dr, dc, rng, pathType, allowT = true) {
        // A simple random walk that tries to reach dest
        // For puzzles, we represent the path as an array of coords, then instantiate tiles based on entry/exit.

        let path = [];
        let visited = Array(this.size).fill().map(() => Array(this.size).fill(false));
        visited[sr][sc] = true;

        // Ensure starting neighbor is selected based on Source rotation
        // For Source A (left edge, emits right rot:1): start at sc+1
        // For Source B (top edge, emits down rot:2): start at sr+1
        const startDir = (pathType === 'A') ? 1 : 2; // Fixed start rules per our generation
        const dR = [-1, 0, 1, 0];
        const dC = [0, 1, 0, -1];

        let initialPathR = sr + dR[startDir];
        let initialPathC = sc + dC[startDir];

        if (initialPathR < 0 || initialPathR >= this.size || initialPathC < 0 || initialPathC >= this.size) return; // Edge case fail

        const dfs = (r, c, forcedDir = -1) => {
            if (r === dr && c === dc) {
                return true;
            }
            if (visited[r][c]) return false;
            visited[r][c] = true;

            // Collect neighbors
            let neighbors = [0, 1, 2, 3];
            if (forcedDir !== -1) {
                neighbors = [forcedDir];
            } else {
                neighbors = rng.shuffle(neighbors);
            }

            path.push({ r, c });

            for (let d of neighbors) {
                const nr = r + dR[d];
                const nc = c + dC[d];

                if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                    // Avoid endpoints unless it's the target dest
                    if (this.grid[nr][nc].type === 5 || this.grid[nr][nc].type === 6) {
                        if (nr !== dr || nc !== dc) continue;
                    }

                    // Dual Mode Cross Safety
                    let nextForcedDir = -1;
                    if (this.grid[nr][nc].type > 0 && (nr !== dr || nc !== dc)) {
                        const existingTile = this.grid[nr][nc];
                        if (existingTile.type !== 1) continue; // Only cross straights

                        const isVertical = (existingTile.rot % 2 === 0);
                        if (isVertical && (d === 0 || d === 2)) continue;
                        if (!isVertical && (d === 1 || d === 3)) continue;

                        nextForcedDir = d; // Force straight crossing
                    }

                    if (dfs(nr, nc, nextForcedDir)) return true;
                }
            }

            path.pop();
            visited[r][c] = false; // backtrack to allow other paths
            return false;
        };

        if (!dfs(initialPathR, initialPathC)) return false;

        // Assemble tiles from path
        let fullSequence = [{ r: sr, c: sc }, ...path, { r: dr, c: dc }];

        for (let i = 1; i < fullSequence.length - 1; i++) {
            let prev = fullSequence[i - 1];
            let curr = fullSequence[i];
            let next = fullSequence[i + 1];

            // Determine entering and exiting directions
            // 0=Up, 1=Right, 2=Down, 3=Left
            let inDir = -1;
            if (prev.r < curr.r) inDir = 0; // Came from above
            else if (prev.r > curr.r) inDir = 2; // Came from below
            else if (prev.c < curr.c) inDir = 3; // Came from left
            else if (prev.c > curr.c) inDir = 1; // Came from right

            let outDir = -1;
            if (next.r < curr.r) outDir = 0; // Going up
            else if (next.r > curr.r) outDir = 2; // Going down
            else if (next.c < curr.c) outDir = 3; // Going left
            else if (next.c > curr.c) outDir = 1; // Going right

            // Figure out tile type and rotation based on inDir and outDir
            const t = this.getTileForIO(inDir, outDir);

            // If already occupied, maybe upgrade to Cross
            if (this.grid[curr.r][curr.c].type > 0) {
                this.grid[curr.r][curr.c] = { type: 4, rot: 0, locked: false, colorA: false, colorB: false, targetRot: 0 }; // Cross
            } else {
                this.grid[curr.r][curr.c] = { type: t.type, rot: t.rot, locked: false, colorA: false, colorB: false, targetRot: t.rot };
                // Sprinkling T-juncs naturally for difficulty
                if (allowT && rng.next() > 0.8) {
                    const upgrade = this.upgradeToT(t.type, t.rot, rng);
                    this.grid[curr.r][curr.c] = { type: 3, rot: upgrade.rot, locked: false, colorA: false, colorB: false, targetRot: upgrade.rot };
                }
            }
        }

        // Fix destination rotation based on how the path entered it
        let secondToLast = fullSequence[fullSequence.length - 2];
        let last = fullSequence[fullSequence.length - 1];
        let enterDir = -1; // 0=Up, 1=Right, 2=Down, 3=Left
        if (secondToLast.r < last.r) enterDir = 2; // Moving down
        else if (secondToLast.r > last.r) enterDir = 0; // Moving up
        else if (secondToLast.c < last.c) enterDir = 1; // Moving right
        else if (secondToLast.c > last.c) enterDir = 3; // Moving left

        // Dest (Type 6) base 'left' connects is [0,0,0,1].
        // To receive from enterDir, we shift rot. rot = (enterDir + 3) % 4 gives exact mapping.
        const destRot = (enterDir + 3) % 4;
        this.grid[dr][dc].rot = destRot;
        this.grid[dr][dc].targetRot = destRot;

        return true;
    },

    getTileForIO(inD, outD) {
        // Normalize
        let dirs = [inD, outD].sort();
        if (dirs[0] === 0 && dirs[1] === 2) return { type: 1, rot: 0 }; // Straight Vertical
        if (dirs[0] === 1 && dirs[1] === 3) return { type: 1, rot: 1 }; // Straight Horizontal

        // L-Bends
        // 0=Up, 1=Right, 2=Down, 3=Left
        if (dirs[0] === 0 && dirs[1] === 1) return { type: 2, rot: 0 }; // Top to Right
        if (dirs[0] === 1 && dirs[1] === 2) return { type: 2, rot: 1 }; // Right to Bottom
        if (dirs[0] === 2 && dirs[1] === 3) return { type: 2, rot: 2 }; // Bottom to Left
        if (dirs[0] === 0 && dirs[1] === 3) return { type: 2, rot: 3 }; // Top to Left

        return { type: 1, rot: 0 }; // Fallback
    },

    upgradeToT(type, rot, rng) {
        // T-Junc connect: [1,1,1,0], rotation modifies this
        // By randomly turning an L or Straight into a T, we don't break the path but add red-herrings.
        if (type === 1) {
            // Straight: 1,0,1,0. Needs to absorb 0 or 2. T-junc rot 0=Top/Right/Bot. rot 2=Top/Bot/Left.
            return rot === 0 ? { rot: rng.next() > 0.5 ? 0 : 2 } : { rot: rng.next() > 0.5 ? 1 : 3 };
        }
        if (type === 2) {
            // L-Bend. Top/Right (rot 0). T-junc rot 0 adds Bot. rot 3 adds Left.
            const ops = [[0, 3], [1, 0], [2, 1], [3, 2]]; // rot options for T to encompass L rot
            return { rot: ops[rot][rng.next() > 0.5 ? 0 : 1] };
        }
        return { rot: 0 };
    },

    getGlobalSeed(pack, level) {
        // E.g., combine pack + level into a fixed integer
        return 1337 * pack + level * 42;
    },

    /**
     * UI Switching
     */
    switchView(viewName) {
        [this.ui.viewPacks, this.ui.viewLevels, this.ui.viewGame].forEach(v => v.classList.remove('active'));
        if (viewName === 'packs') this.ui.viewPacks.classList.add('active');
        if (viewName === 'levels') this.ui.viewLevels.classList.add('active');
        if (viewName === 'game') this.ui.viewGame.classList.add('active');

        this.gameState = viewName;
    },

    renderPackList() {
        this.ui.packList.innerHTML = '';
        const packNames = ["Starter Board", "Logic Gates", "Quantum Flow", "Dual Core", "Secure Node"];

        for (let i = 1; i <= 5; i++) {
            const card = document.createElement('div');
            card.className = 'pl-pack-card';

            // SKILL.md pack grids: 4,5,6,5(dual),6(dual+lock)
            const packSizes = [4, 5, 6, 5, 6];
            const bSize = packSizes[i - 1] || 5;
            let desc = `${bSize}×${bSize} Grid`;
            if (i >= 4) desc += ' • Dual Source';
            if (i >= 5) desc += ' • Locked Tiles';

            // Progress tracking
            const cleared = parseInt(localStorage.getItem(this.STORAGE_PREFIX + `pack${i}_cleared`) || 0);
            const total = 25; // 25 levels per pack per SKILL.md
            const pct = Math.floor((cleared / total) * 100);

            card.innerHTML = `
                <div class="pl-pack-info">
                    <div class="pl-pack-name">Pack ${i}: ${packNames[i - 1] || 'Expansion'}</div>
                    <div class="pl-pack-desc">${desc}</div>
                </div>
                <div class="pl-pack-progress">${cleared}/${total}</div>
            `;

            card.addEventListener('click', () => {
                this.packId = i;
                this.renderLevelList();
                this.switchView('levels');
            });

            this.ui.packList.appendChild(card);
        }
    },

    renderLevelList() {
        this.ui.packTitle.textContent = `Pack ${this.packId}`;
        this.ui.levelGrid.innerHTML = '';

        const cleared = parseInt(localStorage.getItem(this.STORAGE_PREFIX + `pack${this.packId}_cleared`) || 0);

        for (let i = 1; i <= 20; i++) {
            const btn = document.createElement('div');
            btn.className = 'pl-level-btn';

            const isLocked = i > cleared + 1; // Play next level sequentially

            if (isLocked) {
                btn.classList.add('locked');
                btn.innerHTML = `<span style="font-size:1.5rem">🔒</span>`;
            } else {
                const stars = parseInt(localStorage.getItem(this.STORAGE_PREFIX + `p${this.packId}_l${i}_stars`) || 0);
                let starHtml = '';
                for (let s = 0; s < 3; s++) {
                    starHtml += s < stars ? '<span class="pl-star-filled">★</span>' : '<span class="pl-star-empty">★</span>';
                }

                btn.innerHTML = `
                    <div class="pl-level-num">${i}</div>
                    <div class="pl-level-stars">${starHtml}</div>
                `;
                btn.addEventListener('click', () => {
                    this.loadLevel(this.packId, i);
                });
            }
            this.ui.levelGrid.appendChild(btn);
        }
    },

    loadLevel(pack, level) {
        if (level > 25) {
            // Pack complete!
            this.renderPackList();
            this.switchView('packs');
            return;
        }
        this.switchView('game');
        this.generateBoard(pack, level);
        this.resizeCanvas();
    },

    resetLevel() {
        if (!this.initialGridState) return;
        this.grid = JSON.parse(this.initialGridState);
        this.moves = 0;
        this.gameState = 'playing';
        this.isAutoSolving = false;
        this.updateConnectionLogic();
        this.updateUI();
        this.drawBoard();
    },

    /**
     * Interaction
     */
    useHint() {
        if (this.gameState !== 'playing' || this.isAutoSolving) return;

        const doHint = () => {
            if (this.hintsUsed === 0) this.hintsUsed++;
            this.isAutoSolving = true;

            const solveNext = () => {
                if (this.gameState !== 'playing' || !this.isAutoSolving) return;

                // Find tiles that are not at their target rotation and are not locked
                let wrongTiles = [];
                for (let r = 0; r < this.size; r++) {
                    for (let c = 0; c < this.size; c++) {
                        if (!this.grid[r][c].locked && this.grid[r][c].rot !== this.grid[r][c].targetRot) {
                            wrongTiles.push({ r, c });
                        }
                    }
                }

                if (wrongTiles.length === 0) {
                    this.updateConnectionLogic();
                    return;
                }

                // Pick a random wrong tile
                const rando = wrongTiles[Math.floor(Math.random() * wrongTiles.length)];
                const cell = this.grid[rando.r][rando.c];

                // Animate the fix (flash gold first per SKILL.md)
                this.animations.push({
                    r: rando.r, c: rando.c,
                    type: 'rotate',
                    startRot: cell.rot,
                    endRot: cell.targetRot,
                    progress: 0,
                    duration: 250
                });

                cell.rot = cell.targetRot;
                cell.locked = true;

                if (SFX) SFX.play('hint');

                this.updateConnectionLogic();
                this.updateUI();

                if (this.gameState === 'playing') {
                    setTimeout(solveNext, 350);
                }
            };

            solveNext();
        };

        if (typeof HintManager !== 'undefined') {
            HintManager.requestHint(doHint);
        } else {
            doHint();
        }
    },

    rotateTile(r, c, dir) {
        if (this.isAutoSolving) return;
        const cell = this.grid[r][c];

        // Start rotation animation
        this.animations.push({
            r, c,
            type: 'rotate',
            startRot: cell.rot,
            endRot: (cell.rot + dir) % 4,
            progress: 0,
            duration: 150 // ms
        });

        // Actually apply rotation in logic immediately
        cell.rot = (cell.rot + dir) % 4;
        this.moves++;

        if (SFX) SFX.play('tap');

        // Check overall connectivity
        this.updateConnectionLogic();
        this.updateUI();
    },

    triggerShake(r, c) {
        this.animations.push({
            r, c,
            type: 'shake',
            progress: 0,
            duration: 300
        });
    },

    /**
     * Algorithm logic
     */
    getExits(cell) {
        // Base connects array rotated by cell.rot
        const def = this.TILE_DEFS[cell.type];
        if (!def) return [0, 0, 0, 0];

        const connects = [...def.connects];
        // Shift array right by 'rot'
        for (let i = 0; i < cell.rot; i++) {
            connects.unshift(connects.pop());
        }
        return connects;
    },

    updateConnectionLogic() {
        // Reset all colors
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                this.grid[r][c].colorA = false;
                this.grid[r][c].colorB = false;
            }
        }

        const flowA = this.traverseLine(this.sources[0]);
        let flowB = false;
        if (this.dualMode && this.sources.length > 1) {
            flowB = this.traverseLine(this.sources[1]);
        }

        // Dest check
        let winA = false;
        let winB = !this.dualMode; // True if not in dual mode

        // Has flow A reached Dest A?
        const dA = this.dests[0];
        if (this.grid[dA.r][dA.c].colorA) winA = true;

        if (this.dualMode) {
            const dB = this.dests[1];
            if (this.grid[dB.r][dB.c].colorB) winB = true;
        }

        if (winA && winB && this.gameState === 'playing') {
            this.handleLevelClear();
        }
    },

    traverseLine(source) {
        // DFS to find paths
        const type = source.t; // 'A' or 'B'
        const colorProp = type === 'A' ? 'colorA' : 'colorB';

        const stack = [{ r: source.r, c: source.c, fromDir: -1 }]; // fromDir = direction we entered this tile
        const visited = new Set();

        // Directions: 0=Up, 1=Right, 2=Down, 3=Left
        const dR = [-1, 0, 1, 0];
        const dC = [0, 1, 0, -1];
        const opposite = [2, 3, 0, 1];

        // Ensure source gets colored
        this.grid[source.r][source.c][colorProp] = true;

        while (stack.length > 0) {
            const curr = stack.pop();
            const key = `${curr.r},${curr.c}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const cell = this.grid[curr.r][curr.c];
            cell[colorProp] = true;

            const exits = this.getExits(cell);

            // Check cross isolation rule (for Dual mode).
            // A Cross tile connects 0<->2 and 1<->3 independent of each other.
            // If we are evaluating a Cross, we must only flood along the axis we entered from.
            let validExits = [0, 1, 2, 3];
            if (cell.type === 4 && curr.fromDir !== -1) {
                // We entered from fromDir. 
                // Exits available are only fromDir and opposite[fromDir]
                validExits = [curr.fromDir, opposite[curr.fromDir]];
            }

            for (let d = 0; d < 4; d++) {
                if (exits[d] === 1 && validExits.includes(d)) {
                    // There's a connection passing out this side
                    // Check neighbor
                    const nR = curr.r + dR[d];
                    const nC = curr.c + dC[d];

                    if (nR >= 0 && nR < this.size && nC >= 0 && nC < this.size) {
                        const nKey = `${nR},${nC}`;
                        if (!visited.has(nKey)) {
                            // Does neighbor have complementary input?
                            const nCell = this.grid[nR][nC];
                            const nExits = this.getExits(nCell);
                            const enterDir = opposite[d]; // If we go Up(0), we enter neighbor from Bottom(2)

                            if (nExits[enterDir] === 1) {
                                stack.push({ r: nR, c: nC, fromDir: enterDir });
                            }
                        }
                    }
                }
            }
        }
        return true;
    },

    updateUI() {
        this.ui.movesLbl.textContent = this.moves;
        this.ui.levelLbl.textContent = `${this.size}×${this.size} Level ${this.levelId}`;

        const dA = this.dests[0];
        if (this.grid[dA.r][dA.c].colorA) {
            this.ui.statusA.classList.add('active');
            this.ui.connLblA.textContent = 'LINKED';
        } else {
            this.ui.statusA.classList.remove('active');
            this.ui.connLblA.textContent = 'OFF';
        }

        if (this.dualMode) {
            this.ui.statusB.style.display = 'flex';
            const dB = this.dests[1];
            if (this.grid[dB.r][dB.c].colorB) {
                this.ui.statusB.classList.add('active');
                this.ui.connLblB.textContent = 'LINKED';
            } else {
                this.ui.statusB.classList.remove('active');
                this.ui.connLblB.textContent = 'OFF';
            }
        } else {
            this.ui.statusB.style.display = 'none';
        }
    },

    handleLevelClear() {
        this.gameState = 'clear';
        setTimeout(() => {
            if (SFX) SFX.play('clear');

            if (this.isAutoSolving) {
                document.getElementById('pl-hint-restart-modal').classList.add('open');
                return;
            }

            // Count optimal rotations
            let optimalRotations = 0;
            for (let r = 0; r < this.size; r++) {
                for (let c = 0; c < this.size; c++) {
                    const cell = this.grid[r][c];
                    if (!cell.locked && cell.type !== 0 && cell.type !== 4) {
                        optimalRotations++; // at least 1 rotation expected
                    }
                }
            }

            // Stars based on rotation efficiency
            let stars = 1;
            if (this.moves <= optimalRotations * 1.5) stars = 3;
            else if (this.moves <= optimalRotations * 2) stars = 2;

            // Scoring per SKILL.md: 400 base + rotation efficiency + ×1.2 no-hint + ×1.5 dual
            let score = 400;
            if (this.moves <= optimalRotations * 1.5) {
                score += optimalRotations * 30;
            } else {
                score += Math.max(0, (optimalRotations * 3 - this.moves) * 10);
            }
            if (this.hintsUsed === 0) score = Math.round(score * 1.2);
            if (this.dualMode) score = Math.round(score * 1.5);

            let hc = '';
            for (let i = 0; i < 3; i++) hc += i < stars ? '⭐' : '★';

            this.ui.resStars.textContent = hc;
            this.ui.resMsg.textContent = stars === 3 ? `Perfect Circuit! Score: ${score}` : `Circuit Complete! Score: ${score}`;
            this.ui.resTaps.textContent = this.moves;
            this.ui.resUtil.textContent = stars === 3 ? 'Optimal' : 'Sub-Optimal';
            this.ui.resUtil.style.color = stars === 3 ? 'var(--pv-emerald)' : 'var(--pv-amber)';

            // Save progress
            const maxCleared = parseInt(localStorage.getItem(this.STORAGE_PREFIX + `pack${this.packId}_cleared`) || 0);
            if (this.levelId > maxCleared) {
                localStorage.setItem(this.STORAGE_PREFIX + `pack${this.packId}_cleared`, this.levelId);
            }

            const curStars = parseInt(localStorage.getItem(this.STORAGE_PREFIX + `p${this.packId}_l${this.levelId}_stars`) || 0);
            if (stars > curStars) {
                localStorage.setItem(this.STORAGE_PREFIX + `p${this.packId}_l${this.levelId}_stars`, stars);
            }

            // Render mini cross-promo
            const promoContainer = document.getElementById('pl-mini-promo');
            if (promoContainer && typeof renderMiniCrossPromo === 'function') {
                renderMiniCrossPromo('pipelink', promoContainer);
            }

            document.getElementById('pl-result-modal').classList.add('open');

            // Ad refresh
            if (typeof AdController !== 'undefined') AdController.refreshBottomAd();

            // Show interstitial after 2s delay
            setTimeout(() => {
                if (typeof AdController !== 'undefined' && AdController.shouldShowInterstitial()) {
                    AdController.showInterstitial();
                }
            }, 2000);

            // Add Share Button logic if not already present
            let btnShare = document.getElementById('pl-btn-share-res');
            if (!btnShare) {
                btnShare = document.createElement('button');
                btnShare.id = 'pl-btn-share-res';
                btnShare.className = 'btn-primary';
                btnShare.style.background = 'var(--pv-violet)';
                btnShare.textContent = '📤 Share';
                const btnNext = document.getElementById('pl-btn-next');
                btnNext.parentNode.insertBefore(btnShare, btnNext);
            }

            btnShare.onclick = () => {
                this.shareResultSKILL(stars, this.moves, optimalRotations);
            };

        }, 500);
    },

    shareResultSKILL(stars, moves, optimalRot) {
        let starStr = '';
        for (let i = 0; i < 3; i++) starStr += i < stars ? '⭐' : '★';

        let text = `🔧 PipeLink Pack ${this.packId} Level ${this.levelId}\n`;
        text += `✅ Solved! ⚡→💡\n`;
        text += `Rotations: ${moves} (optimal: ${optimalRot})\n`;
        text += 'puzzlevault.pages.dev/pipelink';

        if (typeof shareResult === 'function') {
            shareResult(text);
        }
    },

    // Keep legacy share for backward compat
    shareResult(stars, moves, util) {
        const text = `🔧 PipeLink Pack ${this.packId} Level ${this.levelId}\n✅ Solved! ⚡→💡\nRotations: ${moves}\npuzzlevault.pages.dev/pipelink`;
        if (typeof shareResult === 'function') shareResult(text);
    },

    showStats() {
        // Build stats text
        let totalCleared = 0;
        let totalStars = 0;

        for (let p = 1; p <= 5; p++) {
            let clr = parseInt(localStorage.getItem(this.STORAGE_PREFIX + `pack${p}_cleared`) || 0);
            totalCleared += clr;
            for (let l = 1; l <= 25; l++) {
                totalStars += parseInt(localStorage.getItem(this.STORAGE_PREFIX + `p${p}_l${l}_stars`) || 0);
            }
        }

        const html = `
            <div style="margin-bottom:12px; font-size:1.1rem;">
                <span style="color:var(--pv-slate)">Levels Cleared:</span> <strong style="color:var(--pv-bg-light)">${totalCleared}/125</strong>
            </div>
            <div style="margin-bottom:12px; font-size:1.1rem;">
                <span style="color:var(--pv-slate)">Total Stars:</span> <strong style="color:#F59E0B">${totalStars}</strong>
            </div>
            <div style="margin-top: 24px; font-size: 0.85em; color:var(--pv-slate);">
                Keep connecting circuits to earn full 3-star utilization scores on every level!
            </div>
        `;
        document.getElementById('pl-stats-body').innerHTML = html;
        document.getElementById('pl-stats-modal').classList.add('open');
    },

    /**
     * Rendering Engine
     */
    renderLoop(timestamp) {
        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const dt = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        // Update animations
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const anim = this.animations[i];
            anim.progress += dt;
            if (anim.progress >= anim.duration) {
                this.animations.splice(i, 1);
            }
        }

        if (this.gameState !== 'packs' && this.gameState !== 'levels') {
            try {
                this.drawBoard(timestamp);
            } catch (e) {
                console.error("Render error:", e);
            }
        }

        requestAnimationFrame(this.renderLoop.bind(this));
    },

    drawBoard(timestamp = 0) {
        if (!this.ctx || !this.cellSize) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        // Clear
        ctx.fillStyle = this.colors.bg;
        ctx.fillRect(0, 0, w, h);

        const cs = this.cellSize;
        const mg = cs * 0.05; // 5% internal margin per cell
        const inner = cs - (mg * 2);

        if (inner <= 0) return; // Guard against RangeError for negative radius

        const lineThickness = inner * 0.15;
        const mid = cs / 2;

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const cell = this.grid[r][c];
                const x = c * cs;
                const y = r * cs;

                // Frame info logic for rendering
                let drawRot = cell.rot;
                let offsetX = 0;
                let offsetY = 0;

                // Check for active animations
                const activeAnim = this.animations.find(a => a.r === r && a.c === c);
                if (activeAnim) {
                    const norm = Math.min(1, activeAnim.progress / activeAnim.duration);

                    if (activeAnim.type === 'rotate') {
                        // Smooth easing func
                        const ease = 1 - Math.pow(1 - norm, 3);
                        // Start and end handles wrapping
                        let sT = activeAnim.startRot * 90;
                        let eT = activeAnim.endRot * 90;
                        // Handle 270 -> 0 wrap
                        if (activeAnim.startRot === 3 && activeAnim.endRot === 0) eT = 360;
                        if (activeAnim.startRot === 0 && activeAnim.endRot === 3) sT = 360; // Just in case

                        const curDeg = sT + (eT - sT) * ease;
                        // Overwrite standard rotation for drawing
                        drawRot = curDeg / 90;
                    } else if (activeAnim.type === 'shake') {
                        const phase = Math.sin(norm * Math.PI * 6); // 3 shakes
                        offsetX = phase * (cs * 0.05);
                    }
                }

                ctx.save();
                ctx.translate(x + mid + offsetX, y + mid + offsetY);

                // Draw Base Cell Box
                ctx.fillStyle = this.colors.grid;
                ctx.beginPath();
                ctx.roundRect(-mid + mg, -mid + mg, inner, inner, inner * 0.1);
                ctx.fill();

                // Draw Lock Icon
                if (cell.locked) {
                    ctx.fillStyle = this.colors.slate;
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.arc(-mid + mg + 8, -mid + mg + 8, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }

                // Empty cell handling
                if (cell.type === 0) {
                    ctx.restore();
                    continue;
                }

                // If animated rotation, rotate canvas matrix
                ctx.rotate(drawRot * Math.PI / 2);

                // Setup Colors based on Connectivity
                const def = this.TILE_DEFS[cell.type];

                // Drawing paths
                let strokeColor = this.colors.slate; // disconnected
                let pulsePulse = false;

                // Which axis is active?
                const isVerticalA = cell.colorA && (cell.type !== 4 || (cell.type === 4 && cell.colorA)); // logic simplified visually

                if (cell.colorA) {
                    strokeColor = this.colors.amber;
                    pulsePulse = true;
                } else if (cell.colorB) {
                    strokeColor = this.colors.cyan;
                    pulsePulse = true;
                }

                // --- Begin Drawing Path Vectors ---
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                const drawLine = (fromX, fromY, toX, toY, color) => {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = lineThickness;
                    ctx.beginPath();
                    ctx.moveTo(fromX, fromY);
                    ctx.lineTo(toX, toY);
                    ctx.stroke();

                    // Pulse FX
                    if (pulsePulse) {
                        ctx.save();
                        const glowCycle = (Math.sin(timestamp / 200) + 1) / 2; // 0 to 1
                        ctx.shadowBlur = 10 + (10 * glowCycle);
                        ctx.shadowColor = cell.colorA ? this.colors.amber : this.colors.cyan;
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = lineThickness * 0.4;
                        ctx.stroke();
                        ctx.restore();
                    }
                };

                const half = (inner / 2);
                const connects = def.connects; // Base connections [Top, Right, Bottom, Left] unrotated

                // Center Node
                ctx.fillStyle = strokeColor;
                ctx.beginPath();
                ctx.arc(0, 0, lineThickness * 0.8, 0, Math.PI * 2);
                ctx.fill();
                if (pulsePulse) {
                    ctx.fillStyle = '#FFF';
                    ctx.beginPath();
                    ctx.arc(0, 0, lineThickness * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Legs
                // Top
                if (connects[0]) drawLine(0, 0, 0, -half, strokeColor);
                // Right
                if (connects[1]) drawLine(0, 0, half, 0, strokeColor);
                // Bottom
                if (connects[2]) drawLine(0, 0, 0, half, strokeColor);
                // Left
                if (connects[3]) drawLine(0, 0, -half, 0, strokeColor);


                // UI Decorators for Source/Dest (rendered on top, inverted matrix rotation to keep upright)
                if (cell.type >= 5) {
                    ctx.rotate(-drawRot * Math.PI / 2); // un-rotate texto
                    ctx.font = 'bold ' + (inner * 0.4) + 'px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    let t = cell.type === 5 ? '⚡' : '🔋';
                    // Apply shadow for visibility
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = '#000';
                    ctx.fillText(t, 0, 0);
                }

                ctx.restore();
            }
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    PipeLink.init();
});
