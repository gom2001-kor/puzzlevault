# PuzzleVault i18n 구현 프롬프트 — Phase 1 & Phase 2 (UX 개선)

> **사용법**: 이 프롬프트 전체를 새 대화에 붙여넣어 주세요.
> **예상 소요**: 약 3~4시간
> **목표**: 클라이언트 사이드 다국어 UI 지원 (5개 언어)

---

지금부터 너는 다음 두 파일의 내용을 숙지하고 이 프로젝트를 완벽하게 분석한 후 아래 작업을 수행해줘:
- C:\Users\brain\OneDrive\바탕 화면\vibe coding\puzzlevault\.agent\rules\puzzlevault-rules.md
- C:\Users\brain\OneDrive\바탕 화면\vibe coding\puzzlevault\.agent\skills\puzzlevault-skills\SKILL.md

⚠️ 중요: puzzlevault-rules.md의 "## Language" 섹션에 "All UI text and content in English"이라고 되어 있지만, 이번 작업에서는 **다국어(i18n) 지원을 추가하는 것이 목적**이므로 이 규칙은 무시하고, 작업 완료 후 해당 섹션을 다국어 지원으로 업데이트해줘.



===========================================================
# Phase 1: i18n 인프라 구축
===========================================================

## 1-1. js/i18n.js 생성 — 번역 엔진

새 파일 `js/i18n.js`를 생성해. 아래 명세대로 구현해:

```javascript
const I18n = {
  currentLang: 'en',
  translations: {},
  supportedLangs: [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ],

  async init() {
    // 1. localStorage 확인
    const saved = localStorage.getItem('pv_lang');
    if (saved && this.supportedLangs.some(l => l.code === saved)) {
      this.currentLang = saved;
    } else {
      // 2. 브라우저 언어 자동 감지
      const browserLang = (navigator.language || navigator.userLanguage || 'en').slice(0, 2).toLowerCase();
      const match = this.supportedLangs.find(l => l.code === browserLang);
      this.currentLang = match ? match.code : 'en';
    }
    // 3. 언어 파일 로드
    await this.loadLang(this.currentLang);
    // 4. 페이지에 적용
    this.applyAll();
    // 5. html lang 속성 변경
    document.documentElement.lang = this.currentLang;
  },

  async loadLang(langCode) {
    // ⚠️ 중요: 절대 경로 사용 (상대 경로 depth 감지 버그 방지)
    try {
      const resp = await fetch('/lang/' + langCode + '.json');
      if (!resp.ok) throw new Error('Language file not found');
      this.translations = await resp.json();
      this.currentLang = langCode;
    } catch (e) {
      console.warn('i18n: Failed to load ' + langCode + ', falling back to en');
      if (langCode !== 'en') {
        const resp = await fetch('/lang/en.json');
        this.translations = await resp.json();
        this.currentLang = 'en';
      }
    }
  },

  t(key, replacements) {
    // 점(.) 구분자로 중첩 키 접근: "common.playAgain" → translations.common.playAgain
    const keys = key.split('.');
    let result = this.translations;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key; // 키를 못 찾으면 키 자체를 반환 (fallback)
      }
    }
    // 치환: t('game.zone', { turns: 3 }) → "Zone: 3 turns left"
    if (typeof result === 'string' && replacements) {
      for (const [k, v] of Object.entries(replacements)) {
        result = result.replace(new RegExp('\\{' + k + '\\}', 'g'), v);
      }
    }
    return result;
  },

  applyAll() {
    // data-i18n 속성이 있는 모든 요소의 텍스트 번역
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = this.t(key);
      if (typeof translated === 'string') {
        el.textContent = translated;
      }
    });

    // data-i18n-html 속성 (innerHTML 번역, HTML 포함 텍스트용)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const translated = this.t(key);
      if (typeof translated === 'string') {
        el.innerHTML = translated;
      }
    });

    // data-i18n-placeholder (input 플레이스홀더)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
    });

    // data-i18n-title (툴팁)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = this.t(el.getAttribute('data-i18n-title'));
    });

    // 메타 태그 번역
    const metaDesc = document.querySelector('meta[name="description"]');
    const i18nDesc = document.querySelector('meta[data-i18n-content]');
    if (i18nDesc && metaDesc) {
      metaDesc.content = this.t(i18nDesc.getAttribute('data-i18n-content'));
    }

    // 페이지 타이틀 번역
    const titleKey = document.documentElement.getAttribute('data-i18n-title');
    if (titleKey) {
      document.title = this.t(titleKey);
    }

    // data-lang 속성으로 블로그 포스트 등의 언어별 콘텐츠 전환
    document.querySelectorAll('[data-lang]').forEach(el => {
      el.style.display = el.getAttribute('data-lang') === this.currentLang ? '' : 'none';
    });
  },

  async switchLang(langCode) {
    if (langCode === this.currentLang) return;
    localStorage.setItem('pv_lang', langCode);
    this.currentLang = langCode;
    await this.loadLang(langCode);
    this.applyAll();
    document.documentElement.lang = langCode;
    // 게임별 JS가 반응할 수 있도록 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: langCode } }));
  },

  formatNumber(n) {
    return n.toLocaleString(this.currentLang);
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(this.currentLang, { year: 'numeric', month: 'short', day: 'numeric' });
  }
};
```

