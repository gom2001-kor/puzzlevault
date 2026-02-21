---
trigger: always_on
---

# PuzzleVault — Antigravity Project Rules

## Project Overview
You are building "PuzzleVault", a free browser-based puzzle game site with 10 games. All games run 100% client-side. The site is monetized via Google AdSense with interstitial ads between games and reward ads for hints. Every game must be copyright-safe with original visual design and at least one unique mechanic not found in the reference games.

## Tech Stack (Strict)
- Pure HTML + CSS + JavaScript only. NO React, NO Vue, NO Angular, NO build tools, NO npm.
- HTML5 Canvas API for all game rendering.
- Web Audio API for sound effects (no audio files).
- localStorage for scores, settings, streaks.
- requestAnimationFrame() for 60fps game loops.
- Each game is a standalone .html file.
- Shared styles: /css/global.css
- Shared scripts: /js/common.js, /js/adsense.js, /js/seed.js, /js/sfx.js, /js/share.js, /js/blog-data.js
- NO external libraries. NO CDN imports. Everything is vanilla JS.
- Hosting: Cloudflare Pages (static files, zero server cost)

## Folder Structure
```
puzzlevault/
├── index.html                    (main landing page)
├── about.html, privacy.html, terms.html, contact.html
├── sitemap.xml, robots.txt, manifest.json, sw.js
├── css/
│   └── global.css                (design system + shared styles)
├── js/
│   ├── common.js                 (header, footer, nav, stats, cross-promo)
│   ├── adsense.js                (ad controller logic)
│   ├── seed.js                   (daily seed + SeededRandom class)
│   ├── sfx.js                    (Web Audio sound effects)
│   ├── share.js                  (clipboard + Web Share API)
│   └── blog-data.js              (blog post registry + helpers)
├── games/
│   ├── numvault.html             (Game 1)
│   ├── gridsmash.html            (Game 2)
│   ├── patternpop.html           (Game 3)
│   ├── sortstack.html            (Game 4)
│   ├── quickcalc.html            (Game 5)
│   ├── tileturn.html             (Game 6)
│   ├── colorflow.html            (Game 7)
│   ├── pipelink.html             (Game 8)
│   ├── mergechain.html           (Game 9)
│   └── hexmatch.html             (Game 10)
├── blog/
│   ├── index.html                (blog listing page)
│   └── posts/                    (individual post .html files)
└── images/
    ├── og-default.png            (1200×630, Open Graph)
    └── icons/                    (PWA icons)
```

## Copyright Safety Rules (CRITICAL)
These rules must NEVER be violated:
1. NEVER use trademarked game names in code, comments, or UI: Tetris, Wordle, Candy Crush, Flow Free, Simon, Block Blast, Suika, Lights Out, Pipe Dream, Pipe Mania, Ball Sort.
2. NEVER copy visual design from existing games: color schemes, block shapes, grid dimensions, UI layouts, or animation styles.
3. ALWAYS use the PuzzleVault color palette defined below.
4. NEVER use tetromino-specific shapes (T, S, Z, L, J pieces are fine as part of a larger set, but never as the exclusive piece set).
5. NEVER use fruit imagery for merging games.
6. Each game MUST implement its unique mechanic (defined in skills.md).

