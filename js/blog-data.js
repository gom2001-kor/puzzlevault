/* ===================================================
   PuzzleVault — Blog Post Registry (blog-data.js)
   ===================================================
   How to add a new blog post:
   1. Create /blog/posts/[slug].html (copy from /blog/posts/_template.html)
   2. Write post content inside <article class="blog-content">
   3. Add entry to BLOG_POSTS array below
   4. Update sitemap.xml with new URL
   That's it — the blog listing page auto-updates.
   =================================================== */

const BLOG_POSTS = [
    {
        slug: 'the-evolution-of-browser-puzzles',
        title: {
            en: 'The Evolution of Browser Puzzles: From Flash to HTML5',
            ko: '웹 브라우저 퍼즐 게임의 진화: 플래시에서 HTML5까지',
            ja: 'ブラウザパズルゲームの進化：FlashからHTML5へ',
            zh: '网页益智游戏的演变：从Flash到HTML5',
            es: 'La Evolución de los Puzzles de Navegador: De Flash a HTML5'
        },
        description: {
            en: 'Explore the fascinating history of web-based puzzle games. Learn how browser technology evolved from the Flash era to modern, high-performance HTML5 Canvas games.',
            ko: '웹 기반 퍼즐 게임의 흥미로운 역사를 탐구해보세요. 플래시 시대부터 현대적인 고성능 HTML5 캔버스 게임에 이르기까지 브라우저 기술이 어떻게 진화했는지 알아봅니다.',
            ja: 'ウェブベースのパズルゲームの魅力的な歴史を探ります。Flash時代から現代の高性能HTML5 Canvasゲームへと、ブラウザ技術がどのように進化したかを学びます。',
            zh: '探索基于网页的益智游戏的迷人历史。了解浏览器技术如何从Flash时代演变到现代高性能的HTML5 Canvas游戏。',
            es: 'Explora la fascinante historia de los juegos de puzzle en la web. Descubre cómo la tecnología de los navegadores evolucionó desde la era de Flash hasta los modernos juegos de Canvas HTML5 de alto rendimiento.'
        },
        date: '2026-03-29',
        category: 'updates',
        tags: ['all-games'],
        readTime: 5
    },
    {
        slug: 'why-we-built-puzzlevault-with-vanilla-js',
        title: {
          "en": "Why PuzzleVault Uses Vanilla JavaScript",
          "ko": "PuzzleVault가 바닐라 JavaScript를 사용하는 이유",
          "ja": "PuzzleVaultが素のJavaScriptを使う理由",
          "zh": "PuzzleVault为何使用原生JavaScript",
          "es": "Por qué PuzzleVault usa JavaScript sin frameworks"
},
        description: {
          "en": "A look at PuzzleVault’s HTML, CSS and JavaScript architecture: direct drawing, small modules, browser storage, and the work required to keep games responsive.",
          "ko": "PuzzleVault의 HTML·CSS·JavaScript 구조를 살펴봅니다. 직접 그리기, 게임별 코드 분리, 브라우저 저장과 반응성 검증의 실제 역할을 설명합니다.",
          "ja": "HTML・CSS・JavaScriptで作るPuzzleVaultの構成を紹介。描画、ゲーム別のコード、保存機能と操作性の確認について説明します。",
          "zh": "了解PuzzleVault的HTML、CSS与JavaScript结构，以及直接绘图、独立游戏模块、浏览器存储和实际操作测试之间的关系。",
          "es": "Así se organiza PuzzleVault con HTML, CSS y JavaScript: dibujo directo, módulos por juego, almacenamiento del navegador y pruebas de respuesta."
},
        date: '2026-03-29',
        category: 'updates',
        tags: ['performance'],
        readTime: 6
    },
    {
        slug: 'colorflow-advanced-pathing-strategies',
        title: {
            en: 'Advanced Pathing Strategies for ColorFlow 9x9 Grids',
            ko: 'ColorFlow 9x9 레벨의 경로 탐색 고급 전략 완벽 가이드',
            ja: 'ColorFlow 9x9グリッドのための高度な経路探索戦略',
            zh: 'ColorFlow 9x9网格的高级路径策略',
            es: 'Estrategias de Rutas Avanzadas para Cuadrículas de 9x9 en ColorFlow'
        },
        description: {
            en: 'Master the massive 9x9 levels in ColorFlow. Learn advanced path-routing strategies, edge-hugging techniques, and how to reliably achieve the Flow Bonus.',
            ko: '거대한 9x9 레벨을 마스터하세요. 외곽 경로 우회, 교차점 회피, 완벽한 플로우 보너스 획득을 위한 고급 전략을 배웁니다.',
            ja: 'ColorFlowの巨大な9x9レベルをマスターしよう。高度な経路ルーティング戦略、エッジハギング技術、そしてフローボーナスを確実に獲得する方法を学びます。',
            zh: '掌握ColorFlow中巨大的9x9关卡。学习高级路径规划策略、贴边技巧以及如何可靠地获得流动奖励。',
            es: 'Domina los enormes niveles de 9x9 en ColorFlow. Aprende estrategias avanzadas de enrutamiento, técnicas de abrazar los bordes y cómo conseguir el Bono de Flujo de manera confiable.'
        },
        date: '2026-03-29',
        category: 'strategy',
        tags: ['colorflow', 'strategy', 'tips'],
        readTime: 7
    },
    {
        slug: 'the-math-behind-sortstack',
        title: {
          "en": "SortStack Puzzle Generation and Move Limits",
          "ko": "SortStack의 퍼즐 생성 방식과 이동 제한",
          "ja": "SortStackのパズル生成と手数制限",
          "zh": "SortStack的谜题生成与步数限制",
          "es": "Cómo genera SortStack sus puzzles y límites de movimientos"
},
        description: {
          "en": "How SortStack builds a starting board with reverse moves, why that differs from finding a shortest solution, and how to use spare tubes effectively.",
          "ko": "SortStack의 역방향 이동 생성 방식, 최단 풀이와 이동 제한의 차이, 빈 튜브를 활용하는 판단 기준을 설명합니다.",
          "ja": "逆向きの移動で盤面を作る仕組みと、最短解や手数制限との違いを説明。空のチューブを使う判断にも役立ちます。",
          "zh": "了解SortStack如何通过反向移动生成棋盘、为何这不等于最短解证明，以及如何更有效地使用空管。",
          "es": "El generador por movimientos inversos de SortStack, su diferencia con una solución mínima y formas de aprovechar los tubos vacíos."
},
        date: '2026-03-29',
        category: 'science',
        tags: ['sortstack', 'math', 'strategy'],
        readTime: 6
    },
    {
        slug: '5-tips-to-boost-your-brain-with-puzzles',
        title: {
            en: 'Five Practical Ways to Enjoy PuzzleVault',
            ko: 'PuzzleVault를 더 즐겁게 플레이하는 다섯 가지 방법',
            ja: 'PuzzleVaultを楽しく遊ぶための5つのヒント',
            zh: '更愉快地玩PuzzleVault的五个实用方法',
            es: 'Cinco formas prácticas de disfrutar de PuzzleVault'
        },
        description: {
            en: "Choose a clear goal, read the feedback, leave room for your next move, and build a puzzle session that feels satisfying.",
            ko: "작은 목표 정하기, 피드백 읽기, 다음 수를 위한 공간 남기기와 같은 조건에서 다시 도전하는 실용적인 퍼즐 팁입니다.",
            ja: "小さな目標、フィードバック、次の一手の空間、同じ条件での再挑戦を使う実用的な遊び方。",
            zh: "设定小目标，读懂反馈，为下一步留空间，用相同条件练习，并在自己选择的节点休息。",
            es: "Elige una meta, interpreta las pistas, reserva espacio para el próximo movimiento y practica en condiciones comparables."
        },
        date: '2026-03-01',
        category: 'tips',
        tags: ['memory', 'patternpop', 'numvault', 'brain'],
        readTime: 5
    },
    {
        slug: 'gridsmash-beginner-strategy-guide',
        title: {
          "en": "GridSmash Strategy: Leave Space and Plan Your Clears",
          "ko": "GridSmash 전략: 공간을 남기고 다음 줄 지우기",
          "ja": "GridSmash攻略：空間を残して次の消去を考える",
          "zh": "GridSmash攻略：保留空间，规划下一次消除",
          "es": "Estrategia de GridSmash: deja espacio y prepara las líneas"
},
        description: {
          "en": "Practical GridSmash decisions: fit the whole tray, preserve useful spaces, understand clearing streaks, and plan around special blocks and the Shatter Zone.",
          "ko": "세 조각을 함께 계획하고 빈 공간을 지키는 GridSmash 공략입니다. 연속 줄 완성, 특수 블록, Shatter Zone의 실제 작동도 설명합니다.",
          "ja": "3つのピースをまとめて考え、使える空間を守る攻略。連続消去、特殊ブロック、Shatter Zoneの実際の動きも説明します。",
          "zh": "把三块拼块一起考虑，保留可用空位，并理解连续消除、特殊方块与Shatter Zone的实际规则。",
          "es": "Planifica las tres piezas, conserva espacios útiles y entiende las rachas, los bloques especiales y la Zona de Destrucción de GridSmash."
},
        date: '2026-02-25',
        category: 'strategy',
        tags: ['gridsmash', 'strategy', 'tips'],
        readTime: 5
    },
    {
        slug: 'daily-challenge-streak-tips',
        title: {
            en: 'How to Build a 30-Day Daily Challenge Streak',
            ko: '30일 데일리 챌린지 연속 기록을 만드는 방법',
            ja: '30日間デイリーチャレンジ連続記録を作る方法',
            zh: '如何建立30天每日挑战连胜记录',
            es: 'Cómo Construir una Racha de 30 Días en los Desafíos Diarios'
        },
        description: {
          "en": "Choose an optional puzzle routine, understand UTC daily resets and local records, and practice at your own pace.",
          "ko": "UTC 기준 데일리 갱신과 브라우저 기록을 이해하고, 내 속도에 맞춰 즐겁게 반복 연습하는 방법입니다.",
          "ja": "UTC基準のデイリー更新とブラウザ内の記録を知り、自分のペースでパズルを楽しむためのヒント。",
          "zh": "了解UTC每日更新和浏览器本地记录，按自己的节奏选择练习与休息。",
          "es": "Elige una rutina opcional, conoce el reinicio diario en UTC y los registros locales, y practica a tu ritmo."
},
        date: '2026-02-20',
        category: 'tips',
        tags: ['daily', 'numvault', 'gridsmash', 'colorflow', 'streak'],
        readTime: 5
    },
    {
        slug: 'welcome-to-puzzlevault',
        title: {
            en: 'Welcome to PuzzleVault — 10 Free Brain Games',
            ko: 'PuzzleVault에 오신 것을 환영합니다 — 10가지 무료 두뇌 게임',
            ja: 'PuzzleVaultへようこそ — 10種類の無料脳トレゲーム',
            zh: '欢迎来到PuzzleVault — 10款免费益智游戏',
            es: 'Bienvenido a PuzzleVault — 10 Juegos Cerebrales Gratuitos'
        },
        description: {
            en: 'Introducing PuzzleVault: 10 unique, free browser-based puzzle games. From number deduction to hexagonal matching, discover your next brain challenge.',
            ko: 'PuzzleVault 소개: 숫자 추론부터 육각형 매칭까지, 10가지 독특한 무료 브라우저 퍼즐 게임으로 다음 두뇌 도전을 발견하세요.',
            ja: 'PuzzleVaultの紹介：数字推理から六角形マッチングまで、10種類のユニークな無料ブラウザパズルゲームで次の脳トレに挑戦。',
            zh: '介绍PuzzleVault：从数字推理到六角匹配，10款独特的免费浏览器益智游戏，发现你的下一个大脑挑战。',
            es: 'Presentamos PuzzleVault: 10 juegos de puzzles únicos y gratuitos en el navegador. Desde deducción numérica hasta emparejamiento hexagonal.'
        },
        date: '2026-02-15',
        category: 'updates',
        tags: ['launch', 'all-games'],
        readTime: 3
    },
    {
        slug: 'numvault-tips-and-strategy',
        title: {
          "en": "NumVault Strategy: Read Every Clue",
          "ko": "NumVault 전략: 단서를 끝까지 읽는 방법",
          "ja": "NumVault攻略：すべての手掛かりを読む",
          "zh": "NumVault攻略：读懂每一条线索",
          "es": "Estrategia de NumVault: interpreta cada pista"
},
        description: {
          "en": "Use NumVault’s position clues, handle repeated digits correctly, and choose informative guesses without assuming a fixed number of attempts will always work.",
          "ko": "자리 단서와 중복 숫자를 정확히 해석하고, 남은 시도에 맞춰 정보를 얻는 NumVault 추측 전략을 알아봅니다.",
          "ja": "位置のヒントと重複数字を正しく読み、残りの回数に合わせて情報を得るNumVaultの考え方を紹介します。",
          "zh": "正确理解位置提示和重复数字，根据剩余次数选择有信息价值的猜测，而不假定固定次数内必能解开所有密码。",
          "es": "Interpreta posiciones y dígitos repetidos, y elige intentos informativos en NumVault sin asumir que todos los códigos se resuelven en una cifra fija de jugadas."
},
        date: '2026-02-28',
        category: 'strategy',
        tags: ['numvault', 'tips', 'strategy'],
        readTime: 4
    }
];

