# PuzzleVault — Game Specifications (skills.md)

> This file contains the complete design specification for each of the 10 PuzzleVault games.
> Antigravity should reference this file when building any game.
> Each game section includes: rules, unique mechanics, visual specs, scoring, modes, hint system, and share format.

---

## Game 1: 🔢 NumVault — Number Deduction

### Rules
- Secret code: N digits (0-9). Player guesses the code.
- After each guess, feedback per digit:
  - 🟢 Green: correct digit, correct position
  - 🟡 Yellow: digit exists in code, wrong position
  - ⚫ Gray: digit not in code
- Feedback algorithm: process greens first (exact matches consume that code digit), then yellows (remaining digits only).
- Example: Code 1234, Guess 1335 → 🟢⚫🟢⚫ (pos1: 1=1 🟢, pos2: 3 not in remaining [2,4] ⚫, pos3: 3=3 🟢, pos4: 5 not in code ⚫)

### Difficulty Levels
| Level | Digits | Max Attempts | Duplicates |
|-------|--------|-------------|------------|
| Easy | 3 | 8 | No |
| Medium | 4 | 6 | No |
| Hard | 4 | 6 | Yes |
| Expert | 5 | 8 | Yes |

### UNIQUE Mechanic: Number Tracker
- Below the guess grid: display digits 0-9
- Each digit color-coded: unused (gray), confirmed-in-code (green), confirmed-position (bright green), excluded (dark/strikethrough)
- Auto-updates after each guess
- Helps player track elimination logic

### UNIQUE Mechanic: Speed Mode
- Optional toggle: 60-second timer
- Fewer guesses = bonus multiplier
- Daily leaderboard for speed

### Hint System
- 💡 Hint reveals ONE digit's correct position (e.g., "Position 3 is the digit 7")
- First hint per session: FREE
- Subsequent hints: reward ad required
- Hint does NOT consume a guess attempt

### UI Layout
- Top: "🔢 NumVault" + Daily #N + ⚙️📊❓ icons
- Guess grid: N columns × max_attempts rows
- Number Tracker: 0-9 below grid
- Numpad: 0-9 + Backspace + Enter + 💡 Hint
- Physical keyboard support: 0-9, Backspace, Enter

### Input
- Numpad buttons (touch) + physical keyboard (desktop)
- Tap digit → fills next empty cell in current row
- Backspace → removes last entered digit
- Enter → submits guess (only if all digits filled)

### Scoring
- Base: 1000 × (max_attempts - guesses_used + 1)
- Speed bonus: if under 30 seconds, ×1.5
- No-hint bonus: if solved without hints, ×1.2

### Modes
1. Classic: choose difficulty, unlimited replays
2. Daily: Medium difficulty, seeded, one attempt per day
3. Speed: 60-second timer, any difficulty

### Share Format
```
🔢 NumVault Daily #47
🟢🟡⚫⚫
🟢🟢⚫🟡
🟢🟢🟢🟢
3/6 ⭐ No hints!
puzzlevault.pages.dev/numvault
```

---

## Game 2: 🧱 GridSmash — Block Placement

### Rules
- 10×10 grid (NOT 8×8, to differentiate from similar games)
- Receive 3 random pieces per turn (polyomino shapes: 1×1 to 5×1, L-shapes, T-shapes, squares)
- Drag pieces onto grid. Must fit without overlapping.
- Full row OR full column → cleared with animation + points.
- Can't place any of the 3 pieces → game over.

### UNIQUE Mechanic: Special Blocks (3 types)
| Block | Emoji | Appearance | Effect |
|-------|-------|-----------|--------|
| Crystal | 💎 | Sparkle overlay | When part of a cleared line, also clears the entire 3×3 area around it |
| Ice | 🧊 | Frosted texture | Requires 2 line clears to remove (first clear cracks it, second removes) |
| Wild | ⭐ | Gold glow | 1×1 piece that can be placed anywhere, even on occupied cells (overwrites) |

