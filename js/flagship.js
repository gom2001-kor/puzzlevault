/* Static showcase links work before JavaScript; update their language after a switch. */
(function () {
    'use strict';
    function updateLinks() {
        if (typeof getLocalizedGamePath !== 'function') return;
        document.querySelectorAll('[data-flagship-game]').forEach(link => {
            const id = link.dataset.flagshipGame;
            if (id !== 'mosslight' && id !== 'cloudweft') return;
            link.href = getLocalizedGamePath('/games/' + id + '.html');
        });
    }
    window.addEventListener('pvReady', updateLinks);
    window.addEventListener('langchange', updateLinks);
}());
