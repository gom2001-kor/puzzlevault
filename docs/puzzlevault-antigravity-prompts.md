# PuzzleVault — Antigravity Development Prompts

> 채팅창에 하나씩 순서대로 붙여넣기하세요.
> 각 프롬프트 완료 후 결과를 확인하고 문제가 없으면 다음 프롬프트를 진행하세요.
> 총 15개 프롬프트 (기초 2개 + 게임 10개 + 마무리 3개)

---

## P-01: 프로젝트 기초 — 폴더 구조 + 공유 파일

```
Create the PuzzleVault project foundation.

1. Create the full folder structure:
puzzlevault/
├── index.html (placeholder)
├── about.html, privacy.html, terms.html, contact.html (placeholders)
├── sitemap.xml, robots.txt, manifest.json
├── css/global.css
├── js/common.js, adsense.js, seed.js, sfx.js, share.js, blog-data.js
├── games/ (empty folder)
├── blog/
│   ├── index.html (placeholder)
│   └── posts/ (empty folder)
└── images/ (empty folder)

2. global.css — Complete design system:
- Full PuzzleVault CSS variables (all --pv-* colors as defined in Rules)
- CSS reset + box-sizing
- System font stack
- Mobile-first responsive grid (480px, 768px, 1024px breakpoints)
- Dark mode via prefers-color-scheme
- Common components: .pv-btn, .pv-card, .pv-toast, .pv-modal, .pv-overlay
- Game layout: .game-container (centered, max 500px), .game-header, .game-canvas-wrapper
- Ad slots: .ad-slot styling with placeholder borders
- Result overlay: .result-overlay (centered modal with blur backdrop)
- Animations: @keyframes for fadeIn, scaleIn, slideUp, pulse, ripple, shake

3. seed.js — Daily seed system:
- getDailySeed(gameId) function
- SeededRandom class with next(), nextInt(min,max), shuffle(arr)
- getDailyNumber() helper that returns day count since 2026-01-01

4. sfx.js — Sound effects:
- SFX object with init(), play(type), toggle()
- Sound types: tap, correct, wrong, clear, combo, gameover, win
- Mute state saved to localStorage('pv_sound')

5. share.js — Share system:
- shareResult(text) using Web Share API with clipboard fallback
- copyToClipboard(text) 
- showToast(msg) with auto-dismiss

6. adsense.js — Ad controller:
- AdController object with shouldShowInterstitial(), showInterstitial(), hideInterstitial()
- First 3 games ad-free, then 1 per 3 games
- Session tracking via sessionStorage

7. common.js — Shared UI components:
- renderHeader() — site header with 🧩 PuzzleVault logo + nav menu (Home, Games, Blog, About)
- renderFooter() — footer with links + copyright
- renderCrossPromo(currentGameId) — "Try Another Puzzle" cards using the cross-promotion map
- renderBlogCards(count, category?) — render recent blog post cards (reads from blog-data.js)
- getStats() / updateStats(gameId, score) — localStorage-based global stats
- formatNumber(n) — number formatting with commas
- initPage() — call renderHeader + renderFooter + init SFX on DOMContentLoaded

8. blog-data.js — Blog post registry:
- BLOG_POSTS array with objects: { slug, title, description, date, category, tags, readTime }
- getBlogPosts(count?, category?) — return filtered/sorted posts
- getRelatedPosts(currentSlug, count) — return posts with matching tags
- Adding a new blog post = add entry to this array + create the HTML file

8. manifest.json — PWA manifest:
- name: PuzzleVault, short_name: PuzzleVault
- theme_color: #2563EB, background_color: #F8FAFC
- display: standalone

9. robots.txt — Allow all crawlers, link to sitemap.

Make sure all files are complete and functional, not just placeholders (except index.html and game pages which come later).
```

---

## P-02: 메인 랜딩 페이지

