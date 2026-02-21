/* ===================================================
   PuzzleVault — Share System (share.js)
   Web Share API with clipboard fallback
   =================================================== */

/**
 * Share game result text via Web Share API.
 * Falls back to clipboard copy if not available.
 * @param {string} text — The share text (emoji grid, score, URL)
 */
function shareResult(text) {
    if (navigator.share) {
        navigator.share({ text }).catch(() => copyToClipboard(text));
    } else {
        copyToClipboard(text);
    }
}

/**
 * Copy text to clipboard and show toast notification.
 * @param {string} text
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!');
        } catch (e) {
            showToast('Failed to copy');
        }
        document.body.removeChild(textarea);
    });
}

/**
 * Show a toast notification with auto-dismiss.
 * @param {string} msg — Message to display
 * @param {number} [duration=2000] — Duration in ms before dismiss
 */
function showToast(msg, duration = 2000) {
    // Remove any existing toast
    const existing = document.querySelector('.pv-toast');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.className = 'pv-toast';
    t.textContent = msg;
    document.body.appendChild(t);

    // Trigger show animation
    setTimeout(() => t.classList.add('show'), 10);

    // Auto-dismiss
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
    }, duration);
}
