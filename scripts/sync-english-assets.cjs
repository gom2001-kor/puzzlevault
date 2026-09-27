/* Run after building apps/english. Keep the top-level worker in sync with hashed assets. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'learn', 'english');
if (!fs.existsSync(path.join(output, 'index.html'))) throw new Error('Build apps/english before syncing assets.');
function files(folder) {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(folder, entry.name);
        return entry.isDirectory() ? files(file) : [file];
    });
}
const assets = ['/learn/english/', ...files(output).map(file => '/' + path.relative(root, file).split(path.sep).join('/')).sort(), '/css/learning.css'];
const workerPath = path.join(root, 'sw.js');
const worker = fs.readFileSync(workerPath, 'utf8');
const block = '// ENGLISH_ASSETS_START\nASSETS.push(' + JSON.stringify(assets, null, 4).slice(1, -1) + ');\n// ENGLISH_ASSETS_END';
const next = worker.includes('// ENGLISH_ASSETS_START')
    ? worker.replace(/\/\/ ENGLISH_ASSETS_START[\s\S]*?\/\/ ENGLISH_ASSETS_END/, block)
    : worker.replace('// Keep the same privacy', block + '\n\n// Keep the same privacy');
if (worker === next && !worker.includes('// ENGLISH_ASSETS_START')) throw new Error('Worker asset insertion point missing.');
fs.writeFileSync(workerPath, next);
console.log(`Synced ${assets.length} English learning resources into the PuzzleVault service worker.`);