```
Create the PuzzleVault main landing page (index.html).

Requirements:
1. Hero section:
   - 🧩 PuzzleVault logo (large, CSS-styled, no image needed)
   - Tagline: "Free Brain Puzzles — No Download Needed"
   - Subtext: "Challenge your mind with 10 unique puzzle games. Play directly in your browser."

2. Daily Challenges section:
   - "📅 Today's Daily Challenges" heading
   - 3 featured game cards (NumVault, GridSmash, ColorFlow) with [Play Now] buttons
   - Show streak: "🔥 Your Streak: X days" (from localStorage)

3. All Games grid:
   - 10 game cards in responsive grid (2 columns mobile, 3 tablet, 5 desktop)
   - Each card: emoji icon + game name + 1-line description + [Play] link
   - Card descriptions:
     - 🔢 NumVault: "Crack the secret number code"
     - 🧱 GridSmash: "Place blocks, clear lines, chase combos"
     - 🧠 PatternPop: "How sharp is your memory?"
     - 📚 SortStack: "Sort the colors into stacks"
     - ⚡ QuickCalc: "Race against time with mental math"
     - 🔄 TileTurn: "Flip tiles to light them all"
     - 🎨 ColorFlow: "Connect matching colors, fill the grid"
     - 🔧 PipeLink: "Route energy through the circuit"
     - 🔮 MergeChain: "Drop and merge numbers to 2048"
     - ⬡ HexMatch: "Match hex tiles in chain reactions"

4. Ad slot: 728×90 between games grid and stats

5. Blog preview section:
   - "📝 Latest from the Blog" heading
   - 3 most recent blog post cards (via renderBlogCards(3))
   - Each card: title + description + date + read time + category badge
   - [View All Posts →] link to /blog/

6. Stats section:
   - "📊 Your Stats" heading
   - Total Score, Games Played, Daily Streak, Favorite Game
   - Data from localStorage via common.js getStats()

6. Footer (via common.js renderFooter)

7. SEO: Complete meta tags, OG tags, Schema.org WebSite JSON-LD
8. PWA: Link to manifest.json, theme-color meta tag

Make this page beautiful with the PV design system. Smooth hover animations on cards, clean spacing, inviting visuals. This is the first thing visitors see — it must look professional.
```

---

## P-03: NumVault (게임 1 — 숫자 금고)

```
Create NumVault (games/numvault.html) — a number deduction puzzle game.

Refer to skills.md "Game 1: NumVault" for complete specifications.

Implementation requirements:

1. GAME STATE:
   - code[]: the secret N-digit code
   - guesses[][]: array of submitted guesses
   - feedback[][]: 🟢/🟡/⚫ per digit per guess
   - currentInput[]: digits being typed
   - difficulty: { digits, maxAttempts, allowDuplicates }
   - gameState: 'playing' | 'won' | 'lost'
   - tracker[0-9]: state of each digit (unused/included/confirmed/excluded)

2. UI LAYOUT:
   - Top bar: "🔢 NumVault" + Daily #N + settings/stats/help icons
   - Guess grid: N columns × maxAttempts rows, filled top-down
   - Number Tracker: 0-9 display with color-coded states below grid
   - Numpad: 0-9 buttons + Backspace + Enter + Hint(?)
   - Physical keyboard also works (0-9, Backspace, Enter)

3. CORE LOGIC:
   - generateCode(difficulty, seed?) — create secret code, use seed for Daily
   - evaluateGuess(guess, code) — return feedback array, following exact priority rules:
     Step 1: Mark all exact matches as 🟢
     Step 2: For remaining digits, mark as 🟡 if digit exists in unmatched code positions (count-limited)
     Step 3: Rest are ⚫
   - updateTracker(feedback, guess) — update 0-9 tracker states
   - checkWin() / checkLoss()

4. NUMBER TRACKER (unique feature):
   - 10 boxes (0-9) displayed horizontally
   - Colors: ⬜ unused, 🟢 confirmed (#059669), 🟡 included (#D97706), ⚫ excluded (#475569)
   - Updates automatically after each guess
   - Priority: once 🟢, never downgrades

5. MODES:
   - Daily Challenge: getDailySeed('numvault'), Normal difficulty, 1 puzzle per day
   - Free Play: choose difficulty, unlimited games
   - Speed Mode: 60s timer, +15s per correct, continuous Easy codes

6. ANIMATIONS:
   - Digit input: scale bounce on each cell
   - Submit: flip animation revealing feedback color (like card flip)
   - Win: all cells do wave animation + SFX.play('win')
   - Lose: shake animation + SFX.play('gameover')
   - Tracker update: pulse animation on changed digit

7. RESULT SCREEN (.result-overlay):
   - Win: "🔓 Vault Cracked!" / Lose: "🔒 Vault Sealed"
   - Code reveal, attempts count, time, difficulty
   - Distribution chart (bar chart of personal attempt history)
   - Streak counter
   - [📤 Share] button → generates emoji grid text
   - [🔄 Play Again] button

8. HINT SYSTEM:
   - Hint button (?) → show reward ad prompt → reveal one unconfirmed position
   - Daily: max 1, Free Play: max 2
   - Share text shows 💡 if used

9. DATA STORAGE (localStorage):
   - pv_numvault_best: highest score
   - pv_numvault_daily_YYYY-MM-DD: today's result
   - pv_numvault_streak: current streak
   - pv_numvault_lastDaily: last daily date
   - pv_numvault_distribution: {1:n, 2:n, ..., 6:n} attempt distribution
   - pv_numvault_stats: {played, won, bestStreak}

10. SEO: Full meta tags, "How to Play NumVault" guide (250 words), 5 FAQ items.
11. ADS: sidebar + bottom + interstitial (via AdController) + reward hint button.
12. CROSS-PROMO: renderCrossPromo('numvault') at bottom.

Test all edge cases: duplicate digits, all same digits, code starting with 0, Speed Mode timer, Daily seed produces same puzzle all day.
```

