# PuzzleVault i18n 구현 프롬프트 — Phase 3 & Phase 4 (SEO 최적화)

> **사용법**: Phase 1~2 완료 후, 이 프롬프트를 새 대화에 붙여넣어 주세요.
> **전제조건**: Phase 1~2가 완료되어 `js/i18n.js`, `lang/*.json` 5개, 언어 셀렉터가 모두 동작하는 상태여야 합니다.
> **예상 소요**: 약 3~4시간
> **목표**: 언어별 별도 URL 생성으로 진정한 다국어 SEO 효과 확보

---

지금부터 너는 다음 두 파일의 내용을 숙지하고 이 프로젝트를 완벽하게 분석한 후 아래 작업을 수행해줘:
- C:\Users\brain\OneDrive\바탕 화면\vibe coding\puzzlevault\.agent\rules\puzzlevault-rules.md
- C:\Users\brain\OneDrive\바탕 화면\vibe coding\puzzlevault\.agent\skills\puzzlevault-skills\SKILL.md

⚠️ 전제: Phase 1~2가 이미 완료되어 다음이 존재합니다:
- `js/i18n.js` — 번역 엔진
- `lang/en.json`, `lang/ko.json`, `lang/ja.json`, `lang/zh.json`, `lang/es.json` — 5개 언어 파일
- `css/global.css`에 언어 셀렉터 CSS 추가됨
- `js/common.js`에 언어 셀렉터와 I18n.t() 적용됨
- 모든 HTML 파일에 `data-i18n` 속성과 `i18n.js` 스크립트 태그 추가됨

===========================================================
# Phase 3: 언어별 랜딩 페이지 생성 (SEO)
===========================================================

## 3-1. 폴더 구조

다음 폴더와 파일을 생성해:

```
puzzlevault/
├── ko/
│   └── index.html      ← 한국어 랜딩 페이지
├── ja/
│   └── index.html      ← 일본어 랜딩 페이지
├── zh/
│   └── index.html      ← 중국어 랜딩 페이지
└── es/
    └── index.html      ← 스페인어 랜딩 페이지
```

## 3-2. 언어별 랜딩 페이지 작성 규칙

각 언어별 `index.html`은 기존 `index.html`과 **동일한 레이아웃과 구조**를 가지되, 다음이 다름:

### A) `<html lang>` 속성
```html
<!-- ko/index.html -->
<html lang="ko">
<!-- ja/index.html -->
<html lang="ja">
<!-- zh/index.html -->
<html lang="zh">
<!-- es/index.html -->
<html lang="es">
```

### B) `<title>` 태그 — 현지화된 제목
```html
<!-- ko -->
<title>PuzzleVault — 무료 온라인 퍼즐 게임</title>
<!-- ja -->
<title>PuzzleVault — 無料オンラインパズルゲーム</title>
<!-- zh -->
<title>PuzzleVault — 免费在线益智游戏</title>
<!-- es -->
<title>PuzzleVault — Juegos de Puzzles Gratis en Línea</title>
```

