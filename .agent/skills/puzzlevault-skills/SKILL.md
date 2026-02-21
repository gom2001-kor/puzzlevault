# PuzzleVault — Game Specifications (skills.md)

> This file contains the complete design specification for each of the 10 PuzzleVault games.
> Antigravity should reference this file when building any game.
> Each game section includes: rules, unique mechanics, visual specs, scoring, modes, and share format.

---

## Shared Systems

### Daily Seed (seed.js)
```javascript
function getDailySeed(gameId) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const combined = gameId + ':' + dateStr;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

class SeededRandom {
  constructor(seed) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  next() {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
```

### Sound Effects (sfx.js)
```javascript
const SFX = {
  ctx: null,
  enabled: true,
  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.enabled = localStorage.getItem('pv_sound') !== 'off';
  },
  play(type) {
    if (!this.enabled) return;
    if (!this.ctx) this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    const sounds = {
      tap:      { freq: 600,  dur: 0.08, wave: 'sine' },
      correct:  { freq: 880,  dur: 0.15, wave: 'sine' },
      wrong:    { freq: 200,  dur: 0.3,  wave: 'square' },
      clear:    { freq: 1200, dur: 0.2,  wave: 'sine' },
      combo:    { freq: 1600, dur: 0.3,  wave: 'triangle' },
      gameover: { freq: 150,  dur: 0.5,  wave: 'sawtooth' },
      win:      { freq: 1000, dur: 0.4,  wave: 'sine' },
    };
    const s = sounds[type] || sounds.tap;
    osc.type = s.wave;
    osc.frequency.value = s.freq;
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + s.dur);
    osc.start();
    osc.stop(this.ctx.currentTime + s.dur);
  },
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('pv_sound', this.enabled ? 'on' : 'off');
  }
};
```

### Ad Controller (adsense.js)
```javascript
const AdController = {
  gamesPlayed: parseInt(sessionStorage.getItem('pv_games_played') || '0'),
  FIRST_AD_AFTER: 3,
  AD_FREQUENCY: 3,
  shouldShowInterstitial() {
    this.gamesPlayed++;
    sessionStorage.setItem('pv_games_played', this.gamesPlayed);
    if (this.gamesPlayed <= this.FIRST_AD_AFTER) return false;
    return (this.gamesPlayed - this.FIRST_AD_AFTER) % this.AD_FREQUENCY === 0;
  },
  showInterstitial() {
    if (!this.shouldShowInterstitial()) return;
    const el = document.getElementById('ad-interstitial');
    if (el) el.style.display = 'flex';
  },
  hideInterstitial() {
    const el = document.getElementById('ad-interstitial');
    if (el) el.style.display = 'none';
  }
};
```

### Share (share.js)
```javascript
function shareResult(text) {
  if (navigator.share) {
    navigator.share({ text }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  });
}
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'pv-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
}
```

---

## Game 1: 🔢 NumVault — Number Deduction Puzzle

### Rules
- Player guesses a hidden N-digit code within limited attempts.
- Each guess receives per-digit feedback:
  - 🟢 (--pv-emerald): correct digit, correct position
  - 🟡 (--pv-amber): correct digit, wrong position
  - ⚫ (--pv-slate): digit not in code
- Feedback priority: assign 🟢 first, then 🟡 for remaining matches (no double-counting).
- Example: Code 1234, Guess 1335 → 🟢⚫🟢⚫ (pos 3's digit 3 matches code exactly → 🟢; pos 2's digit 3 has no remaining 3 in code since it was already matched at pos 3 → ⚫).

### Difficulty Levels
| Level | Digits | Attempts | Duplicates |
|-------|--------|----------|------------|
| Easy | 4 | 8 | No |
| Normal | 4 | 6 | Yes |
| Hard | 5 | 8 | Yes |
| Expert | 6 | 10 | Yes |

### UNIQUE Mechanic: Number Tracker
- Display 0-9 tracker below the grid showing each digit's known state.
- States: ⬜ unused → 🟡 included → 🟢 confirmed → ⚫ excluded.
- Priority: 🟢 > 🟡 > ⚫ > ⬜ (once confirmed 🟢, never downgrade).
- This is NOT in Wordle. It's a NumVault-exclusive feature.

### UNIQUE Mechanic: Speed Mode
- 60-second timer. Solve as many codes as possible.
- Correct answer → +15 seconds bonus.
- Score = codes solved × difficulty multiplier.