---

## P-04: GridSmash (게임 2 — 블록 배치)

```
Create GridSmash (games/gridsmash.html) — a block placement puzzle on a 10×10 grid.

Refer to skills.md "Game 2: GridSmash" for complete specifications.

Implementation requirements:

1. GAME STATE:
   - grid[10][10]: null or { color, frozen?, frozenCount? }
   - pieces[3]: current 3 block pieces to place
   - piecesPlaced: count of pieces placed this turn (0-3)
   - score, bestScore, linesCleared, bestCombo
   - comboStreak: consecutive turns with line clears
   - turn: current turn number
   - shatterZone: { active, rowStart, turnsLeft } or null
   - specialBlockChance: 0.2 (from turn 16)

2. CANVAS RENDERING:
   - 10×10 grid with cell size = canvas.width / 10
   - Grid lines: subtle (1px, --pv-border)
   - Filled cells: rounded rect (4px radius) with PV pastel colors + inner shadow
   - Frozen cells: white border + frost pattern overlay + "×2" or "×1" indicator
   - Shatter Zone: gold (#FDE68A) background on active rows + subtle pulse
   - Drag preview: semi-transparent piece following pointer
   - Invalid preview: red-tinted

3. BLOCK PIECES:
   - 20 piece types (define as arrays of [row, col] offsets)
   - Random color from 6 pastel PV colors, 3 pieces get different colors
   - Pieces displayed below grid in "dock" area
   - Drag from dock to grid

4. SPECIAL BLOCKS (from turn 16, 20% chance):
   - Crystal 💎: on placement, run destroyCrystal(row, col) → clear 3×3 area
   - Frost 🧊: on placement, run applyFrost() → freeze 2 random empty cells
   - Wild ⭐: 1×1 gold block, separate slot, can place on any empty cell before other pieces
   - Visual indicators: crystal=sparkle animation, frost=white border, wild=star icon + gold

5. SHATTER ZONE (every 10 turns):
   - Activate: bottom 2 rows get gold background + pulse
   - Line clears in zone: score ×3
   - Counter: "Zone: X turns left"
   - Expiry: after 5 turns, fill 50% of empty cells in zone rows with random blocks

6. LINE CLEAR LOGIC:
   - After each piece placement, check all 10 rows + all 10 columns
   - Full line → mark for clearing
   - Frozen cells: decrement frozenCount. If 0 → remove. If >0 → stays (takes 2 clears)
   - Animation: flash white → scale to zero → remove → gravity (no gravity in this game, cells don't fall)
   - Multiple simultaneous clears → combo popup

7. DRAG & DROP (touch + mouse):
   - pointerdown on piece → start drag
   - pointermove → update preview position on grid (snap to grid cells)
   - pointerup → if valid placement, place piece; else return to dock
   - Validation: all cells of piece must be within grid AND on empty (non-frozen) cells

8. GAME OVER:
   - After placing all 3 pieces and getting new 3:
   - Check if ANY of the 3 new pieces can fit ANYWHERE on the grid
   - If none can fit → game over

9. MODES:
   - Classic: endless until game over
   - Daily: seed-based piece sequence, 3-minute timer, score comparison
   - Zen: no score, no Shatter Zone, no ads, peaceful mode
   - Sprint 40: clear 40 lines, track time

10. SCORING: Implement exact formula from skills.md (placement + line clear + combo + streak + shatter multiplier + crystal).

11. RESULT SCREEN: Score, lines, best combo, Shatter clears, percentile ("Top X%"), [Share] [Play Again].

12. REWARD AD: "Undo last move" on game over, 1 per game.

13. SEO: Guide section + FAQ. ADS: sidebar + bottom + interstitial. CROSS-PROMO.

Performance: Canvas rendering must be smooth. Only redraw changed cells, not entire grid every frame. Use requestAnimationFrame for animations only.
```

---

## P-05: PatternPop (게임 3 — 패턴 기억)