### C) `<meta name="description">` — 현지화된 설명 (150~160자)
각 언어의 lang/*.json에 있는 `landing.metaDesc` 값을 사용하되, SEO에 최적화된 자연스러운 문장으로:

```html
<!-- ko -->
<meta name="description" content="브라우저에서 바로 즐기는 10가지 무료 두뇌 퍼즐 게임. 다운로드 없이, 회원가입 없이 매일 새로운 도전을 즐기세요.">
<!-- ja -->
<meta name="description" content="ダウンロード不要！ブラウザで遊べる10種類の無料パズルゲーム。毎日新しい挑戦でスコアを競いましょう。">
<!-- zh -->
<meta name="description" content="免费在线玩10款益智游戏，无需下载，无需注册。每日挑战、成绩追踪，锻炼大脑从这里开始。">
<!-- es -->
<meta name="description" content="Juega 10 juegos de puzzles gratuitos directamente en tu navegador. Sin descargas, sin cuentas. Desafíos diarios y seguimiento de puntuaciones.">
```

### D) Open Graph + Twitter Card — 현지화
```html
<!-- ko 예시 -->
<meta property="og:title" content="PuzzleVault — 무료 온라인 퍼즐 게임">
<meta property="og:description" content="브라우저에서 바로 즐기는 10가지 무료 두뇌 퍼즐 게임.">
```

### E) `<link rel="canonical">` — 각 언어 페이지의 고유 URL
```html
<!-- ko/index.html -->
<link rel="canonical" href="https://puzzlevault.pages.dev/ko/">
<!-- ja/index.html -->
<link rel="canonical" href="https://puzzlevault.pages.dev/ja/">
```

### F) hreflang 태그 — 모든 언어 버전 링크 (각 랜딩 페이지에 모두 포함)
```html
<link rel="alternate" hreflang="en" href="https://puzzlevault.pages.dev/">
<link rel="alternate" hreflang="ko" href="https://puzzlevault.pages.dev/ko/">
<link rel="alternate" hreflang="ja" href="https://puzzlevault.pages.dev/ja/">
<link rel="alternate" hreflang="zh" href="https://puzzlevault.pages.dev/zh/">
<link rel="alternate" hreflang="es" href="https://puzzlevault.pages.dev/es/">
<link rel="alternate" hreflang="x-default" href="https://puzzlevault.pages.dev/">
```

⚠️ 영어 기본 `index.html`에도 위 hreflang 태그를 추가해야 함!

### G) Schema.org JSON-LD — 현지화
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "PuzzleVault",
  "url": "https://puzzlevault.pages.dev/ko/",
  "inLanguage": "ko",
  "description": "브라우저에서 바로 즐기는 10가지 무료 두뇌 퍼즐 게임."
}
```

### H) 페이지 본문 — 해당 언어로 작성

Hero 섹션, Daily Challenges 섹션, All Games 섹션, Blog 섹션, Stats 섹션의 **모든 텍스트**를 해당 언어로 작성.

단, 다음은 유지:
- 게임 이름: NumVault, GridSmash 등
- 이모지: 🧩 🔢 🧱 등
- PuzzleVault 브랜드명

인라인 `<script>`에서 `GAME_DESCRIPTIONS` 객체도 해당 언어로:
```javascript
// ko/index.html
const GAME_DESCRIPTIONS = {
    numvault: '비밀 숫자 코드를 해독하세요',
    gridsmash: '블록을 배치하고, 줄을 없애고, 콤보를 노리세요',
    // ...
};
```

### I) 스크립트/CSS 경로 — 상대 경로 주의

`ko/index.html`에서 `js/`, `css/` 등의 경로는 상위 디렉토리를 참조해야 함:
```html
<link rel="stylesheet" href="/css/global.css">
<script src="/js/i18n.js"></script>
<script src="/js/blog-data.js"></script>
<script src="/js/common.js"></script>
```
→ 절대 경로(`/` 시작)를 사용하면 depth에 상관없이 안전

### J) 언어 셀렉터 동작

이 페이지에서 언어를 전환하면:
- `I18n.switchLang()` 호출 → localStorage에 저장
- 해당 언어의 랜딩 페이지로 이동 (`window.location.href = '/{lang}/'` 또는 `'/'` for en)

이를 위해 인라인 스크립트에 다음 추가:
```javascript
window.addEventListener('langchange', (e) => {
    const newLang = e.detail.lang;
    if (newLang === 'en') {
        window.location.href = '/';
    } else {
        window.location.href = '/' + newLang + '/';
    }
});
```

## 3-3. 기존 index.html 수정

기존 영어 `index.html`에 다음 추가:
1. hreflang 태그 6개 (위 F 참조)
2. 언어 전환 시 해당 언어 랜딩으로 이동하는 langchange 리스너

## 3-4. _redirects 업데이트

`_redirects` 파일에 다음 추가:
```
/ko     /ko/index.html     200
/ja     /ja/index.html     200
/zh     /zh/index.html     200
/es     /es/index.html     200
```

## 3-5. sitemap.xml 업데이트

`sitemap.xml`에 4개 언어 랜딩 페이지 URL 추가:
```xml
<url>
  <loc>https://puzzlevault.pages.dev/ko/</loc>
  <lastmod>2026-03-05</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.9</priority>
</url>
<!-- ja, zh, es도 동일하게 -->
```

===========================================================
# Phase 4: 블로그 포스트 다국어 SEO
===========================================================

## 4-1. 폴더 구조

```
puzzlevault/blog/
├── index.html              ← 기존 영어 블로그 인덱스
├── ko/
│   ├── index.html          ← 한국어 블로그 인덱스
│   └── {slug}.html         ← 한국어 블로그 포스트들
├── ja/
│   ├── index.html
│   └── {slug}.html
├── zh/
│   ├── index.html
│   └── {slug}.html
└── es/
    ├── index.html
    └── {slug}.html
```

## 4-2. 현재 블로그 포스트 목록

다음 5개 포스트를 4개 언어로 번역:
1. `5-tips-to-boost-your-brain-with-puzzles`
2. `gridsmash-beginner-strategy-guide`
3. `daily-challenge-streak-tips`
4. `welcome-to-puzzlevault`
5. `numvault-tips-and-strategy`

## 4-3. 블로그 포스트 번역 규칙

각 포스트는 **완전히 독립된 HTML 파일**로 생성 (data-lang 방식 아님):

### A) 각 포스트의 `<head>`:
- `<html lang="ko">` 등 해당 언어
- `<title>` — 해당 언어로 번역된 제목
- `<meta name="description">` — 해당 언어로 번역된 설명
- `<link rel="canonical">` — 해당 포스트의 고유 URL
- hreflang 태그: 모든 언어 버전 링크
- BlogPosting JSON-LD: `inLanguage` 포함

### B) 본문 번역:
- 기존 영어 포스트의 **완전한 번역** (축약 X)
- 각 언어의 네이티브한 블로그 글 스타일 유지
- 게임 이름, PuzzleVault는 번역하지 않음
- 내부 링크의 게임 페이지 URL은 동일 (`/games/numvault.html`)
- "Play Now" CTA 버튼 텍스트는 해당 언어로

### C) 관련 게임 섹션, 크로스 프로모, 광고 슬롯은 영어 버전과 동일한 구조 유지

## 4-4. blog-data.js 수정

블로그 포스트 데이터에 다국어 지원 추가:

```javascript
const BLOG_POSTS = [
    {
        slug: '5-tips-to-boost-your-brain-with-puzzles',
        title: {
            en: '5 Science-Backed Ways Puzzle Games Boost Your Brain',
            ko: '퍼즐 게임이 두뇌를 강화하는 과학적으로 입증된 5가지 방법',
            ja: 'パズルゲームが脳を鍛える科学的に証明された5つの方法',
            zh: '益智游戏提升大脑的5种科学方法',
            es: '5 Formas Científicamente Comprobadas de Mejorar tu Cerebro con Puzzles'
        },
        description: {
            en: 'Discover how daily puzzle play strengthens memory...',
            ko: '매일 퍼즐을 풀면 기억력이 강화되고...',
            ja: '毎日のパズルプレイが記憶力を強化し...',
            zh: '了解每日益智游戏如何增强记忆力...',
            es: 'Descubra cómo jugar puzzles diariamente fortalece la memoria...'
        },
        date: '2026-03-01',
        category: 'science',
        tags: ['memory', 'patternpop', 'numvault', 'brain'],
        readTime: 5
    },
    // ... 나머지 4개 포스트도 동일하게
];
```

`getBlogPosts()` 함수를 수정하여 현재 언어의 title/description을 반환:

```javascript
function getBlogPosts(count, category) {
    let posts = [...BLOG_POSTS];
    if (category) posts = posts.filter(p => p.category === category);
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (count) posts = posts.slice(0, count);

    // 현재 언어에 맞는 title/description 반환
    const lang = (typeof I18n !== 'undefined') ? I18n.currentLang : 'en';
    return posts.map(p => ({
        ...p,
        title: (typeof p.title === 'object') ? (p.title[lang] || p.title.en) : p.title,
        description: (typeof p.description === 'object') ? (p.description[lang] || p.description.en) : p.description,
        // 블로그 포스트 URL도 언어별로 분기
        url: lang === 'en' ? `/blog/posts/${p.slug}.html` : `/blog/${lang}/${p.slug}.html`
    }));
}
```

## 4-5. renderBlogCards() 수정 (common.js)

블로그 카드의 href를 `post.url`로 변경:
```javascript
// 기존: card.href = `/blog/posts/${post.slug}.html`;
// 변경:
card.href = post.url || `/blog/posts/${post.slug}.html`;
```

## 4-6. 언어별 블로그 인덱스 페이지

`blog/ko/index.html` 등 — 기존 `blog/index.html`과 동일한 레이아웃이지만:
- `<html lang="ko">`
- 제목/설명이 해당 언어
- 블로그 카드 링크가 해당 언어의 포스트로 이동
- hreflang 태그 포함

## 4-7. sitemap.xml 업데이트

모든 언어별 블로그 URL 추가:
```xml
<url>
  <loc>https://puzzlevault.pages.dev/blog/ko/5-tips-to-boost-your-brain-with-puzzles.html</loc>
  <lastmod>2026-03-05</lastmod>
</url>
```

===========================================================
# 검증 체크리스트
===========================================================

Phase 3 검증:
- [ ] 4개 언어 랜딩 페이지가 모두 생성되었는지 (/ko/, /ja/, /zh/, /es/)
- [ ] 각 랜딩의 title, meta description이 해당 언어인지
- [ ] hreflang 태그가 영어 index.html + 4개 언어 index.html 모두에 포함되었는지
- [ ] canonical URL이 각 페이지마다 고유한지
- [ ] Schema.org JSON-LD에 inLanguage가 포함되었는지
- [ ] 랜딩의 모든 텍스트가 해당 언어로 작성되었는지
- [ ] 게임 이름은 번역되지 않았는지
- [ ] 스크립트/CSS 경로가 올바른지 (절대 경로)
- [ ] _redirects에 /ko, /ja, /zh, /es 추가되었는지
- [ ] sitemap.xml 업데이트되었는지
- [ ] 언어 전환 시 해당 랜딩으로 이동하는지

Phase 4 검증:
- [ ] 4개 언어 × 5개 포스트 = 20개 블로그 파일 생성되었는지
- [ ] 4개 언어 블로그 인덱스 페이지 생성되었는지
- [ ] blog-data.js가 다국어 title/description을 지원하는지
- [ ] getBlogPosts()가 현재 언어에 맞는 데이터를 반환하는지
- [ ] 블로그 카드 링크가 해당 언어의 포스트로 연결되는지
- [ ] 각 포스트의 canonical URL, hreflang, 메타 태그가 올바른지
- [ ] 본문이 자연스럽게 번역되었는지 (직역 금지)
- [ ] 관련 게임 섹션, 광고 슬롯이 정상 동작하는지

===========================================================
# 주의사항
===========================================================

1. **파일 수 주의**: Phase 4에서 약 24개의 HTML 파일을 생성해야 함 (4개 인덱스 + 20개 포스트)
2. **블로그 포스트 번역 품질**: 각 언어로 500~1500단어의 완전한 번역. 직역이 아닌 현지화. 블로그 글 스타일에 맞게.
3. **기존 영어 콘텐츠를 절대 수정하지 마**: 추가만 하는 작업
4. **경로 일관성**: 모든 내부 링크가 올바른 경로를 사용하는지 확인
5. **robots.txt**: 새 경로가 차단되지 않는지 확인
6. **sw.js (Service Worker)**: 새 파일들이 캐시 목록에 포함되어야 함

===========================================================
# Cloudflare Redirect Rules 설정 가이드 (수동)
===========================================================

이 작업은 대시보드에서 수동으로 해야 합니다:

1. Cloudflare 대시보드 → 도메인 선택 → Rules → Redirect Rules
2. 규칙 생성:

   규칙 1 (한국어):
   - When: `http.request.accepted_languages[0] eq "ko"` AND `http.request.uri.path eq "/"`
   - Then: Dynamic Redirect → 302 → `https://puzzlevault.pages.dev/ko/`
   - Preserve query string: Yes

   규칙 2 (일본어):
   - When: `http.request.accepted_languages[0] eq "ja"` AND `http.request.uri.path eq "/"`
   - Then: Dynamic Redirect → 302 → `https://puzzlevault.pages.dev/ja/`

   규칙 3 (중국어):
   - When: `http.request.accepted_languages[0] eq "zh"` AND `http.request.uri.path eq "/"`
   - Then: Dynamic Redirect → 302 → `https://puzzlevault.pages.dev/zh/`

   규칙 4 (스페인어):
   - When: `http.request.accepted_languages[0] eq "es"` AND `http.request.uri.path eq "/"`
   - Then: Dynamic Redirect → 302 → `https://puzzlevault.pages.dev/es/`

이렇게 하면 한국 사용자가 puzzlevault.pages.dev에 접속했을 때 자동으로 한국어 랜딩 페이지로 리다이렉트됩니다.
무료 플랜에서 10개 규칙 사용 가능하므로 4개는 충분합니다.