### Input
- On-screen numpad (0-9) + Backspace + Enter + Hint button.
- Also accepts physical keyboard number keys.

### Scoring (Free Play & Speed Mode)
```
base = (maxAttempts - usedAttempts + 1) × 100 × difficultyMultiplier
timeBonus = max(0, 300 - seconds) × 2
hintPenalty = -50 per hint
Multipliers: Easy=1.0, Normal=1.5, Hard=2.0, Expert=3.0
```

### Hint (Reward Ad)
- Reveals one unconfirmed digit's correct position.
- Daily: max 1 hint. Free Play: max 2 hints.
- Hint used → 💡 shown in share text.

### Modes
1. **Daily Challenge**: 1 puzzle/day (UTC midnight), seed-based, streak tracking.
2. **Free Play**: unlimited, difficulty selectable, ads every 3 games.
3. **Speed Mode**: 60s timer, continuous puzzles.

### Share Format
```
🔢 NumVault Daily #247 🔓
Difficulty: Normal (4-digit)

🟢⚫🟡⚫
🟢🟡⚫🟡
🟢🟢🟢🟢

3/6 ⏱ 1:23 🔥12
puzzlevault.pages.dev/games/numvault
```

### Result Screen
- 🔓 Vault Cracked! (win) or 🔒 Vault Sealed (lose)
- Show: code, attempts, time, difficulty
- Distribution bar chart (personal history from localStorage)
- Streak display
- [📤 Share] [🔄 Play Again]

---

## Game 2: 🧱 GridSmash — Block Placement Puzzle

### Rules
- 10×10 grid. Each turn: 3 block pieces given.
- Drag pieces onto grid. All 3 must be placed before new 3 appear.
- Complete row or column → line clears (disappears).
- Multiple simultaneous clears = combo.
- No space for any remaining piece → game over.

### Block Pieces (20 types, 1-5 cells)
- 1-cell: dot (1 type)
- 2-cell: horizontal, vertical (2 types)
- 3-cell: horizontal, vertical, L-shapes ×4 rotations (6 types)
- 4-cell: 2×2 square, T-shapes ×4 rotations, S-shape, Z-shape (7 types)
- 5-cell: horizontal, vertical, plus(+), U-shape (4 types)
- Visual: rounded corners (4px radius), pastel PV colors, inner shadow.
- Colors per turn: 3 pieces get 3 different colors from --pv-p-* palette.

### UNIQUE Mechanic: Special Blocks (3 types)
Appear from turn 16 onward, 20% chance per turn (1 of 3 pieces may be special).

**💎 Crystal Block**
- Visual: translucent blue + diamond sparkle animation.
- Effect: on placement, destroys all existing blocks in 3×3 area around it.
- Scoring: destroyed cells × 10 (no line clear bonus).

**🧊 Frost Block**
- Visual: white border + frost pattern.
- Effect: on placement, freezes 2 random empty cells on the grid.
- Frozen cells: treated as occupied, require 2 line clears to remove.
- Strategy: immediate benefit + future obstacle (risk-reward tradeoff).

**⭐ Wild Block**
- Visual: gold 1×1 cell + star icon.
- Effect: place on any single empty cell (can be placed before other pieces).
- Strategy: fill the last gap to complete a line.

### UNIQUE Mechanic: Shatter Zone
- Every 10 turns: bottom 2 rows become "Shatter Zone" (gold highlight, pulse animation).
- Line clears in Zone → score ×3.
- Zone lasts 5 turns. If not cleared, Zone expires and 50% of empty cells in those rows fill with random blocks.
- Display: "Zone: X turns left" counter.

### Scoring
```
Placement: cells placed × 1
Line clear: 100 × lines cleared
Shatter Zone: line clear score × 3
Combo (simultaneous): 1 line=100, 2=300, 3=600, 4=1200, 5+=2500
Streak combo (consecutive turns with clears): 2=×1.5, 3=×2.0, 4+=×3.0
Crystal: destroyed cells × 10
```

### Interaction
- Drag: touch/click piece → drag over grid → semi-transparent preview.
- Valid position: preview in piece color. Invalid: preview in red.
- Release: place if valid, return to dock if invalid.
- Wild block: separate "Wild" slot, placeable before other pieces.
- Line clear animation: white flash (0.15s) → scale-to-zero (0.3s) → text popup → score countup.