```
Create PatternPop (games/patternpop.html) — a pattern memory game.

Refer to skills.md "Game 3: PatternPop" for complete specifications.

Implementation requirements:

1. GAME PHASES (per round):
   Phase 1 "MEMORIZE": Show N target cells highlighted for T seconds. If round ≥ 10, also flash D decoy cells for 0.3s during this phase.
   Phase 2 "RECALL": Grid is blank. Player taps cells from memory.
   Phase 3 "FEEDBACK": Show correct/wrong results briefly. Then next round or game over.

2. GRID:
   - Dynamic size: 3×3 → 4×4 → 5×5 → 6×6 based on round number
   - Canvas rendering with clear cell borders
   - Highlight: fill cell with --pv-blue (#2563EB)
   - Decoy: fill cell with lighter blue (#60A5FA), only 0.3s duration

3. DECOY FLASH SYSTEM (unique feature):
   - Round 10+: during memorize phase, randomly select D extra cells (not overlapping targets)
   - Flash decoys at random time during the memorize window, lasting only 0.3s
   - Decoy color visually similar but lighter than real targets
   - Player must notice the shorter flash duration and lighter color

4. INTERACTION:
   - Tap cells during recall phase
   - Correct tap: cell turns green (#059669) + SFX.play('correct')
   - Wrong tap: cell turns red (#F43F5E) + SFX.play('wrong'), lose 1 life
   - Must tap ALL target cells to complete round (can tap in any order)
   - Tapping a decoy position during recall = wrong (lose life)

5. LIVES: 3 hearts displayed. Lose 1 per wrong tap. 0 = game over.

6. SCORING: Exact formula from skills.md. Track: round reached, total score, best round.

7. ANIMATIONS:
   - Memorize phase: cells fade in with scale effect
   - Decoy: quick flash with fade-out
   - Round transition: "Round X" text with slide-up animation
   - Game over: dramatic shake + fade

8. RESULT SCREEN: Round reached, score, best round, decoys dodged count.

9. REWARD AD: +1 life, restart current round, 1 per game.

10. DAILY MODE: seed-based target positions per round. Same seed = same game globally.

11. SEO + ADS + CROSS-PROMO as standard.
```

---

## P-06: SortStack (게임 4 — 색상 정렬)

```
Create SortStack (games/sortstack.html) — a color sorting puzzle.

Refer to skills.md "Game 4: SortStack" for complete specifications.

Implementation:

1. VISUAL STYLE — NOT test tubes + round balls:
   - Stacks = rectangular "drawers" (tall rectangles with visible sides)
   - Blocks = square blocks with rounded corners (not circles)
   - Layout: horizontal row of stacks, scrollable on mobile if needed

2. INTERACTION:
   - Tap stack → top block lifts up (hover animation)
   - Tap another stack → if valid (same color top or empty), block moves there with arc animation
   - If invalid → shake animation on target stack, block returns
   - Tap same stack again → cancel selection

3. LOCK STACK (unique): When 4 same-color blocks fill a stack → lock animation (🔒 icon + sparkle) + new empty stack appears at the end.

4. MOVE LIMIT (unique): In Hard/Expert, show "Moves: X/40" counter. If moves run out before solving → level failed.

5. UNDO: Unlimited undo button (no ad required). Store move history as stack.

6. PUZZLE GENERATION:
   - Start from solved state (each stack has 4 same-color blocks)
   - Apply N random valid moves to shuffle
   - N increases with difficulty
   - Verify puzzle is solvable (since generated from solved state, always solvable)

7. LEVEL PROGRESSION: Easy → Medium → Hard → Expert. Track cleared levels per difficulty.

8. SEO + ADS + CROSS-PROMO as standard.
```

---

## P-07: QuickCalc (게임 5 — 순간 암산)

```
Create QuickCalc (games/quickcalc.html) — a speed math arcade game.

Refer to skills.md "Game 5: QuickCalc" for complete specifications.

Implementation:

1. TIMER: Large timer bar at top. Starts at 30s. Correct +2s (green flash), wrong -3s (red flash + shake). Timer bar color shifts from green → yellow → red as time decreases.

2. PROBLEM GENERATION:
   - generateProblem(questionNumber) → returns { display, answer, choices }
   - Follow difficulty scaling from skills.md
   - Operator Roulette (from Q15): display = "A ? B = C", choices = ['+', '-', '×', '÷']
   - Wrong answer generation: 1 near (±1~3), 1 medium (±5~15), 1 far (random)
   - Shuffle choice positions each time

3. UI:
   - Big problem display centered
   - 2×2 grid of choice buttons below
   - Combo indicator: "🔥 Combo ×N"
   - Question counter: "#15 · Addition · Medium"

4. COMBO: Track consecutive correct answers. 3→+3s, 5→+4s, 10→+5s. Wrong resets to 0.

5. ANIMATIONS:
   - Correct: choice button flashes green, score pops up (+points)
   - Wrong: choice button flashes red, screen shakes, timer flash red
   - New problem: slide-in from right

6. RESULT: Questions answered, accuracy %, best combo, score. Daily mode with seed.

7. SEO + ADS + CROSS-PROMO as standard.
```

---

## P-08: TileTurn (게임 6 — 타일 뒤집기)

