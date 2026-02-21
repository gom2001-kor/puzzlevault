/* ===================================================
   PuzzleVault — Shared UI Components (common.js)
   Header, Footer, Cross-Promo, Stats, Page Init
   =================================================== */

/* --- Game Registry --- */
const PV_GAMES = {
    numvault: { emoji: '🔢', name: 'NumVault', tagline: 'Number Deduction Puzzle', path: '/games/numvault.html' },
    gridsmash: { emoji: '🧱', name: 'GridSmash', tagline: 'Block Placement Puzzle', path: '/games/gridsmash.html' },
    patternpop: { emoji: '🧠', name: 'PatternPop', tagline: 'Pattern Memory', path: '/games/patternpop.html' },
    sortstack: { emoji: '📚', name: 'SortStack', tagline: 'Color Sorting', path: '/games/sortstack.html' },
    quickcalc: { emoji: '⚡', name: 'QuickCalc', tagline: 'Speed Math Arcade', path: '/games/quickcalc.html' },
    tileturn: { emoji: '🔄', name: 'TileTurn', tagline: 'Tile Flip Puzzle', path: '/games/tileturn.html' },
    colorflow: { emoji: '🎨', name: 'ColorFlow', tagline: 'Color Path Connection', path: '/games/colorflow.html' },
    pipelink: { emoji: '🔧', name: 'PipeLink', tagline: 'Circuit Connection Puzzle', path: '/games/pipelink.html' },
    mergechain: { emoji: '🔮', name: 'MergeChain', tagline: 'Number Merge', path: '/games/mergechain.html' },
    hexmatch: { emoji: '⬡', name: 'HexMatch', tagline: 'Hexagonal Color Match', path: '/games/hexmatch.html' },
};

/* --- Cross-Promotion Map --- */
const CROSS_PROMO_MAP = {
    numvault: ['gridsmash', 'patternpop', 'quickcalc'],
    gridsmash: ['hexmatch', 'mergechain', 'numvault'],
    colorflow: ['pipelink', 'tileturn', 'sortstack'],
    mergechain: ['gridsmash', 'hexmatch', 'numvault'],
    patternpop: ['numvault', 'quickcalc', 'tileturn'],
    tileturn: ['colorflow', 'pipelink', 'patternpop'],
    pipelink: ['colorflow', 'tileturn', 'sortstack'],
    sortstack: ['colorflow', 'pipelink', 'tileturn'],
    quickcalc: ['patternpop', 'numvault', 'mergechain'],
    hexmatch: ['gridsmash', 'mergechain', 'sortstack'],
};

/* --- Navigation Links --- */
const NAV_LINKS = [
    { label: 'Home', href: '/' },
    { label: 'Games', href: '/#games' },
    { label: 'Blog', href: '/blog/' },
    { label: 'About', href: '/about.html' },
];

/* --- Header --- */
/**
 * Render the site header with logo and navigation.
 * Inserts into <header id="pv-header"> or prepends to <body>.
 */
function renderHeader() {
    const header = document.createElement('header');
    header.className = 'pv-header';
    header.id = 'pv-header';

    const inner = document.createElement('div');
    inner.className = 'pv-header-inner';

    // Logo
    const logo = document.createElement('a');
    logo.className = 'pv-logo';
    logo.href = '/';
    logo.innerHTML = '<span class="pv-logo-icon">🧩</span><span>PuzzleVault</span>';

    // Nav
    const nav = document.createElement('nav');
    nav.className = 'pv-nav';
    nav.id = 'pv-nav';

    NAV_LINKS.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.label;
        // Highlight active page
        if (window.location.pathname === link.href ||
            (link.href !== '/' && window.location.pathname.startsWith(link.href))) {
            a.classList.add('active');
        }
        nav.appendChild(a);
    });

    // Mobile menu toggle
    const toggle = document.createElement('button');
    toggle.className = 'pv-menu-toggle';
    toggle.setAttribute('aria-label', 'Toggle menu');
    toggle.innerHTML = '☰';
    toggle.addEventListener('click', () => {
        nav.classList.toggle('open');
        toggle.innerHTML = nav.classList.contains('open') ? '✕' : '☰';
    });

    inner.appendChild(logo);
    inner.appendChild(nav);
    inner.appendChild(toggle);
    header.appendChild(inner);

    // Insert at top of body
    const existingHeader = document.getElementById('pv-header');
    if (existingHeader) {
        existingHeader.replaceWith(header);
    } else {
        document.body.prepend(header);
    }
}

/* --- Footer --- */
/**
 * Render the site footer with links and copyright.
 * Inserts into <footer id="pv-footer"> or appends to <body>.
 */
function renderFooter() {
    const footer = document.createElement('footer');
    footer.className = 'pv-footer';
    footer.id = 'pv-footer';

    const inner = document.createElement('div');
    inner.className = 'pv-footer-inner';

    // Footer links
    const links = document.createElement('div');
    links.className = 'pv-footer-links';

    const footerLinks = [
        { label: 'About', href: '/about.html' },
        { label: 'Privacy', href: '/privacy.html' },
        { label: 'Terms', href: '/terms.html' },
        { label: 'Contact', href: '/contact.html' },
        { label: 'Blog', href: '/blog/' },
    ];

    footerLinks.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.label;
        links.appendChild(a);
    });

    // Copyright
    const copy = document.createElement('p');
    copy.className = 'pv-footer-copy';
    const year = new Date().getFullYear();
    copy.textContent = `© ${year} PuzzleVault. All rights reserved.`;

    inner.appendChild(links);
    inner.appendChild(copy);
    footer.appendChild(inner);

    // Insert
    const existingFooter = document.getElementById('pv-footer');
    if (existingFooter) {
        existingFooter.replaceWith(footer);
    } else {
        document.body.appendChild(footer);
    }
}

