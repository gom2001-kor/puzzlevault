/* Original Canvas materials. Geometry stays in the game's logical coordinate space. */
(function (root) {
    'use strict';
    const motion = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const words = {
        en: { blocks: 'Drag to place · tap a piece to rotate', keys: 'Keyboard: 1–3 select · arrows move · R rotate · Enter place', lines: '{n} lines ready', place: 'Release to place', blocked: 'Find an empty space', aim: 'Aim & release · match equal numbers', landing: 'First contact guide · balls can roll after landing', contact: 'MATCH {n} + {n}', chain: 'Drag 3+ matching crystals', more: '{n} / 3 · keep connecting', ready: 'Release · +{n} points', bomb: 'Release · +{n} points + bomb', tide: 'Tide in {n} turns', hint: 'Follow the numbered path', cancelled: 'Chain cancelled' },
        ko: { blocks: '끌어서 놓기 · 조각을 톡 눌러 회전', keys: '키보드: 1–3 선택 · 방향키 이동 · R 회전 · Enter 배치', lines: '{n}줄 완성 예정', place: '놓으면 배치돼요', blocked: '빈 공간을 찾아보세요', aim: '조준하고 놓기 · 같은 숫자끼리 합쳐요', landing: '첫 충돌 위치 안내 · 떨어진 뒤 구슬은 굴러가요', contact: '{n} + {n} 합치기', chain: '같은 보석 3개 이상 연결하세요', more: '{n} / 3 · 더 연결하세요', ready: '손을 놓으면 +{n}점', bomb: '손을 놓으면 +{n}점 + 폭탄', tide: '{n}턴 뒤 타일 상승', hint: '숫자 순서로 연결하세요', cancelled: '연결을 취소했어요' },
        ja: { blocks: 'ドラッグして配置 · タップで回転', keys: '1–3 選択 · 矢印 移動 · R 回転 · Enter 配置', lines: '{n}列を完成', place: '離して配置', blocked: '空いている場所へ', aim: '狙って離す · 同じ数字を合体', landing: '最初の接点の目安 · 着地後は転がります', contact: '{n} + {n} を合体', chain: '同じ宝石を3個以上つなぐ', more: '{n} / 3 · もっとつなごう', ready: '離すと +{n}点', bomb: '離すと +{n}点 + 爆弾', tide: 'あと{n}ターンで上昇', hint: '数字の順につなごう', cancelled: '選択を解除' },
        zh: { blocks: '拖动放置 · 点击方块旋转', keys: '1–3 选择 · 方向键移动 · R 旋转 · Enter 放置', lines: '即将完成{n}行', place: '松开放置', blocked: '寻找空位', aim: '瞄准后松开 · 合并相同数字', landing: '首次接触位置参考 · 落地后球会滚动', contact: '合并 {n} + {n}', chain: '连接3颗以上同色宝石', more: '{n} / 3 · 继续连接', ready: '松开获得 +{n}分', bomb: '松开获得 +{n}分和炸弹', tide: '{n}回合后上升', hint: '按数字顺序连接', cancelled: '已取消连接' },
        es: { blocks: 'Arrastra para colocar · toca para girar', keys: '1–3 elegir · flechas mover · R girar · Enter colocar', lines: '{n} líneas listas', place: 'Suelta para colocar', blocked: 'Busca un espacio libre', aim: 'Apunta y suelta · une números iguales', landing: 'Guía del primer contacto · las bolas pueden rodar', contact: 'UNIR {n} + {n}', chain: 'Conecta 3+ cristales del mismo color', more: '{n} / 3 · sigue conectando', ready: 'Suelta · +{n} puntos', bomb: 'Suelta · +{n} puntos + bomba', tide: 'Subida en {n} turnos', hint: 'Sigue el camino numerado', cancelled: 'Cadena cancelada' }
    };
    function t(key, n) {
        const lang = typeof I18n !== 'undefined' ? I18n.currentLang : 'en';
        return ((words[lang] || words.en)[key] || words.en[key] || key).replaceAll('{n}', String(n));
    }
    function shade(hex, amount) {
        const parts = hex.replace('#', '').match(/.{2}/g).map(value => parseInt(value, 16));
        return '#' + parts.map(value => Math.round(value + (amount >= 0 ? 255 - value : value) * amount).toString(16).padStart(2, '0')).join('');
    }
    function rounded(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, Math.min(radius, width / 2, height / 2));
    }
    function setupCanvas(canvas, width, height) {
        const ratio = Math.min(2, root.devicePixelRatio || 1);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        return ctx;
    }
    function block(ctx, x, y, width, height, color) {
        const bevel = Math.max(2, Math.min(5, width * .13));
        rounded(ctx, x, y + 2, width, height, 5);
        ctx.fillStyle = 'rgba(15,23,42,.25)'; ctx.fill();
        const side = ctx.createLinearGradient(x, y, x, y + height);
        side.addColorStop(0, shade(color, -.06)); side.addColorStop(1, shade(color, -.4));
        rounded(ctx, x, y, width, height, 5); ctx.fillStyle = side; ctx.fill();
        const top = ctx.createLinearGradient(x, y, x + width, y + height);
        top.addColorStop(0, shade(color, .52)); top.addColorStop(.48, color); top.addColorStop(1, shade(color, -.12));
        rounded(ctx, x + bevel * .6, y + bevel * .35, width - bevel * 1.2, height - bevel * 1.4, 4);
        ctx.fillStyle = top; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = .8; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + bevel, y + height - bevel); ctx.lineTo(x + width - bevel, y + height - bevel);
        ctx.strokeStyle = 'rgba(15,23,42,.12)'; ctx.stroke();
    }
    function sphere(ctx, x, y, radius, color, value, fontSize, impact = 0) {
        const squash = motion.matches ? 0 : Math.min(1, Math.max(0, impact));
        ctx.save(); ctx.translate(x, y); ctx.scale(1 + squash * .07, 1 - squash * .07);
        ctx.beginPath(); ctx.ellipse(1, radius * .76, radius * .91, radius * .38, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(2,6,23,.28)'; ctx.fill();
        const gradient = ctx.createRadialGradient(-radius * .34, -radius * .4, radius * .05, radius * .14, radius * .2, radius * 1.15);
        gradient.addColorStop(0, shade(color, .75)); gradient.addColorStop(.35, color);
        gradient.addColorStop(.77, shade(color, -.25)); gradient.addColorStop(1, shade(color, -.62));
        ctx.beginPath(); ctx.arc(0, 0, radius - .7, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
        ctx.strokeStyle = shade(color, -.26); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-radius * .3, -radius * .5, radius * .33, radius * .15, -.45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.48)'; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, radius * .84, .2, Math.PI * .63);
        ctx.strokeStyle = 'rgba(255,255,255,.23)'; ctx.lineWidth = Math.max(1, radius * .055); ctx.stroke();
        ctx.font = `800 ${fontSize}px -apple-system, Segoe UI, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.strokeText(value, 0, 1);
        ctx.fillStyle = '#0F172A'; ctx.fillText(value, 0, 1); ctx.restore();
    }
    function hexPath(ctx, x, y, radius) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60 - 30) * Math.PI / 180;
            const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }
    function crystal(ctx, x, y, radius, color, selected) {
        hexPath(ctx, x, y + 3, radius); ctx.fillStyle = shade(color, -.62); ctx.fill();
        hexPath(ctx, x, y, radius); ctx.fillStyle = color; ctx.fill();
        const inner = radius * .69;
        const shades = [.22, -.12, -.3, -.13, .45, .58];
        for (let i = 0; i < 6; i++) {
            const a = (i * 60 - 30) * Math.PI / 180, b = ((i + 1) * 60 - 30) * Math.PI / 180;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
            ctx.lineTo(x + Math.cos(b) * radius, y + Math.sin(b) * radius);
            ctx.lineTo(x + Math.cos(b) * inner, y + Math.sin(b) * inner);
            ctx.lineTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner); ctx.closePath();
            ctx.fillStyle = shade(color, shades[i]); ctx.fill();
        }
        const face = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
        face.addColorStop(0, shade(color, .32)); face.addColorStop(1, shade(color, -.1));
        hexPath(ctx, x, y, inner); ctx.fillStyle = face; ctx.fill();
        ctx.strokeStyle = selected ? '#FFFFFF' : 'rgba(255,255,255,.24)'; ctx.lineWidth = selected ? 2.4 : .8; ctx.stroke();
    }
    root.PVDepth = { reduced: () => motion.matches, t, shade, rounded, setupCanvas, block, sphere, crystal };
    function localizeTips() {
        document.querySelectorAll('[data-depth-text]').forEach(node => { node.textContent = t(node.dataset.depthText); });
    }
    document.addEventListener('DOMContentLoaded', localizeTips);
    if (root.addEventListener) root.addEventListener('langchange', localizeTips);
})(window);
