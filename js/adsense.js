/* ===================================================
   PuzzleVault — Ad Controller (adsense.js)
   Google AdSense integration controller
   =================================================== */

const AdController = {
    /** Number of games played this session */
    gamesPlayed: parseInt(sessionStorage.getItem('pv_games_played') || '0'),

    /** First interstitial shows after this many games */
    FIRST_AD_AFTER: 3,

    /** Show interstitial every N games after first */
    AD_FREQUENCY: 3,

    /**
     * Check if an interstitial ad should be shown.
     * Increments game counter and applies frequency rules.
     * - First 3 games: NO ads (onboarding protection)
     * - After that: 1 interstitial every 3 games
     * @returns {boolean}
     */
    shouldShowInterstitial() {
        this.gamesPlayed++;
        sessionStorage.setItem('pv_games_played', this.gamesPlayed);
        if (this.gamesPlayed <= this.FIRST_AD_AFTER) return false;
        return (this.gamesPlayed - this.FIRST_AD_AFTER) % this.AD_FREQUENCY === 0;
    },

    /**
     * Show interstitial ad overlay if conditions are met.
     * Call this after game over / level complete.
     */
    showInterstitial() {
        if (!this.shouldShowInterstitial()) return;
        const el = document.getElementById('ad-interstitial');
        if (el) {
            el.style.display = 'flex';
            // Auto-close timer (for placeholder; real ads handle this)
            const closeBtn = el.querySelector('.ad-close-btn');
            if (closeBtn) {
                closeBtn.onclick = () => this.hideInterstitial();
            }
        }
    },

    /**
     * Hide the interstitial ad overlay.
     */
    hideInterstitial() {
        const el = document.getElementById('ad-interstitial');
        if (el) el.style.display = 'none';
    },

    /**
     * Show a reward ad (user-initiated, e.g. for hint/undo).
     * In production, this would trigger a real ad request.
     * @param {Function} onReward — Callback when reward is granted
     */
    showRewardAd(onReward) {
        // Placeholder: immediately grant reward
        // In production, replace with actual ad SDK callback
        if (typeof onReward === 'function') {
            showToast('Reward granted!');
            onReward();
        }
    },

    /**
     * Check if a reward ad is loaded and ready to show.
     * In production, this checks the ad SDK's ready state.
     * @returns {boolean}
     */
    isRewardAdAvailable() {
        // Placeholder: always available
        // In production, check actual ad SDK
        return true;
    },

    /** Timestamp of last bottom ad refresh */
    _lastBottomRefresh: 0,

    /**
     * Refresh the #ad-bottom slot.
     * Includes a 60-second cooldown to comply with AdSense policy.
     * Call when user transitions between packs/levels or returns to menu.
     */
    refreshBottomAd() {
        const now = Date.now();
        if (now - this._lastBottomRefresh < 60000) return; // 60s cooldown
        this._lastBottomRefresh = now;

        const el = document.getElementById('ad-bottom');
        if (!el) return;

        // Placeholder: in production, call googletag or adsbygoogle.push
        // For now, just reset the slot
        el.innerHTML = '';
    }
};