```
Create TileTurn (games/tileturn.html) — a tile-flipping puzzle game.

Refer to skills.md "Game 6: TileTurn" for complete specifications.

Implementation:

1. THREE MODES in one game:
   a. Classic: ON/OFF toggle, tap affects cross pattern (5 cells)
   b. Cascade: toggle propagates 2 levels deep (up to 13 cells)
   c. Spectrum: 3-color cycle (coral→amber→blue→coral), tap advances colors

2. PUZZLE GENERATION:
   - Reverse method: start solved → apply K random taps → guaranteed solvable
   - Store the solution taps for star rating comparison

3. LEVEL PACK SYSTEM:
   - 7 packs (see skills.md table)
   - Level select screen with star ratings per level
   - Progress saved to localStorage

4. VISUALS:
   - ON cells: warm glow (--pv-cream with box-shadow glow effect)
   - OFF cells: dark (--pv-grid-dark)
   - Spectrum colors: distinct coral/amber/blue with gradient
   - Tap effect: ripple animation spreading from tapped cell to affected cells (staggered 50ms delay per cell distance)

5. STAR RATING: Compare player's tap count to minimum solution. ⭐⭐⭐/⭐⭐/⭐.

6. Moves counter displayed. Undo button (unlimited). Reset button.

7. SEO + ADS (interstitial every 10 levels) + CROSS-PROMO as standard.
```

---

## P-09: ColorFlow (게임 7 — 색상 경로 연결)

```
Create ColorFlow (games/colorflow.html) — a color path connection puzzle.

Refer to skills.md "Game 7: ColorFlow" for complete specifications.

Implementation:

1. VISUAL DIFFERENTIATION FROM FLOW FREE (critical):
   - Background: LIGHT (--pv-bg-light), NOT black
   - Markers: DIAMOND shape (◆) rendered as rotated squares, NOT circles
   - Paths: gradient-filled rectangles covering 75% of cell, NOT thick lines
   - Connected pair: particle light effect flowing along path

2. PATH DRAWING:
   - pointerdown on diamond marker → start drawing path in that color
   - pointermove → extend path through adjacent cells (horizontal/vertical only)
   - If path enters cell with another color's path → overwrite (erase existing path on that cell)
   - pointerup → keep path as-is
   - If path connects both diamonds of same color → mark as connected ✓
   - Tap completed path's start marker → erase entire path for that color

3. PUZZLE DATA:
   - Store as JSON: { size: N, pairs: [[r1,c1,r2,c2,colorIndex], ...] }
   - Create at least 50 puzzles for 5×5 and 6×6
   - Hardcode puzzle data in the page
   - Daily mode: seed selects from puzzle set

4. COVERAGE TRACKING (unique):
   - Real-time "Coverage: X%" display
   - Count: (cells with paths + cells with markers) / total cells

5. FLOW BONUS (unique):
   - Calculate Manhattan distance between each pair (shortest possible)
   - If actual path length ≤ 1.5× Manhattan distance → +50 bonus per pair

6. LEVEL PACKS: 8 packs, 30 levels each, ad every 10 levels. Star system (⭐⭐⭐ for Perfect = 100% coverage).

7. SEO + ADS + CROSS-PROMO as standard.
```

---

## P-10: PipeLink (게임 8 — 회로 연결)

```
Create PipeLink (games/pipelink.html) — a circuit connection puzzle.

Refer to skills.md "Game 8: PipeLink" for complete specifications.

Implementation:

1. CIRCUIT BOARD THEME (NOT industrial pipes):
   - Dark background (--pv-bg-dark)
   - Tile cells: dark gray (--pv-grid-dark)
   - Connected energy lines: amber (--pv-amber) with animated pulse glow
   - Unconnected lines: gray (--pv-slate)
   - Source icon: ⚡ in amber. Destination: 🔋 in emerald.
   - Full connection: energy pulse animation traveling source→destination

2. TILE RENDERING:
   - Each tile drawn on canvas with connection points on 4 sides (top/right/bottom/left)
   - Tile types: Straight(2 variants), L-bend(4), T-junction(4), Cross(1)
   - Show connection points as rounded line segments

3. ROTATION:
   - Tap → 90° clockwise with smooth rotation animation (0.2s CSS transform or canvas animation)
   - Double-tap → 180°
   - Locked tiles (🔒): show lock icon, tap does nothing + subtle shake

4. CONNECTION CHECK:
   - After each rotation, trace connectivity from source
   - All connected tiles: render in amber (energy flowing)
   - Unconnected: render in gray
   - Both source and destination connected → level clear!

5. DUAL SOURCE (unique, Pack 4+):
   - Two sources (⚡A amber, ⚡B cyan) and two destinations
   - Both A→A and B→B must connect
   - Cross(╋) tiles can serve both paths
   - Two different energy colors flowing simultaneously

6. PUZZLE GENERATION:
   - Build valid path from source to destination, assign correct tile types
   - Randomly rotate all tiles to create the puzzle
   - Verify solvable (solution = original rotations)

7. LEVEL PACKS: 5+ packs, increasing grid size and featuring Dual Source and Locked Tiles in later packs.

8. SEO + ADS + CROSS-PROMO as standard.
```