## 1-2. lang/en.json 생성 — 영어 번역 파일

⚠️ 중요: 아래의 JSON 구조를 **정확히** 따라서 `lang/en.json`을 생성해. 이 구조가 다른 4개 언어의 기준이 됨.

```json
{
  "common": {
    "home": "Home",
    "games": "Games",
    "blog": "Blog",
    "about": "About",
    "contact": "Contact",
    "privacy": "Privacy",
    "terms": "Terms",
    "settings": "Settings",
    "stats": "Stats",
    "help": "Help",
    "close": "Close",
    "share": "Share",
    "playAgain": "Play Again",
    "playNow": "Play Now",
    "play": "Play",
    "loading": "Loading…",
    "copiedToClipboard": "Copied to clipboard!",
    "score": "Score",
    "bestScore": "Best",
    "time": "Time",
    "level": "Level",
    "round": "Round",
    "lives": "Lives",
    "moves": "Moves",
    "turns": "Turns",
    "combo": "Combo",
    "streak": "Streak",
    "daily": "Daily",
    "freePlay": "Free Play",
    "classic": "Classic",
    "easy": "Easy",
    "normal": "Normal",
    "hard": "Hard",
    "expert": "Expert",
    "perfect": "Perfect!",
    "clear": "Clear!",
    "gameOver": "Game Over",
    "youWin": "You Win!",
    "tryAgain": "Try Again",
    "newGame": "New Game",
    "undo": "Undo",
    "reset": "Reset",
    "hint": "Hint",
    "pause": "Pause",
    "resume": "Resume",
    "mute": "Mute",
    "unmute": "Unmute",
    "on": "ON",
    "off": "OFF",
    "yes": "Yes",
    "no": "No",
    "ok": "OK",
    "cancel": "Cancel",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "soundOn": "Sound On",
    "soundOff": "Sound Off",
    "darkMode": "Dark Mode",
    "lightMode": "Light Mode",
    "difficulty": "Difficulty",
    "mode": "Mode",
    "copyright": "© 2026 PuzzleVault. All rights reserved.",
    "footerDesc": "Free browser puzzles. No download. No account needed.",
    "watchAdHint": "Watch a short ad to reveal a hint?",
    "watchAdUndo": "Watch ad to undo last move?",
    "watchAdLife": "Watch ad for an extra life?",
    "adFreeNote": "Enjoy — first 3 games are ad-free!",
    "tryAnotherPuzzle": "Try Another Puzzle",
    "viewAll": "View All",
    "readMore": "Read →",
    "minuteRead": "{min} min read",
    "percentile": "Top {pct}%",
    "startPlaying": "Start Playing",
    "days": "days"
  },

  "landing": {
    "title": "PuzzleVault — Free Online Puzzle Games",
    "metaDesc": "Play 10 free brain puzzle games directly in your browser. No download, no account needed. Daily challenges, score tracking, and more.",
    "hero": "Free Brain Puzzles — No Download Needed",
    "heroSub": "Challenge your mind with 10 unique puzzle games. Play directly in your browser.",
    "dailyHeading": "📅 Today's Daily Challenges",
    "dailySub": "Fresh puzzles every day — can you keep your streak alive?",
    "streakBadge": "🔥 Your Streak: {count} days",
    "allGamesHeading": "🎮 All Games",
    "allGamesSub": "10 unique puzzles — pick your favorite",
    "playBtn": "Play ▸",
    "blogHeading": "📝 Latest from the Blog",
    "blogSub": "Tips, strategies, and brain science",
    "viewAllPosts": "View All Posts →",
    "statsHeading": "📊 Your Stats",
    "statsSub": "Track your progress across all games",
    "totalScore": "TOTAL SCORE",
    "gamesPlayed": "GAMES PLAYED",
    "bestStreak": "BEST STREAK",
    "favoriteGame": "FAVORITE GAME"
  },

  "games": {
    "numvault": {
      "tagline": "Crack the secret number code",
      "metaDesc": "Can you crack the hidden number code? NumVault is a free number deduction puzzle with daily challenges.",
      "winTitle": "🔓 Vault Cracked!",
      "loseTitle": "🔒 Vault Sealed",
      "attempts": "Attempts",
      "speedMode": "Speed Mode",
      "numberTracker": "Number Tracker",
      "guide": "NumVault is a number deduction puzzle inspired by classic code-breaking games. Your goal is to guess the hidden number code within a limited number of attempts. After each guess, you receive color-coded feedback for every digit: green means the digit is correct and in the right position, yellow means the digit exists in the code but is in the wrong spot, and dark means the digit is not in the code at all. Use the Number Tracker to keep track of which digits have been confirmed, included, or eliminated. Start with common digits and use process of elimination. In Speed Mode, race against the clock to solve as many codes as possible. Each correct answer earns bonus time. Can you crack the vault?",
      "faq1q": "How does the feedback work?",
      "faq1a": "Green = correct digit in correct position. Yellow = digit exists but in wrong position. Dark = digit not in the code. Use these clues to narrow down the answer.",
      "faq2q": "What is the Number Tracker?",
      "faq2a": "The Number Tracker displays the status of each digit (0-9) below the grid. It shows whether each digit has been confirmed, is possibly included, has been eliminated, or hasn't been used yet.",
      "faq3q": "What is Speed Mode?",
      "faq3a": "Speed Mode gives you 60 seconds to solve as many codes as possible. Each correct answer adds 15 seconds to your timer.",
      "faq4q": "How is the Daily Challenge different?",
      "faq4a": "Everyone gets the same puzzle each day. Your results show a streak count and can be shared with friends.",
      "faq5q": "Can I use hints?",
      "faq5a": "Yes! Tap the hint button to watch a short reward ad and reveal one digit's correct position. Limited to 1 per Daily game and 2 per Free Play game."
    },
    "gridsmash": {
      "tagline": "Place blocks, clear lines, chase combos",
      "metaDesc": "GridSmash is a free block placement puzzle. Clear lines, trigger combos, and use special blocks for massive scores.",
      "shatterZone": "Shatter Zone",
      "zoneCounter": "Zone: {turns} turns left",
      "linesCleared": "Lines",
      "bestCombo": "Best Combo",
      "zenMode": "Zen Mode",
      "guide": "GridSmash is a strategic block placement puzzle. Each turn, you receive three block pieces to place on a 10×10 grid. Drag and drop pieces into valid positions. When an entire row or column is filled, it clears and earns points. Clearing multiple lines at once triggers combos for bonus points. Watch for special blocks: Crystal blocks clear a 3×3 area, Frost blocks freeze cells that require two clears to remove, and Wild blocks fill any single gap. Every 10 turns, the Shatter Zone activates on the bottom rows — clear lines there for triple points, but hurry before the zone expires and fills with random blocks!",
      "faq1q": "How do special blocks work?",
      "faq1a": "Crystal (💎) clears a 3×3 area around it. Frost (🧊) freezes 2 random cells that take 2 line clears to remove. Wild (⭐) is a 1×1 block you can place on any empty cell.",
      "faq2q": "What is the Shatter Zone?",
      "faq2a": "Every 10 turns, the bottom 2 rows glow gold. Line clears in this zone earn 3× points. The zone lasts 5 turns — if you don't clear it, those rows partially fill with random blocks.",
      "faq3q": "When is the game over?",
      "faq3a": "The game ends when you receive 3 new pieces but none of them can fit anywhere on the grid.",
      "faq4q": "What is Zen Mode?",
      "faq4a": "Zen Mode removes the timer, score, and Shatter Zone. It's a relaxed way to play without any pressure — perfect for unwinding."
    },
    "patternpop": {
      "tagline": "How sharp is your memory?",
      "metaDesc": "Test your visual memory with PatternPop. Memorize flashing patterns and tap them back. Beware of decoy flashes!",
      "memorize": "Memorize!",
      "tapNow": "Your turn!",
      "decoyWarning": "Watch out for decoys!",
      "livesLeft": "{n} lives left",
      "roundX": "Round {n}",
      "guide": "PatternPop is a visual memory challenge. Each round, several cells on the grid briefly light up. Memorize their positions, then tap them from memory. Get them all right to advance to the next round with more cells to remember. You have 3 lives — each wrong tap costs one. Starting from Round 10, decoy flashes appear briefly alongside the real pattern. Decoys are lighter in color and shorter in duration. Stay focused to tell real from fake. How many rounds can you survive?",
      "faq1q": "What are decoy flashes?",
      "faq1a": "From Round 10, extra cells flash briefly (0.3 seconds) in a lighter color alongside the real targets. They're designed to trick you — ignore them and focus on the cells that stay lit longer.",
      "faq2q": "How do I get more lives?",
      "faq2a": "You start with 3 lives. When you lose all of them, you can watch a short ad to get 1 extra life and continue from the current round.",
      "faq3q": "How is scoring calculated?",
      "faq3a": "Score increases with the number of cells memorized and the round number. You earn a bonus for completing a round without losing lives, plus extra points for ignoring decoys."
    },
    "sortstack": {
      "tagline": "Sort the colors into stacks",
      "metaDesc": "SortStack is a free color sorting puzzle. Move blocks between stacks to group colors. Can you solve it in minimum moves?",
      "locked": "Locked! 🔒",
      "moveCounter": "Moves: {current}/{max}",
      "movesUnlimited": "Moves: {current}",
      "levelComplete": "Level Complete!",
      "levelFailed": "Out of moves!",
      "guide": "SortStack is a color sorting puzzle. You see several stacks (drawers) filled with colored blocks. Your goal is to sort them so each stack contains only one color. You can only move the top block from any stack, and it can only be placed on the same color or an empty stack. When a stack is complete (4 matching blocks), it locks and a new empty stack appears. In Hard and Expert modes, you have a limited number of moves. Plan your moves carefully! Unlimited undo is available.",
      "faq1q": "What is Lock Stack?",
      "faq1a": "When you complete a stack of 4 matching colored blocks, it locks with a sparkle effect and a new empty stack appears, giving you more workspace.",
      "faq2q": "Is there a move limit?",
      "faq2a": "Easy and Medium have unlimited moves. Hard allows 40 moves and Expert allows 50 moves per level.",
      "faq3q": "Can I undo moves?",
      "faq3a": "Yes, the undo button is free and unlimited. Tap it as many times as you need."
    },
    "quickcalc": {
      "tagline": "Race against time with mental math",
      "metaDesc": "QuickCalc is a speed math game. Solve problems against the clock. Can you handle the Operator Roulette?",
      "timeLeft": "Time",
      "operatorRoulette": "Operator Roulette",
      "comboX": "🔥 Combo ×{n}",
      "correct": "Correct!",
      "wrong": "Wrong!",
      "timesUp": "Time's Up!",
      "guide": "QuickCalc is a fast-paced mental math game. You start with 30 seconds on the clock. Each correct answer adds 2 seconds, but each wrong answer costs 3 seconds. Questions get progressively harder as you advance. Starting from question 15, Operator Roulette kicks in — instead of solving a calculation, you see an equation like '7 ? 3 = 21' and must figure out the missing operator. Build combos by answering correctly in a row for extra time bonuses. How high can you score before time runs out?",
      "faq1q": "What is Operator Roulette?",
      "faq1a": "From question 15, some problems show 'A ? B = C' where you must pick the correct operator (+, -, ×, ÷) instead of calculating an answer.",
      "faq2q": "How does the combo system work?",
      "faq2a": "Answer 3 in a row for +3 bonus seconds per correct answer. 5 in a row gives +4s, and 10+ gives +5s. Any wrong answer resets your combo.",
      "faq3q": "Does the difficulty increase?",
      "faq3a": "Yes, automatically. Early questions are simple single-digit addition. By question 20+, you'll face multi-digit multiplication and mixed operations."
    },
    "tileturn": {
      "tagline": "Flip tiles to light them all",
      "metaDesc": "TileTurn is a tile-flipping puzzle with 3 unique modes: Classic, Cascade, and Spectrum. Solve puzzles with logical thinking.",
      "cascadeMode": "Cascade",
      "spectrumMode": "Spectrum",
      "tapsUsed": "Taps: {n}",
      "minTaps": "Min: {n}",
      "stars3": "⭐⭐⭐ Perfect!",
      "stars2": "⭐⭐ Great!",
      "stars1": "⭐ Cleared",
      "packX": "Pack {n}",
      "levelX": "Level {n}",
      "guide": "TileTurn is a logical tile-flipping puzzle. In Classic mode, tap a tile to toggle it and its four neighbors between ON and OFF. Your goal is to turn all tiles ON. Cascade mode adds a second layer — the toggle effect spreads two steps outward, affecting up to 13 tiles per tap. In Spectrum mode, tiles cycle through three colors instead of two. Tapping advances tiles to the next color. Your goal is to make all tiles the same color. Each level has a minimum number of taps to solve. Achieve that minimum for 3 stars!",
      "faq1q": "What is Cascade mode?",
      "faq1a": "The toggle effect spreads 2 levels deep. When you tap a tile, it and its 4 neighbors toggle (level 1), then THEIR neighbors also toggle (level 2). Up to 13 tiles can change from a single tap.",
      "faq2q": "What is Spectrum mode?",
      "faq2a": "Instead of ON/OFF, tiles cycle through 3 colors: red → amber → blue → red. The goal is to make all tiles the same color. Much trickier than Classic!",
      "faq3q": "How do I get 3 stars?",
      "faq3a": "Solve the puzzle in the minimum number of taps. 2 stars for minimum +1~2, and 1 star for anything more."
    },
    "colorflow": {
      "tagline": "Connect matching colors, fill the grid",
      "metaDesc": "ColorFlow is a free path-connection puzzle. Link matching color pairs and fill every cell. Over 240 levels!",
      "coverage": "Coverage: {pct}%",
      "flowBonus": "Flow Bonus!",
      "connected": "connected",
      "allFlows": "All flows connected!",
      "guide": "ColorFlow is a path-connection puzzle. Each grid has pairs of matching colored diamond markers. Draw paths to connect each pair by dragging horizontally or vertically. Paths cannot overlap. Fill every empty cell for a Perfect rating. The Flow Bonus rewards efficient paths — keep your path length within 1.5× the shortest possible distance for bonus points. Start with small 5×5 grids and work your way up to mind-bending 14×14 puzzles across 8 level packs.",
      "faq1q": "How do I earn 3 stars?",
      "faq1a": "Achieve 100% coverage — connect all pairs AND fill every empty cell with paths. 2 stars for 80%+ coverage, 1 star for just connecting all pairs.",
      "faq2q": "What is the Flow Bonus?",
      "faq2a": "If your path for a color pair is shorter than 1.5× the shortest possible route, you earn a bonus. Draw efficient paths!",
      "faq3q": "Can I redo a path?",
      "faq3a": "Yes, tap on a connected marker to erase its path. You can also draw over existing paths to overwrite them."
    },
    "pipelink": {
      "tagline": "Route energy through the circuit",
      "metaDesc": "PipeLink is a circuit connection puzzle. Rotate tiles to connect the energy source to its destination. Features dual sources and locked tiles!",
      "source": "Source",
      "destination": "Destination",
      "dualSource": "Dual Source",
      "lockedTile": "Locked 🔒",
      "rotations": "Rotations: {n}",
      "energyConnected": "Energy Connected!",
      "guide": "PipeLink is a circuit connection puzzle with a sleek circuit-board theme. Your job is to rotate tile pieces so that the energy source (⚡) connects to the destination (🔋) through a complete path. Tap any tile to rotate it 90° clockwise. Double-tap for 180°. From Pack 4, Dual Source puzzles introduce two separate paths that must both be connected simultaneously. From Pack 5, some tiles are locked and cannot be rotated — you must work around them. Connect all tiles for a Perfect rating!",
      "faq1q": "How do I rotate tiles?",
      "faq1a": "Tap a tile once for 90° clockwise rotation. Double-tap for 180°. Locked tiles (🔒) cannot be rotated.",
      "faq2q": "What is Dual Source?",
      "faq2a": "Starting from Pack 4, puzzles have 2 sources and 2 destinations (A and B). You must connect A→A and B→B simultaneously. Paths can share cross tiles.",
      "faq3q": "What are locked tiles?",
      "faq3a": "From Pack 5, some tiles have a lock icon and cannot be rotated. You must solve the puzzle by rotating only the unlocked tiles."
    },
    "mergechain": {
      "tagline": "Drop and merge numbers to 2048",
      "metaDesc": "MergeChain is a number-merging drop game. Combine matching balls to reach 2048! Simple physics, endless strategy.",
      "nextBall": "Next",
      "dropHere": "Tap to drop",
      "chainX": "Chain ×{n}!",
      "dangerLine": "Danger!",
      "timeAttack": "Time Attack",
      "guide": "MergeChain is a number-merging drop game. Position numbered balls along the top and release them. When two balls with the same number touch, they merge into the next number (2+2=4, 4+4=8, all the way to 2048). Chain reactions happen when a newly merged ball immediately touches another of the same number — plan your drops to set up chains for massive points. Watch the danger line at the top — if balls stack above it, the game is over. In Time Attack mode, you have 2 minutes to score as high as possible.",
      "faq1q": "What numbers can I drop?",
      "faq1a": "New balls are randomly 2, 4, or 8. Higher numbers only appear through merging.",
      "faq2q": "How do chain reactions work?",
      "faq2a": "If ball A+A merge into B, and that B touches an existing B, they immediately merge into C. The chain multiplier increases your score.",
      "faq3q": "When is the game over?",
      "faq3a": "When any ball crosses the danger line at the top of the field."
    },
    "hexmatch": {
      "tagline": "Match hex tiles in chain reactions",
      "metaDesc": "HexMatch is a hexagonal color matching puzzle. Connect same-colored tiles, trigger hex bombs, and survive the rising tide!",
      "hexBomb": "Hex Bomb! 💣",
      "risingTide": "Rising Tide in {n} turns",
      "rainbow": "Rainbow ⭐",
      "guide": "HexMatch is a hexagonal color matching game. Drag across adjacent tiles of the same color to connect 3 or more, then release to remove them. New tiles fall from above. Connect 5 or more to create a Hex Bomb — tap it on your next turn to explode all tiles within a 2-ring radius! Every 8 turns, the Rising Tide pushes a new row up from the bottom. If tiles reach the top, the game is over. Watch for Rainbow tiles that match any color. Build long chains and use bombs strategically to survive!",
      "faq1q": "How do Hex Bombs work?",
      "faq1a": "Connect 5+ same-color tiles to create a bomb at the center. On your next turn, tap the bomb to destroy all tiles within 2 rings around it (up to 12 tiles).",
      "faq2q": "What is Rising Tide?",
      "faq2a": "Every 8 turns, a new row of tiles pushes up from the bottom. This gradually fills the board. Clear tiles efficiently to survive!",
      "faq3q": "What are Rainbow tiles?",
      "faq3a": "Rainbow tiles (⭐) match any color. They appear every 8 turns randomly and are very useful for making longer chains."
    }
  },

  "blog": {
    "title": "PuzzleVault Blog — Puzzle Tips, Strategies & Brain Science",
    "heading": "📝 PuzzleVault Blog",
    "all": "All",
    "tips": "Tips",
    "strategy": "Strategy",
    "updates": "Updates",
    "science": "Science",
    "loadMore": "Load More",
    "noResults": "No posts found in this category.",
    "tryTheseGames": "🎮 Try These Games",
    "readMorePosts": "📖 Read More"
  },

  "pages": {
    "aboutTitle": "About PuzzleVault",
    "aboutContent": "PuzzleVault is a collection of 10 free brain puzzle games that run entirely in your browser. No downloads. No accounts. No personal data collected. Just pure puzzle fun. Every game features daily challenges, score tracking, and unique mechanics you won't find anywhere else. Built with love using vanilla HTML, CSS, and JavaScript.",
    "privacyTitle": "Privacy Policy",
    "privacyIntro": "Your privacy matters to us. Here's what you need to know:",
    "privacyNoData": "We do not collect any personal data. No accounts, no sign-ups, no tracking.",
    "privacyLocalStorage": "Game progress is saved locally in your browser using localStorage. This data never leaves your device.",
    "privacyAds": "Google AdSense displays ads on this site and may use cookies. For details, see Google's privacy policy.",
    "privacyCookies": "This site uses no first-party cookies. Third-party ad cookies are managed by Google.",
    "termsTitle": "Terms of Service",
    "termsContent": "PuzzleVault games are provided free of charge, as-is, with no warranties. The PuzzleVault name, logo, and original game designs are copyrighted. You're welcome to play and share your scores. Don't copy or redistribute our code or designs.",
    "contactTitle": "Contact Us",
    "contactIntro": "Found a bug? Have a suggestion? We'd love to hear from you.",
    "contactThanks": "Responses are reviewed regularly. Thank you for helping us improve!"
  }
}
```

