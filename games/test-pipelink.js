class SeededRandom {
    constructor(seed) {
        this.m = 0x80000000; // 2**31
        this.a = 1103515245;
        this.c = 12345;
        this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
    }

    next() {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state / (this.m - 1);
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    shuffle(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(this.next() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }
}

function getGlobalSeed(pack, level) {
    return 1337 * pack + level * 42;
}

function testLevel(pack, level) {
    let baseSize = 3 + pack;
    if (baseSize > 10) baseSize = 10;
    const size = baseSize;
    const dualMode = (pack >= 4);

    const rng = new SeededRandom(getGlobalSeed(pack, level));

    // Place Source A and Dest A randomly on opposite sides
    let r1 = rng.nextInt(0, size - 1);
    let c1 = 0; // Left edge
    let r2 = rng.nextInt(0, size - 1);
    let c2 = size - 1; // Right edge

    let sA = { r: r1, c: c1, t: 'A' };
    let dA = { r: r2, c: c2, t: 'A' };

    let successA = carvePath(size, sA.r, sA.c, dA.r, dA.c, rng, 'A');
    if (!successA) return false;

    if (dualMode) {
        let sB = { r: 0, c: rng.nextInt(1, size - 2), t: 'B' }; // Top edge
        let dB = { r: size - 1, c: rng.nextInt(1, size - 2), t: 'B' }; // Bottom edge
        let successB = carvePath(size, sB.r, sB.c, dB.r, dB.c, rng, 'B', successA.visitedPaths);
        if (!successB) return false;
    }

    return true;
}

function carvePath(size, sr, sc, dr, dc, rng, pathType, existingGrid = null) {
    let path = [];
    let visited = Array(size).fill().map(() => Array(size).fill(false));
    visited[sr][sc] = true;

    // existingGrid tracking for Dual Mode (just true/false to simulate obstacles)
    let obstacles = Array(size).fill().map(() => Array(size).fill(false));
    if (existingGrid) {
        obstacles = existingGrid;
    }

    const startDir = (pathType === 'A') ? 1 : 2;
    const dR = [-1, 0, 1, 0];
    const dC = [0, 1, 0, -1];

    let initialPathR = sr + dR[startDir];
    let initialPathC = sc + dC[startDir];

    if (initialPathR < 0 || initialPathR >= size || initialPathC < 0 || initialPathC >= size) return false;

    // Simulate DFS
    const dfs = (r, c, forcedDir = -1) => {
        if (r === dr && c === dc) {
            return true;
        }
        if (visited[r][c]) return false;

        // Cannot cleanly cross existing non-straight paths, but for simplicity we treat obstacles as hard walls in this basic test 
        // to see if ANY path was found without crossing logic perfectly modeled.
        // Actually, let's allow crossing logic for the sake of realism.
        let isCross = false;
        if (obstacles[r][c]) {
            isCross = true;
        }

        visited[r][c] = true;
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

            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                // Endpoints
                if ((nr === sr && nc === sc) || (nr === dr && nc === dc)) {
                    if (nr !== dr || nc !== dc) continue;
                }

                let nextForcedDir = -1;
                if (obstacles[nr][nc] && (nr !== dr || nc !== dc)) {
                    // Simulate crossing
                    // This isn't perfect but mirrors the JS code. Wait, the JS code relies on tile types.
                    // If we just check if dfs returns true, we can know if a path was geometrically found.
                    nextForcedDir = d;
                }

                if (dfs(nr, nc, nextForcedDir)) return true;
            }
        }

        path.pop();
        visited[r][c] = false;
        return false;
    };

    let reachedTarget = dfs(initialPathR, initialPathC);

    // Mark the successful path into a combined grid returning it
    if (reachedTarget) {
        for (let p of path) {
            obstacles[p.r][p.c] = true;
        }
        return { success: true, visitedPaths: obstacles };
    }

    return false;
}

// Run test
let totalFailed = 0;
let errors = [];

for (let pack = 1; pack <= 5; pack++) {
    for (let level = 1; level <= 20; level++) {
        const pass = testLevel(pack, level);
        if (!pass) {
            totalFailed++;
            errors.push(`Pack ${pack} Level ${level}`);
        }
    }
}

console.log(`Total unsolvable levels: ${totalFailed}`);
if (totalFailed > 0) {
    console.log(`Failed levels: ${errors.join(', ')}`);
}