---

## P-11: MergeChain (게임 9 — 숫자 합치기)

```
Create MergeChain (games/mergechain.html) — a number-merging drop physics game.

Refer to skills.md "Game 9: MergeChain" for complete specifications.

Implementation:

1. PHYSICS ENGINE (simplified, Canvas-based):
   - All balls are circles with positions (x, y) and velocities (vx, vy)
   - Gravity: vy += 0.5 per frame
   - Wall collision: bounce with damping (velocity × -0.3)
   - Floor collision: same as walls
   - Ball-ball collision: elastic-ish collision with damping
   - Friction: vx *= 0.99 per frame
   - Run physics at 60fps via requestAnimationFrame

2. MERGE LOGIC:
   - Every frame: check all ball pairs for collision (distance < sum of radii)
   - If two same-number balls collide → merge:
     - Remove both, create new ball at midpoint with doubled number
     - New ball inherits average velocity + small upward impulse
     - SFX.play('clear'), score += new number value
   - Chain detection: if new ball immediately touches another same-number → chain merge
     - Chain bonus: score × chain count

3. BALL RENDERING:
   - Circle with gradient fill (colors from skills.md table)
   - Number displayed in center (white text, bold, size proportional to radius)
   - NEVER use fruit images
   - Merge animation: particles burst + scale effect on new ball

4. DROP MECHANIC:
   - Next ball shown at top center
   - Player drags horizontally to choose drop position
   - Tap/click to release → ball drops with gravity
   - Brief cooldown (0.5s) before next ball can be dropped

5. GAME OVER:
   - If any ball's top edge stays above the danger line for 3+ seconds → game over
   - Danger line: 15% from top, shown as dashed red line
   - Warning: when ball is near danger line, line starts pulsing red

6. VISUAL:
   - Field: dark background with subtle grid lines
   - Balls: gradient circles with white number labels
   - Danger line: dashed, amber when safe, red when danger

7. MODES: Classic, Daily (seed = same drop sequence), Time Attack (2 min).

8. SEO + ADS + CROSS-PROMO as standard.

Physics doesn't need to be perfect. Keep it simple and fun. Prioritize responsiveness and smooth animation over realistic physics.
```

---

## P-12: HexMatch (게임 10 — 육각형 매칭)

```
Create HexMatch (games/hexmatch.html) — a hexagonal color matching game.

Refer to skills.md "Game 10: HexMatch" for complete specifications.

Implementation:

1. HEX GRID RENDERING:
   - Use offset coordinates (odd-r or even-r) for hex layout
   - Hex diameter 7 → approximately 37 cells
   - Each hex: regular hexagon drawn on canvas
   - Colors: 6 from PV palette (coral, blue, emerald, amber, violet, cyan)
   - Canvas: pointy-top hexagons (flat side left/right)

2. HEX ADJACENCY:
   - Each hex has up to 6 neighbors
   - Implement getNeighbors(row, col) returning valid adjacent cells
   - For offset coords, neighbors differ for even/odd rows

3. DRAG TO SELECT:
   - pointerdown on a hex → start selection, record color
   - pointermove → if pointer enters adjacent hex of SAME color, add to selection chain
   - Selection chain: draw colored line connecting centers of selected hexes
   - If chain length ≥ 3 → glow effect (ready to remove)
   - pointerup → if chain ≥ 3, remove selected tiles; if < 3, cancel selection

4. GRAVITY (after removal):
   - Tiles above empty spaces fall down (hex gravity = move toward bottom of grid)
   - New random tiles fill from top
   - Animate falling with smooth motion

5. HEX BOMB (unique):
   - When 5+ tiles connected → center tile becomes 💣 Bomb (special marker)
   - Next turn: tap bomb → explode, removing all tiles within 2-ring radius (~12 tiles)
   - Explosion animation: radial shockwave + particles
   - Scoring: exploded tiles × 20

6. RISING TIDE (unique):
   - Every 8 turns: new row of random tiles pushes up from bottom
   - All existing tiles shift up by 1 row
   - If any tile pushed above top → game over
   - Warning at turn 7: "Rising Tide in 1 turn!" + bottom row highlight

7. RAINBOW TILE (⭐):
   - Appears randomly every 8 turns in a random cell
   - Matches any color when building selection chain
   - Visual: cycling rainbow gradient animation

8. SCORING: 3=30, 4=60, 5=120+bomb, 6=300, 7+=600. Bomb explosion=cells×20.

9. SEO + ADS + CROSS-PROMO as standard.

Hex math can be tricky. Use offset coordinates (odd-r). Neighbor calculation for odd-r:
- Even rows: neighbors at (r-1,c-1),(r-1,c),(r,c-1),(r,c+1),(r+1,c-1),(r+1,c)
- Odd rows: neighbors at (r-1,c),(r-1,c+1),(r,c-1),(r,c+1),(r+1,c),(r+1,c+1)
Hex center position: x = size * (sqrt(3) * col + sqrt(3)/2 * (row%2)), y = size * (3/2 * row).
```

