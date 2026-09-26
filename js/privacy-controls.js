/* Optional analytics are off until explicitly enabled. This is not an advertising CMP. */
(function (root) {
    'use strict';
    const KEY = 'pv_privacy_v1';
    const ANALYTICS_ID = 'G-K90N7DX7S6';
    const text = {
        en: ['Privacy choices', 'Play first. Your privacy, your choice.', 'Game progress stays in this browser. Optional Google Analytics helps us understand which games work well. It stays off unless you allow it. You can change this choice in the footer.', 'Essential only', 'Allow analytics', 'Privacy policy', 'Choice saved. Changes apply from the next page.', 'Close'],
        ko: ['개인정보 설정', '즐거운 게임, 내가 선택하는 개인정보 설정', '게임 기록은 이 브라우저에 저장됩니다. 선택 사항인 Google Analytics는 게임 이용 개선에 사용되며 허용하기 전에는 실행되지 않습니다. 언제든 하단에서 선택을 바꿀 수 있습니다.', '필수 기능만 사용', '분석 허용', '개인정보 처리방침', '저장했습니다. 변경 사항은 다음 페이지부터 적용됩니다.', '닫기'],
        ja: ['プライバシー設定', '遊び方も、プライバシーも自分で選ぶ。', 'ゲームの記録はこのブラウザに保存されます。任意のGoogle Analyticsはゲームの改善に使われ、許可するまで動作しません。ページ下部からいつでも変更できます。', '必要な機能のみ', '分析を許可', 'プライバシーポリシー', '保存しました。次のページから適用されます。', '閉じる'],
        zh: ['隐私设置', '享受游戏，自主选择隐私设置。', '游戏记录保存在当前浏览器中。可选的Google Analytics用于改进游戏体验，在您允许之前不会运行。您可以随时在页脚更改选择。', '仅必要功能', '允许分析', '隐私政策', '已保存。更改从下一页开始生效。', '关闭'],
        es: ['Opciones de privacidad', 'Disfruta del juego. Tú eliges tu privacidad.', 'El progreso se guarda en este navegador. Google Analytics es opcional y nos ayuda a mejorar los juegos. No se inicia sin tu permiso. Puedes cambiar tu elección en el pie de página.', 'Solo lo necesario', 'Permitir análisis', 'Política de privacidad', 'Guardado. Los cambios se aplican desde la próxima página.', 'Cerrar']
    };
    let preference = null;
    let started = false;
    let previousFocus;
    const locale = () => typeof I18n !== 'undefined' && text[I18n.currentLang] ? I18n.currentLang : (text[document.documentElement.lang] ? document.documentElement.lang : 'en');
    const words = () => text[locale()];
    const privacyPath = () => (locale() === 'en' ? '' : '/' + locale()) + '/privacy.html';
    try {
        const stored = JSON.parse(root.localStorage.getItem(KEY));
        if (stored && stored.version === 1 && typeof stored.analytics === 'boolean') preference = stored;
    } catch (_) { /* Denied by default when storage is unavailable. */ }

    function startAnalytics() {
        // Local previews and test environments must not pollute production analytics.
        if (started || !preference || !preference.analytics || root.location.hostname !== 'puzzlevault.pages.dev') return;
        started = true;
        root['ga-disable-' + ANALYTICS_ID] = false;
        root.dataLayer = root.dataLayer || [];
        root.gtag = function () { root.dataLayer.push(arguments); };
        root.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
        root.gtag('js', new Date());
        root.gtag('config', ANALYTICS_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ANALYTICS_ID;
        script.id = 'pv-optional-analytics';
        document.head.appendChild(script);
    }

    function forgetAnalyticsCookies() {
        // Remove only Google Analytics cookies, never game saves or third-party cookies.
        document.cookie.split(';').forEach(item => {
            const name = item.split('=')[0].trim();
            if (!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) return;
            ['', '; domain=' + root.location.hostname, '; domain=.' + root.location.hostname].forEach(domain => {
                document.cookie = name + '=; Max-Age=0; path=/' + domain;
            });
        });
    }

    function choose(allow) {
        preference = { version: 1, analytics: allow === true };
        try { root.localStorage.setItem(KEY, JSON.stringify(preference)); } catch (_) { /* In-memory choice for this page. */ }
        if (!preference.analytics) {
            root['ga-disable-' + ANALYTICS_ID] = true;
            if (typeof root.gtag === 'function') root.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
            forgetAnalyticsCookies();
        }
        close();
        const status = document.getElementById('pv-privacy-status');
        if (status) status.textContent = words()[6];
        // Changing permission never reloads a live game. Enable at the next navigation.
    }

    function close() {
        const panel = document.getElementById('pv-privacy-dialog');
        if (panel) panel.remove();
        if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    }

    function open() {
        if (document.getElementById('pv-privacy-dialog')) return;
        previousFocus = document.activeElement;
        const w = words();
        const overlay = document.createElement('div');
        overlay.id = 'pv-privacy-dialog';
        overlay.className = 'pv-privacy-overlay';
        const panel = document.createElement('section');
        panel.className = 'pv-privacy-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'pv-privacy-title');
        const title = document.createElement('h2'); title.id = 'pv-privacy-title'; title.textContent = w[1];
        const description = document.createElement('p'); description.textContent = w[2];
        const actions = document.createElement('div'); actions.className = 'pv-privacy-actions';
        [false, true].forEach((allow, index) => {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'pv-btn pv-btn-secondary';
            button.textContent = w[3 + index]; button.onclick = () => choose(allow); actions.appendChild(button);
        });
        const policy = document.createElement('a'); policy.href = privacyPath(); policy.textContent = w[5];
        const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.className = 'pv-privacy-close'; dismiss.textContent = w[7]; dismiss.onclick = close;
        panel.append(title, description, actions, policy, dismiss); overlay.appendChild(panel); document.body.appendChild(overlay);
        actions.querySelector('button').focus();
        overlay.addEventListener('keydown', event => {
            // A dialog choice must never also submit a guess or move the board behind it.
            event.stopPropagation();
            if (event.key === 'Escape') { event.preventDefault(); close(); }
            if (event.key === 'Tab') {
                const focusable = Array.from(panel.querySelectorAll('button, a'));
                const first = focusable[0], last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        });
    }

    function installControls() {
        const footer = document.getElementById('pv-footer');
        if (!footer) return;
        let controls = document.getElementById('pv-privacy-controls');
        if (!controls) {
            controls = document.createElement('div'); controls.id = 'pv-privacy-controls'; controls.className = 'pv-privacy-controls';
            const button = document.createElement('button'); button.type = 'button'; button.onclick = open;
            const status = document.createElement('span'); status.id = 'pv-privacy-status'; status.setAttribute('role', 'status');
            controls.append(button, status); footer.appendChild(controls);
        }
        controls.querySelector('button').textContent = words()[0];
        document.querySelectorAll('[data-privacy-settings]').forEach(button => { button.onclick = open; });
    }

    root.PVPrivacy = { open, choose, getChoice: () => ({ analytics: !!(preference && preference.analytics) }) };
    document.addEventListener('DOMContentLoaded', () => { installControls(); startAnalytics(); });
    root.addEventListener('pvReady', installControls);
    root.addEventListener('langchange', () => queueMicrotask(installControls));
} (window));