## 1-3. 나머지 4개 언어 JSON 파일 생성

위의 en.json 구조를 기반으로 다음 4개 파일을 생성해:
- `lang/ko.json` — 한국어
- `lang/ja.json` — 일본어
- `lang/zh.json` — 중국어 간체
- `lang/es.json` — 스페인어

### 번역 품질 규칙 (절대 타협 없이 지킬 것):

1. **게임 이름은 절대 번역하지 마**: NumVault, GridSmash, PatternPop, SortStack, QuickCalc, TileTurn, ColorFlow, PipeLink, MergeChain, HexMatch, PuzzleVault는 그대로
2. **이모지는 그대로 유지**
3. **한국어**: 존댓말(~합니다, ~습니다) 사용. 게임 UI 용어는 친근하되 존중하는 톤. 가이드는 한국 모바일 게임 튜토리얼 느낌으로 자연스럽게.
4. **일본어**: です/ます形 사용. 게임 용어는 카타카나 적절히 사용 (コンボ, ストリーク, ヒント 등). 자연스러운 일본어.
5. **중국어**: 简体中文 사용. 중국 대륙 스타일의 자연스러운 표현.
6. **스페인어**: 지시/안내문에서 formal usted 사용. 자연스러운 관용적 스페인어.
7. **모든 키를 빠짐없이 번역할 것**. en.json의 모든 키에 대응하는 번역이 있어야 함.
8. **직역 금지**: 자연스러운 현지어 표현 사용. 관용구는 해당 언어의 관용구로 적응시킬 것.