/* --- Cross Promo --- */
/**
 * Render "Try Another Puzzle" section with 3 game cards.
 * @param {string} currentGameId — e.g. 'numvault'
 */
function renderCrossPromo(currentGameId) {
    const container = document.querySelector('.cross-promo');
    if (!container) return;

    const promoIds = CROSS_PROMO_MAP[currentGameId] || Object.keys(PV_GAMES).filter(id => id !== currentGameId).slice(0, 3);

    container.innerHTML = '<h2>🎮 Try Another Puzzle</h2>';
    const grid = document.createElement('div');
    grid.className = 'cross-promo-grid';

    promoIds.forEach(id => {
        const game = PV_GAMES[id];
        if (!game) return;

        const card = document.createElement('a');
        card.className = 'pv-game-card';
        card.href = game.path;
        card.innerHTML = `
      <div class="pv-game-card-icon">${game.emoji}</div>
      <div class="pv-game-card-body">
        <div class="pv-game-card-name">${game.name}</div>
        <div class="pv-game-card-tagline">${game.tagline}</div>
      </div>
    `;
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

/* --- Blog Cards --- */
/**
 * Render recent blog post cards.
 * Reads from BLOG_POSTS (defined in blog-data.js).
 * @param {number} [count=3] — Number of posts to show
 * @param {string} [category] — Optional category filter
 */
function renderBlogCards(count = 3, category) {
    if (typeof getBlogPosts !== 'function') return;

    const posts = getBlogPosts(count, category);
    const container = document.querySelector('.blog-posts-container');
    if (!container || posts.length === 0) return;

    const grid = document.createElement('div');
    grid.className = 'blog-grid';

    posts.forEach(post => {
        const card = document.createElement('a');
        card.className = 'blog-card';
        card.href = `/blog/posts/${post.slug}.html`;

        card.innerHTML = `
      <span class="blog-card-category">${post.category}</span>
      <h3 class="blog-card-title">${post.title}</h3>
      <p class="blog-card-desc">${post.description}</p>
      <span class="blog-card-meta">${post.date} · ${post.readTime} min read</span>
    `;
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

/* --- Stats System --- */
/**
 * Get global stats from localStorage.
 * @returns {{ totalGames: number, totalScore: number, bestScores: Object }}
 */
function getStats() {
    return {
        totalGames: parseInt(localStorage.getItem('pv_total_games') || '0'),
        totalScore: parseInt(localStorage.getItem('pv_total_score') || '0'),
        bestScores: JSON.parse(localStorage.getItem('pv_best_scores') || '{}'),
    };
}

/**
 * Update stats after a game completes.
 * @param {string} gameId — e.g. 'numvault'
 * @param {number} score — Score achieved
 */
function updateStats(gameId, score) {
    const totalGames = parseInt(localStorage.getItem('pv_total_games') || '0') + 1;
    const totalScore = parseInt(localStorage.getItem('pv_total_score') || '0') + score;
    localStorage.setItem('pv_total_games', totalGames);
    localStorage.setItem('pv_total_score', totalScore);

    const bestScores = JSON.parse(localStorage.getItem('pv_best_scores') || '{}');
    const bestKey = `${gameId}`;
    if (!bestScores[bestKey] || score > bestScores[bestKey]) {
        bestScores[bestKey] = score;
        localStorage.setItem('pv_best_scores', JSON.stringify(bestScores));
    }

    // Also store individual game best
    const individualKey = `pv_${gameId}_best`;
    const currentBest = parseInt(localStorage.getItem(individualKey) || '0');
    if (score > currentBest) {
        localStorage.setItem(individualKey, score);
    }
}

/* --- Utility Functions --- */
/**
 * Format a number with comma separators.
 * @param {number} n
 * @returns {string} e.g. "12,847"
 */
function formatNumber(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get today's date string in YYYY-MM-DD format (UTC).
 * @returns {string}
 */
function getTodayUTC() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Check/update daily streak for a game.
 * @param {string} gameId
 * @returns {{ current: number, isNew: boolean }}
 */
function updateStreak(gameId) {
    const today = getTodayUTC();
    const lastDaily = localStorage.getItem(`pv_${gameId}_lastDaily`);
    let streak = parseInt(localStorage.getItem(`pv_${gameId}_streak`) || '0');

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let isNew = false;
    if (lastDaily === today) {
        // Already played today
        return { current: streak, isNew: false };
    } else if (lastDaily === yesterdayStr) {
        // Consecutive day
        streak++;
        isNew = true;
    } else {
        // Streak broken
        streak = 1;
        isNew = true;
    }

    localStorage.setItem(`pv_${gameId}_streak`, streak);
    localStorage.setItem(`pv_${gameId}_lastDaily`, today);

    return { current: streak, isNew };
}

/* --- Page Initialization --- */
/**
 * Initialize common page elements.
 * Called on DOMContentLoaded for every page.
 */
function initPage() {
    renderHeader();
    renderFooter();

    // Initialize SFX on first user interaction
    document.addEventListener('pointerdown', () => {
        if (typeof SFX !== 'undefined' && !SFX.ctx) {
            SFX.init();
        }
    }, { once: true });
}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', initPage);
