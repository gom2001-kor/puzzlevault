import fs from 'fs';

const size = 5;
const pairs = [
    [4, 1, 4, 0, 1], // Start: (4,1), End: (4,0), Color: 1 (coral)
    [0, 4, 0, 1, 2], // Start: (0,4), End: (0,1), Color: 2 (blue)
    [3, 4, 2, 2, 3], // Start: (3,4), End: (2,2), Color: 3 (emerald)
    [2, 4, 1, 4, 4]  // Start: (2,4), End: (1,4), Color: 4 (amber)
];

const board = Array(size * size).fill(0);
const endpoints = Array(size * size).fill(0);

pairs.forEach(p => {
    const c = p[4];
    endpoints[p[0] * size + p[1]] = c;
    endpoints[p[2] * size + p[3]] = c;
    board[p[0] * size + p[1]] = c;
    board[p[2] * size + p[3]] = c;
});

let foundSolution = null;

function solve(colorIdx, r, c) {
    if (foundSolution) return;

    if (colorIdx > 4) {
        // All colors connected. Check coverage.
        let emptyCount = 0;
        for (let i = 0; i < size * size; i++) {
            if (board[i] === 0) emptyCount++;
        }
        if (emptyCount === 0) {
            foundSolution = JSON.parse(JSON.stringify(board));
        }
        return;
    }

    const pair = pairs[colorIdx - 1];
    const targetR = pair[2];
    const targetC = pair[3];

    if (r === targetR && c === targetC) {
        // Connected! Start next color
        if (colorIdx < 4) {
            const nextPair = pairs[colorIdx];
            solve(colorIdx + 1, nextPair[0], nextPair[1]);
        } else {
            solve(colorIdx + 1, -1, -1);
        }
        return;
    }

    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            const idx = nr * size + nc;

            // Can step if empty OR if it's our exact target endpoint
            if (board[idx] === 0 || (nr === targetR && nc === targetC)) {

                const prev = board[idx];
                board[idx] = pair[4];

                solve(colorIdx, nr, nc);

                board[idx] = prev;
            }
        }
    }
}

console.log("Solving...");
solve(1, pairs[0][0], pairs[0][1]);

if (foundSolution) {
    console.log("Solution found!");
    const sol = foundSolution;
    const HINT_COLOR_MAP = {
        1: '#F43F5E',
        2: '#2563EB',
        3: '#059669',
        4: '#D97706',
    };

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Solution</title>
        <style>
            body { font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#f8fafc; margin: 0; }
            .grid { display:grid; grid-template-columns:repeat(5, 60px); grid-template-rows:repeat(5, 60px); gap:2px; background:#e2e8f0; border:4px solid #F59E0B; padding:4px; border-radius:12px; }
            .cell { width:60px; height:60px; display:flex; justify-content:center; align-items:center; color:white; font-size: 24px; }
        </style>
    </head>
    <body>
        <div style="text-align:center;">
            <h2 style="color:#1E293B">Pack 1 - Level 17 (100% Coverage)</h2>
            <div class="grid">
    `;

    for (let i = 0; i < size * size; i++) {
        const col = sol[i];
        const bg = col > 0 ? HINT_COLOR_MAP[col] : '#fff';
        const isEnd = endpoints[i] > 0;
        let content = '';
        if (isEnd) content = '♦';
        html += '<div class="cell" style="background:' + bg + '; border-radius:' + (isEnd ? '12px' : '0') + ';">' + content + '</div>';
    }

    html += `
            </div>
        </div>
    </body>
    </html>`;

    fs.writeFileSync('solution.html', html);
} else {
    console.log("No solution found.");
}