### Modes
1. **Classic**: play until game over, track high score.
2. **Daily Challenge**: seed-based same block sequence, 3-minute limit.
3. **Zen Mode**: no timer, no score, no Shatter Zone, no ads (retention tool).
4. **Sprint 40**: clear 40 lines, track fastest time.

### Reward Ad: Undo
- On game over: "Watch ad to undo last move?" → reverses last placement.
- 1 use per game. Share text shows 🔄 if used.

### Share Format
```
🧱 GridSmash
Score: 12,847
Lines: 47 | Combo: x4 | Shatter: x5
🏆 Top 8%
puzzlevault.pages.dev/games/gridsmash
```

### Percentile Table (hardcoded estimates)
Top 1%: 30000+, Top 5%: 20000+, Top 10%: 15000+, Top 25%: 8000+, Top 50%: 4000+

---

## Game 3: 🧠 PatternPop — Pattern Memory

### Rules
- Grid shows N highlighted cells briefly → player taps from memory.
- All correct → next round (N+1 cells).
- Wrong tap → lose 1 life (3 total). 0 lives → game over.

### Difficulty Curve
| Rounds | Grid | Cells | Display Time | Decoys |
|--------|------|-------|-------------|--------|
| 1-3 | 3×3 | 2-4 | 2.0s | 0 |
| 4-6 | 3×3 | 4-5 | 2.0s | 0 |
| 7-9 | 4×4 | 4-6 | 1.5s | 0 |
| 10-14 | 4×4 | 6-8 | 1.2s | 1 |
| 15-19 | 5×5 | 7-10 | 1.0s | 2 |
| 20-29 | 5×5 | 10+ | 0.8s | 3 |
| 30+ | 6×6 | 12+ | 0.8s | 3 |