/**
 * Get blog posts, optionally filtered by category and limited.
 * Returns posts sorted by date (newest first) with localized title/description.
 * @param {number} [count] — Max posts to return (undefined = all)
 * @param {string} [category] — Filter by category
 * @returns {Array}
 */
function getBlogPosts(count, category) {
    let posts = [...BLOG_POSTS];

    if (category) {
        posts = posts.filter(p => p.category === category);
    }

    // Sort by date descending
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (count) {
        posts = posts.slice(0, count);
    }

    // Resolve localized title/description and URL
    const lang = (typeof I18n !== 'undefined' && I18n.currentLang) ? I18n.currentLang : 'en';
    return posts.map(p => ({
        ...p,
        title: (typeof p.title === 'object') ? (p.title[lang] || p.title.en) : p.title,
        description: (typeof p.description === 'object') ? (p.description[lang] || p.description.en) : p.description,
        url: lang === 'en' ? `/blog/posts/${p.slug}.html` : `/blog/${lang}/${p.slug}.html`
    }));
}

/**
 * Get related posts based on matching tags.
 * Excludes the current post.
 * @param {string} currentSlug — Slug of the current post
 * @param {number} [count=3] — Number of related posts to return
 * @returns {Array}
 */
function getRelatedPosts(currentSlug, count = 3) {
    const current = BLOG_POSTS.find(p => p.slug === currentSlug);
    if (!current) return getBlogPosts(count);

    const others = BLOG_POSTS.filter(p => p.slug !== currentSlug);

    const lang = (typeof I18n !== 'undefined' && I18n.currentLang) ? I18n.currentLang : 'en';

    // Score by tag overlap
    const scored = others.map(post => {
        const overlap = post.tags.filter(t => current.tags.includes(t)).length;
        return {
            ...post,
            title: (typeof post.title === 'object') ? (post.title[lang] || post.title.en) : post.title,
            description: (typeof post.description === 'object') ? (post.description[lang] || post.description.en) : post.description,
            url: lang === 'en' ? `/blog/posts/${post.slug}.html` : `/blog/${lang}/${post.slug}.html`,
            score: overlap
        };
    });

    // Sort by score desc, then date desc
    scored.sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date));

    return scored.slice(0, count);
}

/**
 * Get related game cards for tags that match game IDs.
 * Tags like 'numvault', 'gridsmash' map to PV_GAMES entries.
 * @param {string[]} tags — Tag array from a blog post
 * @returns {Array<{id: string, emoji: string, name: string, tagline: string, path: string}>}
 */
function getRelatedGames(tags) {
    if (typeof PV_GAMES === 'undefined') return [];
    const games = [];
    tags.forEach(tag => {
        if (PV_GAMES[tag] && !games.find(g => g.id === tag)) {
            games.push({ id: tag, ...PV_GAMES[tag] });
        }
    });
    return games;
}