---

## P-13: 정적 페이지 + sitemap

```
Create the static support pages and sitemap.

1. about.html:
   - "About PuzzleVault" — brief description of the project
   - "All games run 100% in your browser — no downloads, no accounts, no data collection."
   - "Built with vanilla HTML, CSS, and JavaScript."
   - Link to privacy policy and terms

2. privacy.html:
   - Privacy Policy page
   - Key points: no personal data collected, localStorage used only for game progress, 
     Google AdSense may use cookies (link to Google's privacy policy),
     no user accounts, no server-side storage

3. terms.html:
   - Terms of Service
   - Games provided as-is, free to play, ad-supported
   - Content copyright notice for PuzzleVault brand and original design

4. contact.html:
   - Simple contact info or feedback form placeholder
   - "Found a bug? Have a suggestion? We'd love to hear from you."

5. sitemap.xml:
   - Include all pages: index, 10 game pages, blog index, blog posts, about, privacy, terms, contact
   - Set appropriate priorities and changefreq
   - lastmod: current date

6. Update robots.txt to reference sitemap location.

7. _redirects file (for Cloudflare Pages clean URLs):
   /numvault      /games/numvault.html      200
   /gridsmash     /games/gridsmash.html      200
   /patternpop    /games/patternpop.html     200
   /sortstack     /games/sortstack.html      200
   /quickcalc     /games/quickcalc.html      200
   /tileturn      /games/tileturn.html       200
   /colorflow     /games/colorflow.html      200
   /pipelink      /games/pipelink.html       200
   /mergechain    /games/mergechain.html     200
   /hexmatch      /games/hexmatch.html       200
   /blog          /blog/index.html           200
   This allows users to share short URLs like puzzlevault.pages.dev/numvault

8. All pages use standard header/footer via common.js.
9. No ad slots on these pages.
10. Clean, readable typography. Professional tone.
```

---

## P-14: PWA + 서비스 워커 + 최종 점검

```
Create the service worker and finalize the project.

1. sw.js — Service Worker:
   - Cache strategy: Cache First for static assets (CSS, JS, HTML)
   - Cache name: 'puzzlevault-v1'
   - Precache: index.html, global.css, all JS files, all game HTML files
   - Offline fallback: serve cached versions
   - Update: on activate, delete old caches

2. Register service worker in all HTML pages:
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.register('/sw.js');
   }

3. FINAL CHECKLIST — verify ALL pages:
   □ Every game page follows the Page Template from Rules
   □ Every game has: guide section (200+ words), FAQ (3-5 items), cross-promo
   □ Ad slots are correctly placed (sidebar, bottom, interstitial, reward where applicable)
   □ All localStorage keys use pv_ prefix
   □ Dark mode works on all pages
   □ Mobile responsive: test at 375px, 768px, 1024px widths
   □ Touch events work (pointerdown/move/up, not just mouse)
   □ Sound toggle works globally
   □ Daily Challenge shows correct day number
   □ Share buttons work (Web Share API + clipboard fallback)
   □ No console.log statements in production code
   □ All meta tags present (title, description, canonical, OG, Twitter Card)
   □ manifest.json linked in all pages
   □ Copyright-safe: no trademarked names in any file

4. Create a simple test: open each game, play one round, verify core mechanics work.

5. Performance: All game pages should load under 1 second on 3G. Total JS per page < 100KB.
```

---

## P-15: 블로그 시스템