## 1-4. CSS 추가 — 언어 셀렉터 스타일

`css/global.css` 파일 끝에 다음 CSS를 추가해:

```css
/* === Language Selector === */
.lang-selector { position: relative; }
.lang-btn {
  background: transparent; border: 1px solid var(--pv-border);
  border-radius: var(--pv-radius-sm); padding: 4px 10px;
  cursor: pointer; display: flex; align-items: center; gap: 4px;
  font-size: 0.85rem; color: var(--pv-text);
  transition: all 0.2s ease;
}
.lang-btn:hover { border-color: var(--pv-blue); }
.lang-arrow { font-size: 0.7rem; }
.lang-dropdown {
  display: none; position: absolute; top: 100%; right: 0;
  background: var(--pv-card-bg); border: 1px solid var(--pv-border);
  border-radius: var(--pv-radius-sm); box-shadow: var(--pv-shadow-lg);
  min-width: 150px; z-index: 1000; margin-top: 4px;
  overflow: hidden;
}
.lang-dropdown.open { display: block; }
.lang-option {
  padding: 8px 12px; cursor: pointer; display: flex;
  align-items: center; gap: 8px; font-size: 0.9rem;
  transition: background 0.15s ease;
}
.lang-option:hover { background: var(--pv-grid-bg); }
.lang-option.active { font-weight: 700; color: var(--pv-blue); }
```

