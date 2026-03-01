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
        slug: '5-tips-to-boost-your-brain-with-puzzles',
        title: '5 Science-Backed Ways Puzzle Games Boost Your Brain',
        description: 'Discover how daily puzzle play strengthens memory, sharpens focus, and builds cognitive resilience — backed by real research.',
        date: '2026-03-01',
        category: 'science',
        tags: ['memory', 'patternpop', 'numvault', 'brain'],
        readTime: 5
    },
    {
        slug: 'gridsmash-beginner-strategy-guide',
        title: "GridSmash Beginner's Guide: Score 10,000+ Every Time",
        description: 'Master block placement, dominate the Shatter Zone, and use special blocks like a pro with these proven GridSmash strategies.',
        date: '2026-02-25',
        category: 'strategy',
        tags: ['gridsmash', 'strategy', 'tips'],
        readTime: 5
    },
    {
        slug: 'daily-challenge-streak-tips',
        title: 'How to Build a 30-Day Daily Challenge Streak',
        description: 'Practical tips and game-specific strategies to build an unbreakable daily puzzle habit and keep your streak alive.',
        date: '2026-02-20',
        category: 'tips',
        tags: ['daily', 'numvault', 'gridsmash', 'colorflow', 'streak'],
        readTime: 5
    },
    {
        slug: 'welcome-to-puzzlevault',
        title: 'Welcome to PuzzleVault — 10 Free Brain Games',
        description: 'Introducing PuzzleVault: 10 unique, free browser-based puzzle games. From number deduction to hexagonal matching, discover your next brain challenge.',
        date: '2026-02-15',
        category: 'updates',
        tags: ['launch', 'all-games'],
        readTime: 3
    },
    {
        slug: 'numvault-tips-and-strategy',
        title: 'How to Master Number Puzzles: Tips for NumVault',
        description: 'Master NumVault with these proven number deduction strategies. Learn systematic elimination, first-guess tactics, and how to solve any code in 6 tries or fewer.',
        date: '2026-02-28',
        category: 'strategy',
        tags: ['numvault', 'tips', 'strategy'],
        readTime: 4
    }
];

/**
 * Get blog posts, optionally filtered by category and limited.
 * Returns posts sorted by date (newest first).
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

    return posts;
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
    if (!current) return BLOG_POSTS.slice(0, count);

    const others = BLOG_POSTS.filter(p => p.slug !== currentSlug);

    // Score by tag overlap
    const scored = others.map(post => {
        const overlap = post.tags.filter(t => current.tags.includes(t)).length;
        return { ...post, score: overlap };
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