- Special blocks appear randomly from turn 10+
- Probability: 15% Crystal, 10% Ice, 5% Wild per piece set

### UNIQUE Mechanic: Shatter Zone
- Every 10 turns: bottom 2 rows glow gold (Shatter Zone active for 3 turns)
- Lines cleared within Shatter Zone = 3× score multiplier
- If Shatter Zone expires without clearing those rows: random blocks fill 3 cells in those rows (penalty)

### Visual Style
- Pieces: pastel PV colors with rounded corners (border-radius: 4px)
- Grid: light gray lines on white background (dark mode: dark gray on near-black)
- Minimal, clean aesthetic (NOT neon, NOT blocky sharp edges)
- Clear animation: line flashes white → tiles shrink → disappear

### Hint System
- 💡 Hint highlights the optimal placement zone for the current piece (shows a ghost outline)
- First hint per session: FREE
- Subsequent hints: reward ad required

### Scoring
- Per cell placed: 10 points
- Line clear: 100 × number of lines cleared simultaneously
- Combo: consecutive turns with clears → multiplier (×1, ×1.5, ×2, ×3, ×5)
- Shatter Zone clear: 3× multiplier on top of other bonuses
- Crystal bonus: +200 per Crystal block explosion
- Perfect clear (empty board): 5000 bonus

### Modes
1. Classic: until game over, high score chase
2. Daily: seeded piece sequence, compare scores
3. Zen: no game over, pieces always fit (relaxation mode)

### Share Format
```
🧱 GridSmash Daily #47
Score: 12,450 🏆
Lines: 23 | Combo: ×5
💎×2 🧊×1 ⭐×1
puzzlevault.pages.dev/gridsmash
```

---

## Game 3: 🧠 PatternPop — Memory Pattern

### Rules
- Grid of tiles (starts 3×3, grows to 6×6).
- Flash sequence: N tiles light up in order.
- Player must tap them in the same order.
- Correct → next round adds 1 more tile to sequence.
- Wrong → game over (or lose a life in lives mode).

### UNIQUE Mechanic: Decoy Flash
- From level 5+: during the flash sequence, 1-2 "decoy" tiles flash in a DIFFERENT color (red tint vs normal blue)
- Player must ignore decoys and only remember the real (blue) flashes
- Decoy count increases with difficulty

### Hint System
- 💡 Hint replays the pattern one more time at 50% slower speed
- First hint per session: FREE
- Subsequent hints: reward ad required
- Hint does NOT add to the sequence or change difficulty

### Visual
- Tiles: PV pastel colors, rounded squares
- Flash: tile brightens + subtle scale animation (1.0 → 1.1 → 1.0)
- Decoy flash: same brightness but with red-tinted border
- Wrong tap: tile shakes + turns red briefly

### Scoring
- Per correct sequence: 100 × sequence_length
- Perfect round (no hesitation, < 0.5s per tap): ×2 bonus
- Longest streak tracked

### Modes
1. Classic: 3 lives, increasing difficulty
2. Daily: seeded sequence, one attempt
3. Endless: no lives, see how far you get
4. Speed: tiles flash faster each round

### Share Format
```
🧠 PatternPop Daily #47
Level 14 🔥
Longest streak: 14
⬜⬜🟦🟦🟦
⬜🟦🟦🟦🟦
🟦🟦🟦🟦🟦
puzzlevault.pages.dev/patternpop
```

---

## Game 4: 📚 SortStack — Color Sort

### Rules
- N tubes/stacks, each partially filled with colored segments.
- Pour top color from one tube to another (only if top colors match or target is empty).
- Goal: sort so each tube contains only one color.
- Move limit: varies by difficulty (Easy: unlimited, Hard: limited moves)

### UNIQUE Mechanic: Lock Stack
- When a tube is completely sorted (all same color, full), it "locks" with a ✅ icon
- Locked tube cannot be poured from or to
- Locking a tube adds 1 new empty tube as reward (helps with harder puzzles)