## 1-5. common.js 수정

### 수정 1: renderHeader()에 언어 셀렉터 추가

`renderHeader()` 함수에서 nav와 toggle 사이에 언어 셀렉터를 추가해:

```javascript
// 언어 셀렉터
const langSelector = document.createElement('div');
langSelector.className = 'lang-selector';

const langBtn = document.createElement('button');
langBtn.className = 'lang-btn';
langBtn.id = 'lang-toggle';
const currentLangInfo = I18n.supportedLangs.find(l => l.code === I18n.currentLang) || I18n.supportedLangs[0];
langBtn.innerHTML = `<span id="lang-current-flag">${currentLangInfo.flag}</span><span id="lang-current-code">${currentLangInfo.code.toUpperCase()}</span><span class="lang-arrow">▾</span>`;

const langDropdown = document.createElement('div');
langDropdown.className = 'lang-dropdown';
langDropdown.id = 'lang-dropdown';

I18n.supportedLangs.forEach(lang => {
    const option = document.createElement('div');
    option.className = 'lang-option' + (lang.code === I18n.currentLang ? ' active' : '');
    option.textContent = lang.flag + ' ' + lang.name;
    option.addEventListener('click', async () => {
        await I18n.switchLang(lang.code);
        // 헤더/푸터 재렌더링
        renderHeader();
        renderFooter();
        // 드롭다운 닫기
        langDropdown.classList.remove('open');
    });
    langDropdown.appendChild(option);
});

langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('open');
});

// 외부 클릭 시 드롭다운 닫기
document.addEventListener('click', () => langDropdown.classList.remove('open'));

langSelector.appendChild(langBtn);
langSelector.appendChild(langDropdown);
```