## Design System — PuzzleVault Palette
CSS variables (defined in global.css):
```css
:root {
  /* Primary game colors (NEVER use Wordle/BlockBlast/FlowFree colors) */
  --pv-blue: #2563EB;
  --pv-coral: #F43F5E;
  --pv-emerald: #059669;
  --pv-amber: #D97706;
  --pv-violet: #7C3AED;
  --pv-cyan: #0891B2;
  --pv-pink: #DB2777;
  --pv-lime: #65A30D;
  --pv-slate: #475569;
  --pv-orange: #EA580C;

  /* Pastel variants (for game pieces) */
  --pv-p-sky: #93C5FD;
  --pv-p-rose: #FCA5A5;
  --pv-p-mint: #86EFAC;
  --pv-p-cream: #FDE68A;
  --pv-p-lavender: #C4B5FD;
  --pv-p-blush: #FBCFE8;

  /* Backgrounds */
  --pv-bg-light: #F8FAFC;
  --pv-bg-dark: #0F172A;
  --pv-grid-bg: #E2E8F0;
  --pv-grid-dark: #1E293B;
  --pv-card-bg: #FFFFFF;

  /* Feedback colors */
  --pv-correct: #059669;
  --pv-wrong: #F43F5E;
  --pv-hint: #D97706;

  /* Typography & Layout */
  --pv-text: #1E293B;
  --pv-text-secondary: #64748B;
  --pv-border: #E2E8F0;
  --pv-radius: 12px;
  --pv-radius-sm: 6px;
  --pv-shadow: 0 1px 3px rgba(0,0,0,0.1);
  --pv-shadow-lg: 0 4px 12px rgba(0,0,0,0.15);
}
```
- System font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Mobile-first responsive (breakpoints: 480px, 768px, 1024px)
- Game canvas: 100% width, max 500px, centered
- Dark mode via prefers-color-scheme media query
- All game pieces: border-radius: 4px (rounded corners, NOT sharp edges)
- Clean minimal aesthetic (NOT neon/flashy)

## Ad Slot Rules
- Ad placements per game page:
  - #ad-sidebar: 300×250 to the right of game (desktop only, hidden on mobile)
  - #ad-interstitial: full-screen overlay (shown after game over, controlled by AdController)
  - #ad-bottom: 728×90 below game guide section
  - #ad-reward: reward ad button inside game UI ("Watch ad for hint/undo")
- AdController logic (in adsense.js):
  - First 3 games: NO interstitial ads (onboarding protection)
  - After that: 1 interstitial every 3 games
  - Reward ads: always available, voluntary (user-initiated)
- Landing page: 1 ad slot (728×90 between games grid and stats)

## Game Page Template (Every Game Page)
Every game .html file MUST include these sections in order:
1. `<head>`: global.css, meta tags, Schema.org JSON-LD (VideoGame), OG tags, canonical URL
2. Header with nav (rendered by common.js)
3. Game title bar: emoji + name + settings/stats icons
4. Game canvas area (centered, responsive)
5. Game controls below canvas (game-specific)
6. `<div class="ad-slot" id="ad-sidebar">` — Desktop sidebar ad
7. Result overlay (hidden by default, shown on game over/clear)
8. `<div class="ad-slot" id="ad-interstitial">` — Interstitial container
9. Game guide section: H2 "How to Play [GameName]", 200-300 words
10. FAQ section: 3-5 questions using `<details><summary>` accordion
11. Cross-promotion: "Try Another Puzzle" — 3 game cards (rendered by common.js)
12. `<div class="ad-slot" id="ad-bottom">` — Bottom ad
13. Footer (rendered by common.js)
14. Scripts: common.js, adsense.js, seed.js, sfx.js, share.js, then inline `<script>` for game logic

## Daily Challenge System
- All games with Daily mode use getDailySeed(gameId) from seed.js
- Seed = hash of "gameId:YYYY-MM-DD" → deterministic puzzle per day globally
- SeededRandom class provides: next(), nextInt(min,max), shuffle(arr)
- Daily results stored in localStorage: `pv_{gameId}_daily_{date}`
- Streak tracking: `pv_{gameId}_streak`, `pv_{gameId}_lastDaily`
- Daily Challenge resets at midnight UTC

## Share System
- All games produce a shareable text result with emoji grid/stats
- Format: Game emoji + name + "Daily #N" + result + stats + URL
- Use navigator.share() if available, fallback to clipboard copy
- Show toast notification on copy: "Copied to clipboard!"
- NEVER include player's personal info in share text

## Sound Effects (sfx.js)
- Web Audio API oscillator-based (no audio files)
- Sound types: tap, correct, wrong, clear, combo, gameover, win
- Volume: 0.3 (not too loud)
- Mute toggle in settings, saved to localStorage: `pv_sound`
- Initialize AudioContext on first user interaction (browser policy)

## localStorage Keys Convention
- All keys prefixed with `pv_`
- Format: `pv_{gameId}_{dataType}`
- Examples: pv_numvault_best, pv_gridsmash_daily_2026-02-18, pv_sound, pv_theme