### UNIQUE Mechanic: Move Limit (Hard/Expert)
| Difficulty | Tubes | Colors | Empty | Move Limit |
|-----------|-------|--------|-------|------------|
| Easy | 5 | 3 | 2 | Unlimited |
| Medium | 7 | 5 | 2 | 50 |
| Hard | 9 | 7 | 2 | 40 |
| Expert | 12 | 10 | 2 | 35 |

### Hint System
- 💡 Hint shows the optimal next move (source tube glows → arrow → destination tube glows)
- First hint per session: FREE
- Subsequent hints: reward ad required
- Undo remains FREE and unlimited

### Visual
- Tubes: vertical rounded rectangles, PV colors
- Pour animation: color segments slide up from source, arc over, slide down into target
- Lock animation: tube shrinks slightly + ✅ checkmark + sparkle

### Scoring
- Level clear: 500 base
- Move efficiency: bonus = max(0, (move_limit - moves_used) × 20)
- No-hint bonus: ×1.3

### Modes
1. Classic: progressive levels, increasing difficulty
2. Daily: one puzzle per day, seeded
3. Relaxed: no move limit, no timer

### Share Format
```
📚 SortStack Daily #47
✅ Solved in 28 moves
⭐⭐⭐ (under limit!)
puzzlevault.pages.dev/sortstack
```

---

## Game 5: ⚡ QuickCalc — Mental Math

### Rules
- Flash a math equation, player types the answer.
- Correct → next question (harder). Wrong → lose a life (3 lives).
- Timer: starts at 10 seconds, decreases as difficulty rises.
- Operations: +, -, ×, ÷ (division always results in integers)

### Difficulty Progression
| Phase | Numbers | Operations | Timer |
|-------|---------|-----------|-------|
| 1-5 | 1-20 | +, - | 10s |
| 6-10 | 1-50 | +, -, × | 8s |
| 11-15 | 1-100 | +, -, ×, ÷ | 6s |
| 16+ | 1-200 | all + 2-step | 5s |

### UNIQUE Mechanic: Operator Roulette
- From question 8+: sometimes the OPERATOR is hidden instead of the answer
- Display: "7 ? 3 = 21" → player must identify "×"
- From question 15+: sometimes TWO operators hidden: "5 ? 3 ? 2 = 11" → "+, ×" or "×, +"

### Hint System
- 💡 Hint extends timer by 5 seconds (this is always FREE, no ad required)
- For Operator Roulette questions: hint narrows operators to 2 choices (requires ad after first free use)

### Visual
- Large equation display (centered, big font)
- Timer: circular countdown ring around the equation
- Correct: green flash + satisfying sound
- Wrong: red shake + number shows correct answer briefly
- Numpad: 0-9 + minus + submit (touch-optimized)

### Scoring
- Correct answer: 100 × current_phase
- Speed bonus: remaining_seconds × 10
- Streak bonus: consecutive correct × 50
- Operator Roulette correct: 2× points

### Modes
1. Classic: 3 lives, increasing difficulty
2. Daily: seeded sequence, one attempt, score comparison
3. Time Attack: 2 minutes, answer as many as possible
4. Blitz: 30 seconds, rapid fire

### Share Format
```
⚡ QuickCalc Daily #47
Score: 3,250
22 correct | 🔥 12 streak
puzzlevault.pages.dev/quickcalc
```

---

## Game 6: 🔄 TileTurn — Lights Puzzle

### Rules
- Grid of tiles, each ON (lit, colored) or OFF (dark).
- Tap a tile → it toggles, AND all orthogonally adjacent tiles toggle.
- Goal: turn ALL tiles ON (or all OFF, depending on puzzle).
- Level-based: pre-designed puzzles in packs.

