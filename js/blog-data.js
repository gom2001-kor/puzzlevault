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
            en: 'Why We Built PuzzleVault with Vanilla JS (No Frameworks)',
            ko: '퍼즐볼트가 React 대신 바닐라 자바스크립트를 선택한 이유',
            ja: 'PuzzleVaultがVanilla JSで構築された理由（フレームワーク不使用）',
            zh: '为什么我们使用原生JS构建PuzzleVault（不使用框架）',
            es: 'Por Qué Construimos PuzzleVault con Vanilla JS (Sin Frameworks)'
        },
        description: {
            en: 'Discover why PuzzleVault rejected modern JavaScript frameworks like React and Vue, opting for pure Vanilla JS to ensure peak performance and zero loading times.',
            ko: '가장 빠른 로딩 시간과 최고의 성능을 위해 PuzzleVault가 React나 Vue 같은 최신 프레임워크를 버리고 순수 바닐라 JS를 선택한 이유를 알아봅니다.',
            ja: 'PuzzleVaultがReactやVueのような最新のJavaScriptフレームワークを却下し、最高のパフォーマンスとゼロのロード時間を確保するために純粋なVanilla JSを選んだ理由を発見してください。',
            zh: '了解为什么PuzzleVault拒绝使用React和Vue等现代JavaScript框架，而选择纯原生JS以确保峰值性能和零加载时间。',
            es: 'Descubre por qué PuzzleVault rechazó frameworks de JavaScript modernos como React y Vue, optando por puro Vanilla JS para asegurar un rendimiento máximo y tiempos de carga cero.'
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
            en: 'The Math Behind SortStack: Guaranteeing Every Puzzle is Solvable',
            ko: 'SortStack 퍼즐 디자인에 숨겨진 수학: 모든 퍼즐이 100% 풀리는 원리',
            ja: 'SortStackの背後にある数学：すべてのパズルが解けることを保証する方法',
            zh: 'SortStack背后的数学：保证每个谜题都可解',
            es: 'Las Matemáticas Detrás de SortStack: Garantizando que Cada Puzzle Tenga Solución'
        },
        description: {
            en: 'Ever wonder if a sorting puzzle is actually impossible? Discover the mathematical reverse-moves algorithm PuzzleVault utilizes to ensure every level is 100% solvable.',
            ko: '퍼즐을 풀다가 아예 풀 수 없는 문제라고 의심해본 적이 있나요? PuzzleVault가 무작위 배치를 거부하고 역추적 백트래킹 수학 알고리즘을 사용한 이유를 밝힙니다.',
            ja: '並べ替えパズルが本当に不可能だと疑問に思ったことはありませんか？PuzzleVaultがすべてのレベルで100%解けることを保証するために利用している数学的なリバースムーブアルゴリズムを発見してください。',
            zh: '有没有想过排序拼图是否实际上是不可能的？发现PuzzleVault用来确保每个关卡100%可解的数学反向移动算法。',
            es: '¿Alguna vez te has preguntado si un puzzle de clasificación es realmente imposible? Descubre el algoritmo matemático de movimientos inversos que utiliza PuzzleVault para asegurar que cada nivel sea 100% resoluble.'
        },
        date: '2026-03-29',
        category: 'science',
        tags: ['sortstack', 'math', 'strategy'],
        readTime: 6
    },
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
            en: 'Discover how daily puzzle play strengthens memory, sharpens focus, and builds cognitive resilience — backed by real research.',
            ko: '매일 퍼즐을 풀면 기억력이 강화되고, 집중력이 높아지며, 인지 회복력이 향상된다는 연구 결과를 알아보세요.',
            ja: '毎日のパズルプレイが記憶力を強化し、集中力を高め、認知的レジリエンスを構築する方法を発見しましょう。',
            zh: '了解每日益智游戏如何增强记忆力、提高注意力并建立认知韧性——基于真实研究。',
            es: 'Descubra cómo jugar puzzles diariamente fortalece la memoria, agudiza la concentración y construye resiliencia cognitiva.'
        },
        date: '2026-03-01',
        category: 'science',
        tags: ['memory', 'patternpop', 'numvault', 'brain'],
        readTime: 5
    },
    {
        slug: 'gridsmash-beginner-strategy-guide',
        title: {
            en: "GridSmash Beginner's Guide: Score 10,000+ Every Time",
            ko: 'GridSmash 초보자 가이드: 매번 10,000점 이상 달성하기',
            ja: 'GridSmash初心者ガイド：毎回10,000点以上を獲得する方法',
            zh: 'GridSmash新手攻略：每次达到10,000分以上',
            es: 'Guía para Principiantes de GridSmash: Cómo Conseguir 10,000+ Puntos'
        },
        description: {
            en: 'Master block placement, dominate the Shatter Zone, and use special blocks like a pro with these proven GridSmash strategies.',
            ko: '블록 배치를 마스터하고, 셰터 존을 지배하며, 검증된 GridSmash 전략으로 특수 블록을 프로처럼 활용하세요.',
            ja: 'ブロック配置をマスターし、シャッターゾーンを制覇し、実証済みのGridSmash攻略法でスペシャルブロックをプロのように使いこなそう。',
            zh: '掌握方块放置技巧，统治粉碎区，用这些经过验证的GridSmash策略像专业玩家一样使用特殊方块。',
            es: 'Domina la colocación de bloques, controla la Zona de Destrucción y usa los bloques especiales como un profesional con estas estrategias probadas.'
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
            en: 'Practical tips and game-specific strategies to build an unbreakable daily puzzle habit and keep your streak alive.',
            ko: '깨지지 않는 매일 퍼즐 습관을 만들고 연속 기록을 유지하기 위한 실용적인 팁과 게임별 전략.',
            ja: '壊れない毎日のパズル習慣を作り、連続記録を維持するための実用的なヒントとゲーム別攻略法。',
            zh: '建立不可打破的每日益智习惯并保持连胜记录的实用技巧和游戏策略。',
            es: 'Consejos prácticos y estrategias específicas para construir un hábito diario de puzzles inquebrantable.'
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
            en: 'How to Master Number Puzzles: Tips for NumVault',
            ko: '숫자 퍼즐 마스터하기: NumVault 공략 팁',
            ja: '数字パズルをマスターする方法：NumVault攻略のコツ',
            zh: '如何掌握数字谜题：NumVault攻略技巧',
            es: 'Cómo Dominar los Puzzles Numéricos: Consejos para NumVault'
        },
        description: {
            en: 'Master NumVault with these proven number deduction strategies. Learn systematic elimination, first-guess tactics, and how to solve any code in 6 tries or fewer.',
            ko: '검증된 숫자 추론 전략으로 NumVault를 마스터하세요. 체계적 소거법, 첫 번째 추측 전술, 6번 이내로 모든 코드를 풀는 방법을 알아보세요.',
            ja: '実証済みの数字推理戦略でNumVaultをマスターしよう。体系的消去法、初手のテクニック、6回以内で任意のコードを解く方法を学びます。',
            zh: '用这些经过验证的数字推理策略掌握NumVault。学习系统排除法、首次猜测技巧，以及如何在6次以内破解任何密码。',
            es: 'Domina NumVault con estas estrategias de deducción numérica probadas. Aprende eliminación sistemática y cómo resolver cualquier código en 6 intentos o menos.'
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