### UNIQUE Mechanic: Decoy Flash
- From round 10: during memorization phase, extra cells flash briefly (0.3s) alongside real targets (1.2s+).
- Decoy color: --pv-blue lighter variant (#60A5FA) vs real: --pv-blue (#2563EB).
- Decoy duration: 0.3s (real cells show for full display time).
- Player must distinguish real from fake based on duration and color intensity.
- Bonus: +30 points per decoy correctly ignored.

### Colors
- Grid background: --pv-grid-bg (#E2E8F0)
- Target highlight: --pv-blue (#2563EB)
- Decoy flash: #60A5FA (lighter blue)
- Correct tap: --pv-emerald (#059669)
- Wrong tap: --pv-coral (#F43F5E)

### Scoring
```
roundScore = cellsMemorized × 50 × (1 + roundNumber / 10)
perfectBonus = +100 (no lives lost this round)
decoyBonus = +30 per decoy dodged
```

### Reward Ad: Extra Life
- When all lives lost: "Watch ad for +1 life?" → restart current round.
- 1 use per game.

---

## Game 4: 📚 SortStack — Color Sorting

### Rules
- Stacks (rectangular drawers), each holds max 4 square blocks.
- 2 empty stacks provided as workspace.
- Only top block can move. Can only place on same-color top or empty stack.
- Stack of 4 same-color blocks → locked (🔒) + sparkle animation.
- All colors sorted → level clear.

### UNIQUE Mechanic: Lock Stack
- When a stack completes (4 same color), it locks AND 1 new empty stack appears.
- Progressive expansion gives more workspace as you solve.

### UNIQUE Mechanic: Move Limit
- Hard/Expert: maximum N moves allowed (shown as counter).
- Forces optimal solution finding.

### Difficulty
| Level | Colors | Stacks | Empty | Move Limit |
|-------|--------|--------|-------|-----------|
| Easy | 4 | 4+2 | 2 | ∞ |
| Medium | 6 | 6+2 | 2 | ∞ |
| Hard | 8 | 8+2 | 2 | 40 |
| Expert | 10 | 10+2 | 2 | 50 |

### Visual Style
- NOT test tubes + round balls (that's the common Ball Sort look).
- USE rectangular "drawers" + square blocks with rounded corners.
- Block colors: PV primary palette (--pv-coral through --pv-slate).
- Undo button: unlimited undos (free, no ad required).

---

## Game 5: ⚡ QuickCalc — Speed Math Arcade

### Rules
- 30-second starting timer. Multiple-choice (4 options).
- Correct → +2s + points. Wrong → -3s + screen shake.
- Timer reaches 0 → game over.

### Difficulty Auto-Scaling
| Questions | Type | Example |
|-----------|------|---------|
| 1-5 | Single + single | 3+5=? |
| 6-10 | Double + single | 17+6=? |
| 11-14 | Double ± double | 34-18=? |
| 15-19 | Operator Roulette | 7 ? 3 = 21 |
| 20-24 | Double × single | 13×4=? |
| 25-29 | Mixed operations | 23+17×2=? |
| 30+ | Triple-digit + Roulette | Complex |

### UNIQUE Mechanic: Operator Roulette
- From question 15: format changes to "A ? B = C".
- 4 choices: +, -, ×, ÷. Player picks the correct operator.
- Reverse thinking challenge unique to QuickCalc.

### Wrong Answer Generation
- 1 near answer (correct ± 1~3)
- 1 medium answer (correct ± 5~15)
- 1 far answer (random)
- Shuffled positions each time.

### Combo
- 3 streak → +3s per correct. 5 streak → +4s. 10 streak → +5s.
- Wrong answer resets streak.

---

## Game 6: 🔄 TileTurn — Tile Flip Puzzle

### Rules (Classic)
- N×N grid, tiles are ON (--pv-cream #FDE68A with glow) or OFF (--pv-grid-dark #1E293B).
- Tap a tile → it + adjacent 4 (up/down/left/right) toggle.
- Goal: all tiles ON.

### UNIQUE Mechanic: Cascade Mode
- Tap effect propagates 2 levels deep:
  - Level 1: tapped cell + 4 adjacent (5 cells)
  - Level 2: each Level 1 cell's 4 adjacent also toggle (up to 13 cells total)
- Requires deeper strategic thinking.

### UNIQUE Mechanic: Spectrum Mode
- 3-color cycle instead of ON/OFF: coral(#F43F5E) → amber(#D97706) → blue(#2563EB) → coral...
- Tap: target + adjacent advance to next color.
- Goal: all tiles same color.

### Puzzle Generation
- Reverse method: start from solved state (all ON), apply K random taps → guaranteed solvable.
- K determines difficulty.

### Level Packs
| Pack | Mode | Grid | Levels | Min Taps |
|------|------|------|--------|---------|
| 1 | Classic | 3×3 | 20 | 1-5 |
| 2 | Classic | 4×4 | 30 | 3-8 |
| 3 | Classic | 5×5 | 40 | 5-12 |
| 4 | Cascade | 4×4 | 30 | 3-8 |
| 5 | Cascade | 5×5 | 40 | 5-10 |
| 6 | Spectrum | 4×4 | 30 | 4-10 |
| 7 | Spectrum | 5×5 | 40 | 6-14 |

### Stars
- ⭐⭐⭐: minimum taps. ⭐⭐: minimum +1~2. ⭐: more.
- Visual: tap ripple animation spreading to affected tiles.

---

## Game 7: 🎨 ColorFlow — Color Path Connection

### Rules
- N×N grid with pairs of same-color diamond markers (◆, NOT circles).
- Connect each pair with a horizontal/vertical path.
- Paths cannot overlap.
- All empty cells filled = ⭐⭐⭐ Perfect.

### UNIQUE Visual Style (NOT Flow Free)
- Background: light (--pv-bg-light), NOT black.
- Markers: diamond shape (◆), NOT circles (●).
- Paths: gradient-filled cells (75% cell size), NOT thick solid lines.
- On connection complete: light particle animation flowing along path.

### UNIQUE Mechanic: Flow Bonus
- If path length ≤ 1.5× shortest possible distance → efficiency bonus.
- Real-time "Coverage: X%" display during play.

### Colors (PV palette, NOT Flow Free colors)
- 5×5: coral, blue, emerald, amber, violet
- 7×7: +pink, orange
- 9×9: +cyan, lime
- 10+: +indigo(#6366F1), teal(#14B8A6)

### Puzzle Data
- Initial: hardcoded JSON puzzles per grid size.
- 5×5: 50, 6×6: 50, 7×7: 50, 8×8: 40, 9×9: 30, 10×10: 20, 12×12: 10, 14×14: 5
- Daily: seed selects from puzzle set.

### Level Packs
Pack 1-8: Starter(5×5) through Insane(14×14), 30 levels each.
Ad: interstitial every 10 levels.

### Stars
⭐: all pairs connected, coverage < 80%. ⭐⭐: all pairs connected, coverage ≥ 80%. ⭐⭐⭐: Perfect (100% coverage, all cells filled).

---

## Game 8: 🔧 PipeLink — Circuit Connection Puzzle

### Theme: Circuit Board (NOT industrial pipes)
- Background: dark board (--pv-bg-dark).
- Tiles: dark gray cells (--pv-grid-dark).
- Connected path: amber energy line (--pv-amber) + pulse animation.
- Unconnected: gray lines (--pv-slate).
- Source: ⚡ (amber). Destination: 🔋 (emerald).
- On full connection: energy pulse travels source → destination.

### Rules
- N×N grid (4×4 to 10×10) with pre-placed tile pieces.
- Tap tile → rotate 90° clockwise (0.2s animation).
- Double-tap → 180° rotation.
- Connect source(⚡) to destination(🔋) = clear.
- All tiles used in path = Perfect.

### Tile Types
Straight(━┃), L-bend(┗┛┓┏), T-junction(┣┫┳┻), Cross(╋).

### UNIQUE Mechanic: Dual Source
- From Pack 4+: 2 sources (⚡A amber, ⚡B cyan) + 2 destinations (🔋A, 🔋B).
- Both A→A and B→B must connect. Paths can share cross(╋) tiles.

### UNIQUE Mechanic: Locked Tiles
- From Pack 5+: some tiles marked 🔒 → cannot rotate.
- Must solve around fixed constraints.

---

## Game 9: 🔮 MergeChain — Number Merge (Drop Physics)

### Rules
- Vertical rectangular field (300×500 ratio).
- Drop numbered balls from top. Same number balls touching → merge to next number.
- Chain: 2+2=4, if that 4 touches another 4 → chain merge to 8.
- Ball exceeds top line → game over.
- Next ball preview: randomly 2, 4, or 8.

### Ball Sizes & Colors (PV gradient, NOT fruit)
| Number | Radius | Color Gradient |
|--------|--------|---------------|
| 2 | 20px | #FCA5A5 → #FECDD3 |
| 4 | 25px | #FDE68A → #FEF3C7 |
| 8 | 30px | #86EFAC → #BBF7D0 |
| 16 | 36px | #93C5FD → #BFDBFE |
| 32 | 42px | #C4B5FD → #DDD6FE |
| 64 | 48px | #FBCFE8 → #FCE7F3 |
| 128 | 55px | #FDE68A → #FEF9C3 |
| 256 | 62px | #A7F3D0 → #D1FAE5 |
| 512 | 70px | #BFDBFE → #DBEAFE |
| 1024 | 78px | #DDD6FE → #EDE9FE |
| 2048 | 88px | #FFD700 → #FFF8DC |

### Physics (simplified)
- Gravity: vy += 0.5/frame. Bounce: velocity × -0.3 on walls/floor. Friction: vx × 0.99.
- Circle collision: distance < sum of radii.
- NEVER use fruit images. Numbers displayed on balls.

### Scoring
Merge score = resulting number value. Chain bonus: × chain count.

### Modes
1. Classic: until game over. 2. Daily: seed-based same sequence. 3. Time Attack: 2 minutes.

---

## Game 10: ⬡ HexMatch — Hexagonal Color Match

### Rules
- Hexagonal grid (diameter 7, ~37 cells), 6 colors.
- Drag to connect 3+ adjacent same-color tiles → remove them.
- Tiles above fall down to fill gaps.
- Tiles reach top → game over.

### UNIQUE Mechanic: Hex Bomb
- Connect 5+ tiles → center cell becomes 💣 Hex Bomb.
- Tap bomb next turn → destroys all tiles within 2-ring radius (up to 12 surrounding cells).
- Bomb scoring: destroyed cells × 20.

### UNIQUE Mechanic: Rising Tide
- Every 8 turns: 1 new row pushes up from bottom.
- Creates time pressure without a literal timer.
- Different from other puzzle games' pressure mechanics.

### Scoring
3 tiles=30, 4=60, 5=120+bomb, 6=300, 7+=600.
Bomb explosion: cells × 20.

### Special Tile
⭐ Rainbow: appears every 8 turns randomly. Matches any color.

### Hex Adjacency
Each hex has up to 6 neighbors (↖↗→↘↙←). Use offset or cube coordinates for implementation.

### Colors
PV palette: coral, blue, emerald, amber, violet, cyan.