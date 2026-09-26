/* Enhance server-readable cards; no article text depends on JavaScript. */
(() => {
    'use strict';
    const languages = ['en', 'ko', 'ja', 'zh', 'es'];
    document.addEventListener('DOMContentLoaded', () => {
        const filters = document.getElementById('blog-tabs');
        const cards = [...document.querySelectorAll('#blog-grid > [data-category]')];
        const count = document.getElementById('blog-result-count');
        if (filters && cards.length) {
            filters.hidden = false;
            filters.addEventListener('click', event => {
                const button = event.target.closest('button[data-category]');
                if (!button || !filters.contains(button)) return;
                filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
                cards.forEach(card => { card.hidden = Boolean(button.dataset.category && card.dataset.category !== button.dataset.category); });
                if (count) count.textContent = count.dataset.template.replace('{count}', String(cards.filter(card => !card.hidden).length));
            });
        }
    });
    window.addEventListener('langchange', event => {
        const lang = event.detail && event.detail.lang;
        if (!languages.includes(lang)) return;
        const alternate = document.querySelector('link[rel="alternate"][hreflang="' + lang + '"]');
        if (alternate) {
            const target = new URL(alternate.href);
            // Keep local previews local while using the canonical alternate path.
            if (window.location.pathname !== target.pathname) window.location.assign(target.pathname);
        }
    });
})();