### UNIQUE Mechanic: Cascade Mode
- From Pack 4+: toggling a tile triggers a 2-step cascade
- Step 1: target + adjacent tiles toggle (normal)
- Step 2: after 300ms delay, tiles that were turned ON in step 1 also toggle THEIR adjacent tiles
- Creates chain reactions that require deeper planning

### UNIQUE Mechanic: Spectrum Mode
- From Pack 6+: tiles have 3 states instead of 2 (OFF → Blue → Green → OFF)
- Each tap advances the tile and its neighbors by one state
- Goal: get all tiles to Green state

### Level Packs
| Pack | Grid | Mechanic | Levels |
|------|------|----------|--------|
| 1 | 3×3 | Basic | 20 |
| 2 | 4×4 | Basic | 20 |
| 3 | 5×5 | Basic | 20 |
| 4 | 4×4 | Cascade | 20 |
| 5 | 5×5 | Cascade | 20 |
| 6 | 4×4 | Spectrum | 20 |
| 7 | 5×5 | Spectrum | 20 |

### Hint System
- 💡 Hint highlights which tile to flip next (shows a pulsing golden border on the optimal tile)
- First hint per session: FREE
- Subsequent hints: reward ad required

### Visual
- ON tile: PV blue with soft glow
- OFF tile: dark slate
- Spectrum: OFF=slate, Blue=PV blue, Green=PV emerald
- Toggle animation: flip effect (rotateX) with color transition
- Cascade: ripple wave effect radiating outward

### Scoring
- Level clear: 300 base
- Move efficiency: bonus if solved in minimum possible moves
- No-hint bonus: ×1.2
- Pack clear bonus: 2000

### Modes
1. Campaign: sequential packs
2. Daily: random puzzle, one attempt
3. Free Play: any unlocked level

### Share Format
```
🔄 TileTurn Daily #47
✅ Solved in 8 moves (min: 6)
⬜🟦⬜
🟦🟦🟦
⬜🟦⬜
puzzlevault.pages.dev/tileturn
```

---

## Game 7: 🎨 ColorFlow — Path Connection

### Rules
- Square grid (sizes: 5×5, 6×6, 7×7, 8×8, 9×9).
- Pairs of same-colored dots placed on grid.
- Draw a path connecting each pair. Paths cannot cross or overlap.
- Goal: connect ALL pairs AND fill every empty cell.

### UNIQUE Mechanic: Flow Bonus
- If ALL cells filled (100% coverage): ⭐⭐⭐ rating + 2× score
- Coverage display: percentage shown during play ("Coverage: 87%")
- Star ratings:
  - ⭐: solved but coverage < 80%
  - ⭐⭐: solved with coverage ≥ 80%
  - ⭐⭐⭐: solved with 100% coverage

### Level Packs
| Pack | Grid | Pairs | Levels |
|------|------|-------|--------|
| 1 | 5×5 | 4-5 | 30 |
| 2 | 6×6 | 5-6 | 30 |
| 3 | 7×7 | 6-8 | 30 |
| 4 | 8×8 | 8-10 | 30 |
| 5 | 9×9 | 10-12 | 30 |

### Hint System
- 💡 Hint shows one correct path segment (3-4 cells of the correct path for one color pair)
- First hint per session: FREE
- Subsequent hints: reward ad required

### Path Drawing
- Touch/mouse drag from dot → path follows finger
- Drag over existing path → overwrites it
- Lift finger → path stays
- Tap dot with completed path → clears that color's path

### Visual
- Dots: large circles with PV colors (coral, blue, emerald, amber, violet, cyan, pink, lime)
- Paths: rounded rectangles filling cells, same color as dots
- Empty cells: light gray
- 100% coverage: golden border glow around grid

### Scoring
- Level clear: 200 base
- Coverage bonus: coverage% × 5
- Speed bonus: (time_limit - time_used) × 2
- No-hint bonus: ×1.3

