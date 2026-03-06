/* ===================================================
   PuzzleVault — Internationalization Engine (i18n.js)
   Client-side translation with 5 languages
   =================================================== */

const I18n = {
    currentLang: 'en',
    translations: {},
    supportedLangs: [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'ko', name: '한국어', flag: '🇰🇷' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' },
        { code: 'zh', name: '中文', flag: '🇨🇳' },
        { code: 'es', name: 'Español', flag: '🇪🇸' }
    ],

    async init() {
        // 1. Check localStorage
        const saved = localStorage.getItem('pv_lang');
        if (saved && this.supportedLangs.some(l => l.code === saved)) {
            this.currentLang = saved;
        } else {
            // 2. Auto-detect browser language
            const browserLang = (navigator.language || navigator.userLanguage || 'en').slice(0, 2).toLowerCase();
            const match = this.supportedLangs.find(l => l.code === browserLang);
            this.currentLang = match ? match.code : 'en';
        }

        // Sync cookie for Cloudflare Pages Functions middleware
        document.cookie = `pv_lang=${this.currentLang}; path=/; max-age=31536000`;

        // 3. Load language file
        await this.loadLang(this.currentLang);
        // 4. Apply to page
        this.applyAll();
        // 5. Update html lang attribute
        document.documentElement.lang = this.currentLang;
    },

    async loadLang(langCode) {
        try {
            const resp = await fetch('/lang/' + langCode + '.json');
            if (!resp.ok) throw new Error('Language file not found');
            this.translations = await resp.json();
            this.currentLang = langCode;
        } catch (e) {
            if (langCode !== 'en') {
                try {
                    const resp = await fetch('/lang/en.json');
                    if (resp.ok) {
                        this.translations = await resp.json();
                        this.currentLang = 'en';
                    }
                } catch (e2) {
                    // Silent fallback
                }
            }
        }
    },

    t(key, replacements) {
        const keys = key.split('.');
        let result = this.translations;
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            } else {
                return key; // Return key itself as fallback
            }
        }
        // Template replacements: t('game.zone', { turns: 3 })
        if (typeof result === 'string' && replacements) {
            for (const [k, v] of Object.entries(replacements)) {
                result = result.replace(new RegExp('\\{' + k + '\\}', 'g'), v);
            }
        }
        return result;
    },

    applyAll() {
        // data-i18n: textContent
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translated = this.t(key);
            if (typeof translated === 'string') {
                el.textContent = translated;
            }
        });

        // data-i18n-html: innerHTML (for HTML content)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const translated = this.t(key);
            if (typeof translated === 'string') {
                el.innerHTML = translated;
            }
        });

        // data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
        });

        // data-i18n-title (tooltip)
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.title = this.t(el.getAttribute('data-i18n-title'));
        });

        // Meta description
        const i18nDesc = document.querySelector('meta[data-i18n-content]');
        const metaDesc = document.querySelector('meta[name="description"]');
        if (i18nDesc && metaDesc) {
            metaDesc.content = this.t(i18nDesc.getAttribute('data-i18n-content'));
        }

        // Page title
        const titleKey = document.documentElement.getAttribute('data-i18n-title');
        if (titleKey) {
            document.title = this.t(titleKey);
        }

        // data-lang: show/hide language-specific content
        document.querySelectorAll('[data-lang]').forEach(el => {
            el.style.display = el.getAttribute('data-lang') === this.currentLang ? '' : 'none';
        });
    },

    async switchLang(langCode) {
        if (langCode === this.currentLang) return;
        localStorage.setItem('pv_lang', langCode);
        document.cookie = `pv_lang=${langCode}; path=/; max-age=31536000`;
        this.currentLang = langCode;
        await this.loadLang(langCode);
        this.applyAll();
        document.documentElement.lang = langCode;
        // Dispatch event for game scripts to react
        window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: langCode } }));
    },

    formatNumber(n) {
        return n.toLocaleString(this.currentLang);
    },

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString(this.currentLang, { year: 'numeric', month: 'short', day: 'numeric' });
    }
};
