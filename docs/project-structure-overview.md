# PuzzleVault 프로젝트 구조 분석 (2026-03-01)

## 프로젝트 구조

| 영역 | 상태 | 파일 |
|------|------|------|
| **랜딩 페이지** | ✅ 완성 | `index.html` (18.7KB) |
| **공통 CSS** | ✅ 완성 | `css/global.css` (22.3KB) |
| **공통 JS** | ✅ 완성 | `common.js`, `adsense.js`, `seed.js`, `sfx.js`, `share.js`, `blog-data.js` |
| **정적 페이지** | ✅ 완성 | `about.html`, `privacy.html`, `terms.html`, `contact.html` |
| **PWA** | ✅ 완성 | `manifest.json`, `sw.js`, `robots.txt`, `sitemap.xml` |
| **블로그** | ⚠️ 구조만 | `blog/index.html` 있음, `blog/posts/`는 `.gitkeep`만 |
| **이미지** | ⚠️ 미비 | `images/icons/`에 `.gitkeep`만, `og-default.png` 없음 |

## 게임 10종 (모두 HTML + 분리된 로직 JS 파일)

| # | 게임 | HTML | 로직 JS | 특이사항 |
|---|------|------|---------|---------|
| 1 | 🔢 NumVault | ✅ | ✅ `numvault-logic.js` (25KB) | |
| 2 | 🧱 GridSmash | ✅ | ✅ `gridsmash-logic.js` (30KB) | |
| 3 | 🧠 PatternPop | ✅ | ✅ `patternpop-logic.js` (18KB) | |
| 4 | 📚 SortStack | ✅ | ✅ `sortstack-logic.js` (29KB) | |
| 5 | ⚡ QuickCalc | ✅ | ✅ `quickcalc-logic.js` (18KB) | |
| 6 | 🔄 TileTurn | ✅ | ✅ `tileturn-logic.js` (20KB) | |
| 7 | 🎨 ColorFlow | ✅ | ✅ `colorflow-logic.js` (26KB) + `colorflow-levels.js` (19KB) | 레벨 데이터 분리 |
| 8 | 🔧 PipeLink | ✅ | ✅ `pipelink-logic.js` (48KB) + `test-pipelink.js` (5KB) | 테스트 파일 별도 |
| 9 | 🔮 MergeChain | ✅ | ✅ `mergechain-logic.js` (29KB) | |
| 10 | ⬡ HexMatch | ✅ | ✅ `hexmatch-logic.js` (35KB) | |

## 기타 파일

- `games/generator.py` — ColorFlow 레벨 생성기 (Python)
- `docs/` — 게임 가이드, 개발 히스토리, 분석 문서 등
- `_redirects` — Cloudflare Pages 리다이렉트 설정