inner에 추가 순서: logo → nav → langSelector → toggle

### 수정 2: renderHeader() 네비게이션 라벨을 I18n.t() 사용

```javascript
// 기존: a.textContent = link.label;
// 변경:
const NAV_LINKS = [
    { i18nKey: 'common.home', href: '/' },
    { i18nKey: 'common.games', href: '/#games' },
    { i18nKey: 'common.blog', href: '/blog/' },
    { i18nKey: 'common.about', href: '/about.html' },
];
// ...
a.textContent = I18n.t(link.i18nKey);
```

### 수정 3: renderFooter() 라벨을 I18n.t() 사용

```javascript
const footerLinks = [
    { i18nKey: 'common.about', href: '/about.html' },
    { i18nKey: 'common.privacy', href: '/privacy.html' },
    { i18nKey: 'common.terms', href: '/terms.html' },
    { i18nKey: 'common.contact', href: '/contact.html' },
    { i18nKey: 'common.blog', href: '/blog/' },
];
// ...
a.textContent = I18n.t(link.i18nKey);
// ...
copy.textContent = I18n.t('common.copyright');
```

### 수정 4: renderCrossPromo() 헤딩을 I18n.t() 사용

```javascript
// 기존: container.innerHTML = '<h2>🎮 Try Another Puzzle</h2>';
// 변경:
container.innerHTML = '<h2>🎮 ' + I18n.t('common.tryAnotherPuzzle') + '</h2>';
```

