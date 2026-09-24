/* PuzzleVault — sharing and locally rendered result cards. */

function shareLanguageText(en, ko) {
    const lang = typeof I18n !== 'undefined' ? I18n.currentLang : document.documentElement.lang;
    return String(lang || '').startsWith('ko') ? ko : en;
}

function trackShareSuccess(method) {
    // Analytics is optional. Never send result text, challenge URLs or player data.
    if (typeof gtag === 'function') {
        try { gtag('event', 'share', { method, content_type: 'game_result' }); } catch (_) { /* optional */ }
    }
}

/** Resolves to shared/copied/cancelled/failed; a dismissed share never copies. */
async function shareResult(text) {
    const value = String(text);
    if (typeof navigator.share === 'function') {
        try {
            await navigator.share({ text: value });
            trackShareSuccess('native');
            return { status: 'shared' };
        } catch (error) {
            if (error && error.name === 'AbortError') return { status: 'cancelled' };
        }
    }
    const copied = await copyToClipboard(value);
    if (copied) trackShareSuccess('clipboard');
    return { status: copied ? 'copied' : 'failed' };
}

/** Resolves to true only when a clipboard method reports success. */
async function copyToClipboard(text) {
    let copied = false;
    try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(String(text));
            copied = true;
        }
    } catch (_) { /* Try the older, user-gesture based API below. */ }
    if (!copied) {
        const previousFocus = document.activeElement;
        const textarea = document.createElement('textarea');
        textarea.value = String(text);
        textarea.setAttribute('readonly', '');
        textarea.setAttribute('aria-label', 'Share result');
        Object.assign(textarea.style, { position: 'fixed', top: '0', left: '-9999px' });
        document.body.appendChild(textarea);
        try {
            textarea.focus();
            textarea.select();
            copied = typeof document.execCommand === 'function' && document.execCommand('copy') === true;
        } catch (_) { copied = false; }
        finally {
            textarea.remove();
            if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
        }
    }
    showToast(copied
        ? shareLanguageText('Copied to clipboard!', '클립보드에 복사했어요!')
        : shareLanguageText('Could not copy. Please try sharing again.', '복사하지 못했어요. 공유를 다시 시도해 주세요.'));
    return copied;
}

/** Original Canvas artwork; no network images or HTML interpolation. */
async function downloadShareCard({ title, score, subtitle, url } = {}) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas is unavailable');
        const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
        gradient.addColorStop(0, '#101b35');
        gradient.addColorStop(1, '#25224d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1080, 1080);
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                ctx.fillStyle = (row + col) % 3 === 0 ? '#8ef0cf' : '#434a78';
                ctx.fillRect(808 + col * 58, 86 + row * 58, 42, 42);
            }
        }
        ctx.fillStyle = '#8ef0cf';
        ctx.font = 'bold 40px system-ui, sans-serif';
        ctx.fillText('PUZZLEVAULT', 80, 135);
        function fitText(value, y, size, color, maxWidth = 920) {
            let text = String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').slice(0, 180);
            let fontSize = size;
            ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
            while (ctx.measureText(text).width > maxWidth && fontSize > 28) {
                fontSize -= 2;
                ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
            }
            while (ctx.measureText(text).width > maxWidth && text.length > 1) text = text.slice(0, -2) + '…';
            ctx.fillStyle = color;
            ctx.fillText(text, 80, y);
        }
        fitText(title || shareLanguageText('Challenge accepted', '도전 완료'), 325, 64, '#ffffff');
        fitText(score == null ? shareLanguageText('Your next personal best', '다음 최고 기록에 도전') : score,
            555, 146, '#8ef0cf');
        fitText(subtitle || shareLanguageText('Your turn. Can you beat this?', '이번엔 당신 차례. 이 기록을 넘을 수 있나요?'),
            665, 38, '#d2d9ee');
        ctx.fillStyle = '#484e71';
        ctx.fillRect(80, 807, 920, 2);
        fitText(shareLanguageText('PLAY · CHALLENGE · REPEAT', '즐기고 · 도전하고 · 다시 한 판'), 882, 30, '#d2d9ee');
        let link = 'puzzlevault.pages.dev';
        if (url) {
            try {
                const parsed = new URL(url, window.location.href);
                if (parsed.protocol === 'https:' || parsed.protocol === 'http:') link = parsed.host + parsed.pathname + parsed.search;
            } catch (_) { /* Keep the safe brand fallback. */ }
        }
        fitText(link, 954, 30, '#8ef0cf');
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Image export failed');
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = 'puzzlevault-challenge.png';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        showToast(shareLanguageText('Result card is ready to save.', '결과 카드를 저장할 준비가 됐어요.'));
        return { status: 'downloaded' };
    } catch (_) {
        showToast(shareLanguageText('Could not create the card. Try sharing the link.', '카드를 만들지 못했어요. 링크 공유를 이용해 주세요.'));
        return { status: 'failed' };
    }
}

function showToast(msg, duration = 2000) {
    const existing = document.querySelector('.pv-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'pv-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
