---
trigger: always_on
---

# PuzzleVault — Antigravity Project Rules

> These rules apply to EVERY file you create in this project.
> Read and follow ALL rules before writing any code.

## Project Overview
PuzzleVault is a browser-based puzzle game platform with 10 games.
- Domain: https://puzzlevault.pages.dev
- Stack: Vanilla JS + HTML5 Canvas (NO frameworks, NO React, NO build tools)
- Hosting: Cloudflare Pages (GitHub main integration; python3 scripts/package-site.py --directory; output dist/site)
- Revenue: Google AdSense (banner + interstitial + reward ads)
- Audience: Global (all games are language-independent)

## Folder Structure
```
puzzlevault/
├── index.html                    (main landing page)
├── about.html, privacy.html, terms.html, contact.html
├── sitemap.xml, robots.txt, manifest.json, _redirects
├── css/
│   └── global.css                (design system + all shared styles)
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
    ├── og-default.png            (1200×630 social sharing image)
    └── icons/                    (PWA icons: 192px, 512px)
```

## Copyright & Originality
1. Game rules/mechanics: Public domain concepts only (decades-old puzzle principles)
2. Visual design: 100% original — NEVER copy existing games' colors, shapes, UI layouts
3. Names/branding: NO registered trademarks (Tetris, Wordle, Candy, Blast, Flow, Simon, etc.)
4. Code: 100% original — NEVER reference/decompile other game source code
5. Unique mechanics: Each game MUST implement its unique mechanic (defined in skills.md)
6. Design system: ALWAYS use PuzzleVault color palette (defined below)

## Design System — PuzzleVault Palette
CSS variables (defined in global.css):
```css
:root {
  /* Primary game colors */
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

## Advertising and Hint Rules
- The source of truth is `docs/monetization-readiness.md` and the current official Google policy links in `docs/adsense-operations-2026-09-28.md`.
- Advertising stays disabled until the real account/site/product and privacy setup are ready. Keep ownership metadata and ads.txt; these do not request ads.
- Never automatically load an ad SDK, use a guessed slot ID, or treat optional Analytics consent as advertising consent.
- `AdController.configure` needs a real provider and a `canRequestAds(kind)` function backed by the actual product/CMP state. Missing, denied or failed permission makes no ad request and keeps help free.
- Standard AdSense display ads must not be converted into homemade rewarded ads, timers, or full-screen overlays. Use only an approved game-ad product and its official lifecycle callbacks for those formats.
- Never automatically refresh display ad slots. `refreshBottomAd()` is intentionally a no-op; a 60-second timer does not make automatic refresh compliant.
- Future display units must be clearly labeled and separated from play buttons and game controls. Google strongly recommends at least 150 pixels from the game or removal from gameplay pages; assess the actual layout on every screen size.
- Hints, undo and reset are usable with no provider. Do not show a fake ad, an '(Ad)' label, or a promise to watch an ad while ads are disabled.
- If approved rewarded ads are connected, state the exact reward, ask for voluntary opt-in, and grant it once only after the provider confirms completion. Refusal or dismissal must preserve ordinary play.
- Current interstitial opportunities are completed games 6, 9, 12, ... with at least 120 seconds between actual impressions. The provider owns pause/mute/restore and must not interrupt active play.
- Preserve mobile safe areas for game controls. Do not turn on anchor ads without checking controls and closing actions at actual supported viewport sizes.

## Game Page Template (Every Game Page)
Every game .html file MUST include these sections in order:
1. `<head>`: global.css, meta tags, Schema.org JSON-LD (VideoGame), OG tags, canonical URL
2. Header with nav (rendered by common.js)
3. Game title bar: emoji + name + settings/stats icons
4. Game canvas area (centered, responsive)
5. Game controls below canvas: score, buttons, 💡 Hint button
6. Cross-promotion: "Try Another Puzzle" — 3 game cards (rendered by common.js) — placed DIRECTLY below game controls for maximum visibility
7. Existing `#ad-sidebar` is a disabled legacy placeholder, not a required live placement
8. Result overlay (hidden by default, shown on game over/clear) — MUST include mini cross-promo icons inside the modal
9. Existing `#ad-interstitial` stays hidden; approved game-ad providers own their ad UI
10. Game guide section: H2 "How to Play [GameName]", 200-300 words
11. FAQ section: 3-5 questions using `<details><summary>` accordion
12. Existing `#ad-bottom` stays empty/hidden until an approved display placement is configured
13. Footer (rendered by common.js)
14. Scripts: common.js, adsense.js, seed.js, sfx.js, share.js, then inline `<script>` for game logic

## Cross-Promotion Placement Rules
- PRIMARY placement: directly below game controls, ABOVE the game guide section
  - This is where mobile users' eyes naturally go after playing
  - 3 game cards in a horizontal row, scrollable on mobile
- SECONDARY placement: inside Result Modal (game over / level clear popup)
  - Show 3 small game icons at the bottom of the modal
  - Format: emoji + name, tappable, links to the other game
- Cross-promotion map (defined in common.js):
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
- Sound types: tap, correct, wrong, clear, combo, gameover, win, hint
- Volume: 0.3 (not too loud)
- Mute toggle in settings, saved to localStorage: `pv_sound`
- Initialize AudioContext on first user interaction (browser policy)

## localStorage Keys Convention
- All keys prefixed with `pv_`
- Format: `pv_{gameId}_{dataType}`
- Examples: pv_numvault_best, pv_gridsmash_daily_2026-02-18, pv_sound, pv_theme
- Hint tracking: `pv_{gameId}_freeHintUsed` (boolean, per session via sessionStorage)

## SEO Requirements (Every Page)
- Unique `<title>`: "[GameName] — Free Online Puzzle Game | PuzzleVault"
- Unique `<meta name="description">` (150-160 chars)
- `<link rel="canonical" href="https://puzzlevault.pages.dev/games/[name].html">`
- `<html lang="en">`
- Schema.org JSON-LD: VideoGame type
- Open Graph + Twitter Card meta tags
- Semantic HTML: proper heading hierarchy

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
- Post data stored in /js/blog-data.js as a JSON array
- Categories: tips, strategy, updates, science
- Blog post template includes: header, post title/date/category, post body, related games section, ad slot, cross-promo, footer
- Each post gets unique title, meta description, canonical URL, BlogPosting JSON-LD

## Blog Content Rules
- Minimum 500 words per post, maximum 1500 words
- Include 1-2 internal links to game pages per post
- Include "Play Now" CTA buttons linking to related games
- Each post has a "Related Games" section at the bottom showing 2-3 game cards

## Language
- Multilingual: 5 languages supported via client-side i18n
  - English (en), Korean (ko), Japanese (ja), Chinese (zh), Spanish (es)
- Translation engine: `/js/i18n.js` (I18n object)
- Language files: `/lang/{en,ko,ja,zh,es}.json`
- Language preference saved to localStorage: `pv_lang`
- Auto-detects browser language, falls back to English
- Language selector in header (flag + dropdown)
- DOM binding via `data-i18n`, `data-i18n-html`, `data-i18n-placeholder`, `data-i18n-title` attributes
- Custom event `langchange` dispatched on language switch
- Game names (NumVault, GridSmash, etc.) are NEVER translated
- Global audience (all games are language-independent: numbers, colors, shapes only)