### 수정 5: initPage()를 async로 변경

```javascript
async function initPage() {
    await I18n.init(); // ⚠️ 반드시 가장 먼저 호출
    renderHeader();
    renderFooter();
    // ... 나머지 기존 코드 유지
}
```

### 수정 6: renderBlogCards()에서 I18n.t() 사용

```javascript
// readTime 표시 부분:
// 기존: `${post.readTime} min read`
// 변경:
I18n.t('common.minuteRead', { min: post.readTime })
```

## 1-6. share.js 수정

`copyToClipboard()` 함수에서 하드코딩된 문자열을 I18n.t()로 교체:

```javascript
// 기존: showToast('Copied to clipboard!');
// 변경:
showToast(typeof I18n !== 'undefined' ? I18n.t('common.copiedToClipboard') : 'Copied to clipboard!');
```

## 1-7. 모든 HTML 파일에 i18n.js 스크립트 태그 추가

모든 HTML 파일의 `<script>` 섹션에서 `common.js`보다 **앞에** 다음을 추가:

```html
<script src="/js/i18n.js"></script>
```

대상 파일:
- index.html
- about.html, privacy.html, terms.html, contact.html
- games/numvault.html ~ games/hexmatch.html (10개)
- blog/index.html
- blog/posts/*.html (5개)

===========================================================
# Phase 2: 모든 페이지에 data-i18n 적용
===========================================================

## 2-1. index.html에 data-i18n 속성 추가

패턴:
```html
<!-- 기존 -->
<h1 class="hero-tagline">Free Brain Puzzles — No Download Needed</h1>
<!-- 변경 -->
<h1 class="hero-tagline" data-i18n="landing.hero">Free Brain Puzzles — No Download Needed</h1>
```

적용 대상:
- `<html>` 태그에 `data-i18n-title="landing.title"` 추가
- `<meta name="description">`에 `data-i18n-content="landing.metaDesc"` 추가
- Hero: 타이틀, 서브텍스트, CTA 버튼
- Daily Challenges 섹션 헤딩
- All Games 섹션 헤딩
- Blog 섹션 헤딩, "View All Posts" 링크
- Stats 섹션: 헤딩, 4개 stat-label (TOTAL SCORE 등)
- 인라인 `<script>`의 동적 텍스트도 I18n.t() 사용:
  - GAME_DESCRIPTIONS 객체 → I18n.t('games.{id}.tagline') 사용
  - "Play Now" 버튼 → I18n.t('common.playNow')
  - "Play ▸" → I18n.t('common.play') + ' ▸'

## 2-2. 10개 게임 HTML 파일에 data-i18n 적용

각 게임 HTML 파일에서:
1. How to Play 가이드 헤딩과 본문:
   ```html
   <h2 data-i18n="games.{gameId}.guide">...</h2>
   ```
   가이드 본문의 `<p>` 텍스트에도 data-i18n 적용

2. FAQ `<summary>` 와 답변 `<p>`:
   ```html
   <summary data-i18n="games.{gameId}.faq1q">How does the feedback work?</summary>
   <p data-i18n="games.{gameId}.faq1a">Green = correct digit...</p>
   ```

3. 결과 모달의 동적 텍스트 (인라인 JS에서):
   - 승리/패배 타이틀: I18n.t('games.{gameId}.winTitle')
   - Play Again 버튼: I18n.t('common.playAgain')
   - Share 버튼: I18n.t('common.share')
   - 모드/난이도 라벨: I18n.t('common.easy'), I18n.t('common.daily') 등

4. 게임 컨트롤 라벨:
   - Score, Best, Combo, Level 등의 라벨을 I18n.t() 사용

5. 각 게임의 `-logic.js` 파일을 수정하지 않아도 되도록, HTML 내 인라인 스크립트에서 I18n.t()로 감싸는 방식 사용

## 2-3. 정적 페이지에 data-i18n 적용

about.html, privacy.html, terms.html, contact.html:
- 모든 헤딩과 본문 텍스트에 data-i18n 적용
- 키는 `pages.aboutTitle`, `pages.aboutContent` 등 사용

## 2-4. blog/index.html에 data-i18n 적용

- 블로그 헤딩, 카테고리 필터 라벨 (All, Tips, Strategy, Updates, Science)
- 키는 `blog.heading`, `blog.all`, `blog.tips` 등 사용

## 2-5. puzzlevault-rules.md 업데이트

파일 맨 끝 Language 섹션을 다음으로 변경:

```markdown
## Language
- Multilingual support: en (English, default), ko (한국어), ja (日本語), zh (中文简体), es (Español)
- Game names and PuzzleVault brand name are NEVER translated
- All games are language-independent: numbers, colors, shapes only
- UI translation via client-side i18n.js + lang/*.json files
- Language auto-detection from browser, stored in localStorage as pv_lang
```

===========================================================
# 검증 체크리스트
===========================================================

작업 완료 후 다음 항목을 모두 확인해:

- [ ] i18n.js가 생성되고 정상 작동하는지
- [ ] 5개 언어 JSON 파일이 모두 생성되고 유효한 JSON인지
- [ ] 언어 셀렉터가 헤더에 표시되는지
- [ ] 언어 전환 시 모든 data-i18n 요소가 번역되는지
- [ ] localStorage에 pv_lang이 저장되어 페이지 이동 시 유지되는지
- [ ] 브라우저 언어 자동 감지가 작동하는지
- [ ] 게임 이름(NumVault 등)이 번역되지 않는지
- [ ] 영어 폴백이 정상 작동하는지 (잘못된 언어 코드 시)
- [ ] 모든 HTML 파일에 i18n.js 스크립트가 common.js 앞에 있는지
- [ ] console 에러가 없는지
- [ ] 로컬 개발 서버에서 테스트 완료 (python -m http.server 8000)

===========================================================
# 주의사항
===========================================================

1. **경로는 반드시 절대 경로 사용**: `/lang/ko.json` (상대 경로 X)
2. **initPage()를 async로 변환** 시 DOMContentLoaded 이벤트 리스너는 그대로 유지
3. **기존 기능을 깨뜨리지 마**: 기존 게임 로직이 정상 작동해야 함
4. **I18n 객체가 로드 안 됐을 때의 폴백**: `typeof I18n !== 'undefined' ? I18n.t(...) : '기본값'`
5. **JSON 파일에 주석 넣지 마**: JSON은 주석을 허용하지 않음
6. **shareTemplate 키의 줄바꿈**: JSON 값에서 `\n`을 사용 (실제 줄바꿈 X)
