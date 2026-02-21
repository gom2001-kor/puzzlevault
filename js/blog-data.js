/* ===================================================
   PuzzleVault — Blog Post Registry (blog-data.js)
   =================================================== */

/**
 * Blog post data. Adding a new post:
 * 1. Add entry to BLOG_POSTS below
 * 2. Create /blog/posts/[slug].html using the post template
 * 3. Blog listing page auto-updates
 */
const BLOG_POSTS = [
    {
        slug: 'how-to-improve-memory-with-puzzle-games',
        title: 'How to Improve Memory with Puzzle Games',
        description: 'Science-backed tips on using puzzles to boost your brain power and sharpen your memory.',
        date: '2026-03-01',
        category: 'science',
        tags: ['memory', 'brain', 'patternpop'],
        readTime: 5
    },
    {
        slug: '5-gridsmash-strategies-for-higher-scores',
        title: '5 GridSmash Strategies for Higher Scores',
        description: 'Master the art of block placement with these expert strategies for maximizing combos.',
        date: '2026-02-25',
        category: 'strategy',
        tags: ['gridsmash', 'strategy', 'tips'],
        readTime: 4
    },
    {
        slug: 'the-cognitive-benefits-of-daily-puzzles',
        title: 'The Cognitive Benefits of Daily Puzzles',
        description: 'Research shows that daily puzzle solving improves problem-solving skills and mental agility.',
        date: '2026-02-20',
        category: 'science',
        tags: ['brain', 'daily', 'numvault', 'quickcalc'],
        readTime: 6
    },
    {
        slug: 'beginners-guide-to-number-deduction',
        title: "Beginner's Guide to Number Deduction",
        description: 'Learn the basics of logical deduction to crack the code faster in number puzzles.',
        date: '2026-02-15',
        category: 'tips',
        tags: ['numvault', 'beginner', 'strategy'],
        readTime: 5
    },
    {
        slug: 'welcome-to-puzzlevault',
        title: 'Welcome to PuzzleVault!',
        description: 'Introducing PuzzleVault — 10 free browser-based puzzle games to challenge your mind every day.',
        date: '2026-02-10',
        category: 'updates',
        tags: ['announcement', 'launch'],
        readTime: 3
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