```
Create the PuzzleVault blog system.

1. blog-data.js — Blog post registry:
   - BLOG_POSTS array containing post metadata objects:
     { slug, title, description, date, category, tags, readTime }
   - getBlogPosts(count, category) — return posts sorted by date (newest first), optional category filter
   - getRelatedPosts(currentSlug, count) — return posts with matching tags, excluding current
   - getRelatedGames(tags) — return game cards for games matching tag names (e.g., tag 'numvault' → NumVault card)

2. blog/index.html — Blog listing page:
   - Header with nav (via common.js, "Blog" link highlighted)
   - Page title: "📝 PuzzleVault Blog"
   - Category filter tabs: All | Tips | Strategy | Updates | Science
   - Post cards in responsive grid (1 column mobile, 2 tablet, 3 desktop):
     - Each card: title, description (2-line truncate), date, category badge, read time, [Read →] link
   - Cards rendered dynamically from blog-data.js BLOG_POSTS array
   - Pagination: show 9 posts per page, [Load More] button at bottom
   - `<div class="ad-slot" id="ad-bottom">` — Bottom ad
   - Footer (via common.js)
   - SEO: title "PuzzleVault Blog — Puzzle Tips, Strategies & Brain Science"

3. blog/posts/_template.html — Blog post template:
   Create a reusable post template with these sections in order:
   a. `<head>`: global.css, unique meta tags, Schema.org BlogPosting JSON-LD, OG tags, canonical URL
   b. Header with nav (via common.js)
   c. Post header: category badge + H1 title + date + read time
   d. Post body: `<article class="blog-content">` with prose styling
      - Wider max-width than games (700px)
      - Good typography: line-height 1.8, paragraph spacing, styled blockquotes
      - Image support: `<figure><img><figcaption>` with responsive sizing
      - Code blocks: styled `<pre><code>` (for strategy notation if needed)
   e. `<div class="ad-slot" id="ad-mid">` — Mid-content ad
   f. Related games section: "🎮 Try These Games" — 2-3 game cards based on post tags
   g. Related posts section: "📖 Read More" — 2-3 posts from same category
   h. `<div class="ad-slot" id="ad-bottom">` — Bottom ad
   i. Footer (via common.js)

4. Create 3 initial blog posts to seed the blog:

   Post 1: blog/posts/5-tips-to-boost-your-brain-with-puzzles.html
   - Title: "5 Science-Backed Ways Puzzle Games Boost Your Brain"
   - Category: science
   - Tags: ['memory', 'patternpop', 'numvault', 'brain']
   - Content: 600-800 words about cognitive benefits of puzzles
   - Internal links: PatternPop (memory), NumVault (logic), QuickCalc (speed)

   Post 2: blog/posts/gridsmash-beginner-strategy-guide.html
   - Title: "GridSmash Beginner's Guide: Score 10,000+ Every Time"
   - Category: strategy
   - Tags: ['gridsmash', 'strategy', 'tips']
   - Content: 600-800 words with placement tips, Shatter Zone strategy, special block usage
   - Internal links: GridSmash (main), HexMatch (similar), MergeChain (similar)

   Post 3: blog/posts/daily-challenge-streak-tips.html
   - Title: "How to Build a 30-Day Daily Challenge Streak"
   - Category: tips
   - Tags: ['daily', 'numvault', 'gridsmash', 'colorflow', 'streak']
   - Content: 600-800 words about habit building, game-specific daily tips
   - Internal links: NumVault, GridSmash, ColorFlow (all have Daily mode)

5. Register all 3 posts in blog-data.js BLOG_POSTS array.

6. Update common.js renderBlogCards(count, category) to render blog cards on the landing page.

7. SEO: Each post gets unique title, meta description, canonical URL, BlogPosting JSON-LD.

8. How to add future posts (document this in a comment at the top of blog-data.js):
   Step 1: Create /blog/posts/[slug].html (copy from _template.html)
   Step 2: Write post content inside <article class="blog-content">
   Step 3: Add entry to BLOG_POSTS array in blog-data.js
   Step 4: Update sitemap.xml with new URL
   That's it — blog listing page auto-updates.
```

---

## 프롬프트 사용 순서 요약

```
Phase 1 — 기초 (P-01 ~ P-02)
  P-01: 폴더 구조 + 공유 파일 (global.css, JS modules)
  P-02: 메인 랜딩 페이지

Phase 2 — MVP 게임 3개 (P-03 ~ P-05)
  P-03: NumVault (숫자 금고)
  P-04: GridSmash (블록 배치)
  P-05: PatternPop (패턴 기억)
  → 여기서 AdSense 신청 가능

Phase 3 — 확장 게임 3개 (P-06 ~ P-08)
  P-06: SortStack (색상 정렬)
  P-07: QuickCalc (순간 암산)
  P-08: TileTurn (타일 뒤집기)

Phase 4 — 나머지 게임 4개 (P-09 ~ P-12)
  P-09: ColorFlow (색상 경로)
  P-10: PipeLink (회로 연결)
  P-11: MergeChain (숫자 합치기)
  P-12: HexMatch (육각형 매칭)

Phase 5 — 마무리 (P-13 ~ P-15)
  P-13: 정적 페이지 + sitemap
  P-14: PWA + 서비스 워커 + 최종 점검
  P-15: 블로그 시스템 + 초기 글 3개
```
