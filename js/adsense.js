/* PuzzleVault — explicitly configured ad-provider boundary.
 * Loading an AdSense script does NOT configure an H5 rewarded/interstitial SDK.
 * See docs/monetization-readiness.md before enabling a real provider.
 */
const AdController = {
    gamesPlayed: 0,
    FIRST_AD_AFTER: 3,
    AD_FREQUENCY: 3,
    COOLDOWN_MS: 120000,
    TIMEOUT_MS: 90000,
    _provider: null,
    _enabled: false,
    _busy: false,
    _lastAdAt: 0,

    /** Provider methods accept lifecycle callbacks; ads are disabled by default. */
    configure({ provider = null, enabled = false, cooldownMs = 120000, timeoutMs = 90000 } = {}) {
        if (this._busy) return false;
        this._provider = provider;
        this._enabled = enabled === true && provider !== null;
        this.COOLDOWN_MS = Math.max(120000, Number(cooldownMs) || 120000);
        this.TIMEOUT_MS = Math.min(180000, Math.max(1000, Number(timeoutMs) || 90000));
        return true;
    },

    /** Called once per completed game. Opportunities are games 6, 9, 12, ... */
    shouldShowInterstitial() {
        this.gamesPlayed++;
        try { sessionStorage.setItem('pv_games_played', String(this.gamesPlayed)); } catch (_) { /* memory fallback */ }
        return this.gamesPlayed > this.FIRST_AD_AFTER &&
            (this.gamesPlayed - this.FIRST_AD_AFTER) % this.AD_FREQUENCY === 0;
    },

    showInterstitial() {
        const eligible = this.shouldShowInterstitial();
        if (!eligible || this._busy || (this._lastAdAt && Date.now() - this._lastAdAt < this.COOLDOWN_MS)) {
            return Promise.resolve({ status: 'skipped' });
        }
        if (!this._enabled || typeof this._provider.showInterstitial !== 'function') {
            return Promise.resolve({ status: 'unavailable' });
        }
        this._busy = true;
        return this._runPlacement('interstitial');
    },

    /** Only dismiss the obsolete placeholder. The provider owns its real ad UI. */
    hideInterstitial() {
        const element = document.getElementById('ad-interstitial');
        if (element) element.style.display = 'none';
    },

    /** Existing HintManager calls remain valid; absent provider means free help. */
    showRewardAd(onReward, { rewardLabel } = {}) {
        if (this._busy) return Promise.resolve({ status: 'busy' });
        if (!this._enabled || !this._provider || typeof this._provider.showReward !== 'function') {
            if (typeof onReward === 'function') onReward();
            return Promise.resolve({ status: 'free' });
        }
        if (!this.isRewardAdAvailable()) {
            this._notifyUnavailable();
            return Promise.resolve({ status: 'unavailable' });
        }
        const ko = typeof I18n !== 'undefined' && I18n.currentLang === 'ko';
        const reward = rewardLabel || (ko ? '선택한 도움 기능 1회' : 'one use of the help option you selected');
        const message = ko
            ? `광고 1개를 시청하고 ${reward}을(를) 받을까요?\n취소해도 계속 플레이할 수 있어요.`
            : `Watch one ad for ${reward}?\nYou can cancel and keep playing.`;
        if (typeof window.confirm !== 'function' || !window.confirm(message)) {
            return Promise.resolve({ status: 'cancelled' });
        }
        this._busy = true;
        return this._runPlacement('reward', onReward).then(result => {
            if (['no-fill', 'timeout', 'error'].includes(result.status)) this._notifyUnavailable();
            return result;
        });
    },

    _notifyUnavailable() {
        if (typeof showToast === 'function') {
            const ko = typeof I18n !== 'undefined' && I18n.currentLang === 'ko';
            showToast(ko ? '지금은 광고가 없어요. 계속 플레이하거나 잠시 후 다시 시도해 주세요.'
                : 'No ad is available. Keep playing or try again later.');
        }
    },

    isRewardAdAvailable() {
        if (!this._enabled || !this._provider || this._busy || typeof this._provider.showReward !== 'function') return false;
        try {
            return typeof this._provider.isRewardAvailable === 'function' && this._provider.isRewardAvailable() === true;
        } catch (_) { return false; }
    },

    _runPlacement(kind, onReward) {
        return new Promise(resolve => {
            let settled = false;
            let shown = false;
            let dispose;
            const finish = status => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                this._busy = false;
                if (status === 'completed' && kind === 'reward' && typeof onReward === 'function') {
                    try { onReward(); } catch (_) { /* callback failure must not lock ads */ }
                }
                if ((status === 'timeout' || status === 'error') && typeof dispose === 'function') {
                    try { dispose(); } catch (_) { /* provider cleanup */ }
                }
                resolve({ status });
            };
            const timer = setTimeout(() => finish('timeout'), this.TIMEOUT_MS);
            const callbacks = {
                onShown: () => {
                    if (settled || shown) return;
                    shown = true;
                    this._lastAdAt = Date.now();
                    try { sessionStorage.setItem('pv_last_ad_at', String(this._lastAdAt)); } catch (_) { /* memory fallback */ }
                },
                onComplete: () => finish(kind === 'reward' ? 'completed' : 'shown'),
                onClose: () => finish(kind === 'reward' ? 'dismissed' : (shown ? 'shown' : 'no-fill')),
                onNoFill: () => finish('no-fill'),
                onError: () => finish('error')
            };
            try {
                const method = kind === 'reward' ? 'showReward' : 'showInterstitial';
                dispose = this._provider[method](callbacks);
                if (dispose && typeof dispose.catch === 'function') dispose.catch(callbacks.onError);
            } catch (_) { finish('error'); }
        });
    },

    /** Legacy callers may keep calling this; never clear or refresh AdSense slots. */
    refreshBottomAd() { return false; }
};

try {
    const games = Number(sessionStorage.getItem('pv_games_played'));
    AdController.gamesPlayed = Number.isSafeInteger(games) && games >= 0 ? games : 0;
    const lastAd = Number(sessionStorage.getItem('pv_last_ad_at'));
    AdController._lastAdAt = Number.isFinite(lastAd) && lastAd > 0 && lastAd <= Date.now() ? lastAd : 0;
} catch (_) { /* Private browsing must not prevent games from loading. */ }
if (typeof window !== 'undefined') window.AdController = AdController;