### Share Format
```
🎨 ColorFlow Pack 2 Level 14
⭐⭐⭐ 100% Coverage!
Time: 0:42 | No hints
puzzlevault.pages.dev/colorflow
```

---

## Game 8: 🔧 PipeLink — Circuit Connection

### Rules
- Grid with Source node(s) (⚡) and Target node(s) (💡).
- Grid filled with pipe tiles that can be ROTATED (tap to rotate 90°).
- Goal: rotate pipes so energy flows from Source to Target.
- Pipe types: straight(━), corner(┗), T-junction(┣), cross(╋), end cap(╸)

### UNIQUE Mechanic: Circuit Board Theme
- NOT traditional plumbing. Visual theme is circuit board / electronics.
- Pipes look like PCB traces (thin green/blue lines on dark background)
- Source = ⚡ battery icon, Target = 💡 LED icon
- Connected pipes glow with energy flow animation (pulse traveling along path)

### UNIQUE Mechanic: Dual Source (from Pack 4+)
- Two Source-Target pairs on same grid (A→A and B→B)
- Both must connect simultaneously
- Paths can share cross(╋) tiles

### UNIQUE Mechanic: Locked Tiles
- From Pack 5+: some tiles marked 🔒 → cannot rotate
- Must solve around fixed constraints

### Level Packs
| Pack | Grid | Sources | Locked | Levels |
|------|------|---------|--------|--------|
| 1 | 4×4 | 1 | No | 25 |
| 2 | 5×5 | 1 | No | 25 |
| 3 | 6×6 | 1 | No | 25 |
| 4 | 5×5 | 2 (Dual) | No | 25 |
| 5 | 6×6 | 2 (Dual) | Yes | 25 |

### Hint System
- 💡 Hint rotates one pipe to its correct orientation (the pipe flashes gold before rotating)
- First hint per session: FREE
- Subsequent hints: reward ad required

### Visual
- Background: dark PCB green (#064E3B)
- Pipes: thin traces, disconnected=gray, connected=glowing blue
- Source: yellow ⚡ icon with pulse, Target: white 💡 icon
- Rotation animation: smooth 90° turn (200ms)
- Connection complete: energy pulse animation flows from Source to Target

### Scoring
- Level clear: 400 base
- Rotation efficiency: bonus if total rotations ≤ optimal × 1.5
- No-hint bonus: ×1.2
- Dual Source bonus: ×1.5

### Share Format
```
🔧 PipeLink Pack 3 Level 12
✅ Solved! ⚡→💡
Rotations: 18 (optimal: 14)
puzzlevault.pages.dev/pipelink
```

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

### Hint System
- 💡 Hint shows the optimal drop column (a ghost ball appears at the recommended position)
- First hint per session: FREE
- Subsequent hints: reward ad required

### Scoring
Merge score = resulting number value. Chain bonus: × chain count.

### Modes
1. Classic: until game over. 2. Daily: seed-based same sequence. 3. Time Attack: 2 minutes.

### Share Format
```
🔮 MergeChain Daily #47
Highest: 256 🏆
Score: 8,430
Chain: ×4
puzzlevault.pages.dev/mergechain
```

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

### Hint System
- 💡 Hint highlights a valid 4+ chain on the board (matching tiles glow with golden outline)
- First hint per session: FREE
- Subsequent hints: reward ad required

### Scoring
3 tiles=30, 4=60, 5=120+bomb, 6=300, 7+=600.
Bomb explosion: cells × 20.

### Special Tile
⭐ Rainbow: appears every 8 turns randomly. Matches any color.

### Hex Adjacency
Each hex has up to 6 neighbors (↖↗→↘↙←). Use offset or cube coordinates for implementation.

### Colors
PV palette: coral, blue, emerald, amber, violet, cyan.

### Share Format
```
⬡ HexMatch Daily #47
Score: 4,280
💣×2 Bombs used
Best chain: 7
puzzlevault.pages.dev/hexmatch
```