## SEO Requirements (Every Page)
- Unique `<title>`: "[GameName] — Free Online Puzzle Game | PuzzleVault"
- Unique `<meta name="description">` (150-160 chars)
- `<link rel="canonical" href="https://puzzlevault.pages.dev/games/[name]">`
- `<html lang="en">`
- Schema.org JSON-LD: VideoGame type
- Open Graph + Twitter Card meta tags
- Semantic HTML: proper heading hierarchy

## Cross-Promotion Map
Defined in common.js. After each game, show 3 recommendations:
- NumVault → GridSmash, PatternPop, QuickCalc
- GridSmash → HexMatch, MergeChain, NumVault
- ColorFlow → PipeLink, TileTurn, SortStack
- MergeChain → GridSmash, HexMatch, NumVault
- PatternPop → NumVault, QuickCalc, TileTurn
- TileTurn → ColorFlow, PipeLink, PatternPop
- PipeLink → ColorFlow, TileTurn, SortStack
- SortStack → ColorFlow, PipeLink, TileTurn
- QuickCalc → PatternPop, NumVault, MergeChain
- HexMatch → GridSmash, MergeChain, SortStack

## Code Quality
- Semantic HTML5 elements (header, nav, main, section, footer)
- Accessible: ARIA labels on game controls, keyboard support where applicable
- Performance: no memory leaks (clean up intervals/timeouts/listeners)
- Canvas: use requestAnimationFrame, clear canvas before each frame
- Touch: handle both mouse and touch events (pointerdown/pointermove/pointerup)
- Error handling: graceful fallbacks, no crashes on edge cases
- No console.log in production (debugging only)

## PWA Support
- manifest.json with game icons, theme color, display: standalone
- sw.js: cache game HTML/CSS/JS for offline play
- Meta tag: `<meta name="theme-color" content="#2563EB">`

## Blog System
PuzzleVault includes a blog for SEO traffic and user engagement.
- Location: /blog/index.html (listing), /blog/posts/*.html (individual posts)
- Each post is a standalone .html file (no markdown engine, no build tools)
- Blog listing page: card grid of posts sorted by date (newest first)
- Post data stored in /js/blog-data.js as a JSON array:
  ```javascript
  const BLOG_POSTS = [
    {
      slug: 'how-to-improve-memory-with-puzzle-games',
      title: 'How to Improve Memory with Puzzle Games',
      description: 'Science-backed tips on using puzzles to boost your brain power.',
      date: '2026-03-01',
      category: 'tips',
      tags: ['memory', 'brain', 'patternpop'],
      readTime: 5
    },
    // ... more posts
  ];
  ```
- Categories: tips, strategy, updates, science
- Blog post page template:
  1. Header (via common.js)
  2. Post title + date + category badge + read time
  3. Post body (HTML content, manually written)
  4. `<div class="ad-slot" id="ad-mid">` — Mid-content ad
  5. Related games section: 2-3 game cards (based on post tags matching game IDs)
  6. Related posts: 2-3 other posts from same category
  7. `<div class="ad-slot" id="ad-bottom">` — Bottom ad
  8. Footer (via common.js)
- Blog post ad slots: 2 (mid-content, bottom)
- Internal linking: every post must link to at least 2 relevant PuzzleVault games
- Adding a new post:
  1. Create /blog/posts/[slug].html using the post template
  2. Add entry to BLOG_POSTS array in blog-data.js
  3. Blog listing page auto-updates (reads from blog-data.js)

## Blog Content Rules
- Each post: 600-1000 words, natural keyword integration
- Internal links: 2-4 per post, linking to relevant PuzzleVault games
- Topics that drive traffic:
  - "How to" guides (e.g., "How to Get Better at Number Puzzles")
  - Strategy tips for specific games (e.g., "5 GridSmash Strategies for Higher Scores")
  - Brain science / cognitive benefits of puzzles
  - Update announcements (new games, features)
- SEO: Each post has unique title tag, meta description, OG tags, canonical URL
- Schema.org: BlogPosting JSON-LD per post

## Language
- All UI text and content in English
- Global audience (all games are language-independent: numbers, colors, shapes only)