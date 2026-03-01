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

/* --- Mini Cross-Promo (inside Result Modal) --- */
/**
 * Render small cross-promo icons (emoji + name) inside a Result Modal.
 * @param {string} currentGameId — e.g. 'numvault'
 * @param {HTMLElement} container — The container element to render into
 */
function renderMiniCrossPromo(currentGameId, container) {
    if (!container) return;
    const promoIds = CROSS_PROMO_MAP[currentGameId];
    if (!promoIds) return;

    const wrap = document.createElement('div');
    wrap.className = 'mini-cross-promo';

    promoIds.forEach(id => {
        const game = PV_GAMES[id];
        if (!game) return;
        const a = document.createElement('a');
        a.className = 'mini-cross-promo-item';
        a.href = game.path;
        a.innerHTML = `<span class="mini-cross-promo-icon">${game.emoji}</span>${game.name}`;
        wrap.appendChild(a);
    });

    container.appendChild(wrap);
}

/* --- Hint Manager --- */
/**
 * HintManager — Manages hint system with first-free + reward ad flow.
 * Usage:
 *   HintManager.init('numvault');
 *   HintManager.requestHint(() => { revealHintLogic(); });
 */
const HintManager = {
    gameId: '',

    /**
     * Initialize hint system for a game.
     * @param {string} gameId
     */
    init(gameId) {
        this.gameId = gameId;
    },

    /**
     * Check if the session's first free hint is still available.
     * @returns {boolean}
     */
    isFirstHintFree() {
        return !sessionStorage.getItem(`pv_${this.gameId}_freeHintUsed`);
    },

    /**
     * Mark the free hint as consumed for this session.
     */
    markFreeHintUsed() {
        sessionStorage.setItem(`pv_${this.gameId}_freeHintUsed`, '1');
    },

    /**
     * Request a hint. If first hint is free, execute callback directly.
     * Otherwise, trigger a reward ad and call callback on completion.
     * @param {Function} hintCallback — The function that reveals the hint
     */
    requestHint(hintCallback) {
        if (typeof SFX !== 'undefined') SFX.play('hint');

        if (this.isFirstHintFree()) {
            this.markFreeHintUsed();
            if (typeof hintCallback === 'function') hintCallback();
        } else {
            // Require reward ad
            if (typeof AdController !== 'undefined') {
                AdController.showRewardAd(hintCallback);
            } else if (typeof hintCallback === 'function') {
                hintCallback();
            }
        }
    },

    /**
     * Create and append a 💡 Hint button with proper styling.
     * @param {HTMLElement} container — Container to append the button into
     * @param {Function} hintCallback — The function that reveals the hint
     * @returns {HTMLButtonElement} The created button element
     */
    renderHintButton(container, hintCallback) {
        const btn = document.createElement('button');
        btn.className = 'hint-btn';
        btn.id = 'hint-btn';
        btn.innerHTML = '💡 Hint <span class="hint-sublabel">(Ad)</span>';
        btn.addEventListener('click', () => {
            this.requestHint(hintCallback);
        });
        if (container) container.appendChild(btn);
        return btn;
    }
};

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

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            // Listen for update available
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                            // New version installed, handled by SW_UPDATED message
                        }
                    });
                }
            });
        });

        // Listen for SW update notification
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'SW_UPDATED') {
                // Show subtle update banner
                const banner = document.createElement('div');
                banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:var(--pv-blue,#2563EB);color:#fff;padding:12px 24px;border-radius:12px;font-size:0.9rem;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;gap:8px';
                banner.innerHTML = '🔄 New version available — <u>Refresh</u>';
                banner.onclick = () => location.reload();
                document.body.appendChild(banner);
                setTimeout(() => banner.remove(), 15000);
            }
        });
    }

    // Offline: hide ad slots gracefully
    if (!navigator.onLine) {
        document.querySelectorAll('.ad-slot, #ad-sidebar, #ad-bottom, #ad-interstitial').forEach(el => {
            el.style.display = 'none';
        });
    }
    window.addEventListener('offline', () => {
        document.querySelectorAll('.ad-slot, #ad-sidebar, #ad-bottom, #ad-interstitial').forEach(el => {
            el.style.display = 'none';
        });
    });
    window.addEventListener('online', () => {
        document.querySelectorAll('.ad-slot, #ad-sidebar, #ad-bottom').forEach(el => {
            el.style.display = '';
        });
    });
}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', initPage);
