/* ===================================================
   PuzzleVault — Sound Effects (sfx.js)
   Web Audio API oscillator-based (no audio files)
   =================================================== */

const SFX = {
    ctx: null,
    enabled: true,

    /**
     * Initialize AudioContext and load mute preference.
     * Must be called on first user interaction (browser policy).
     */
    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = localStorage.getItem('pv_sound') !== 'off';
    },

    /**
     * Play a sound effect by type.
     * @param {'tap'|'correct'|'wrong'|'clear'|'combo'|'gameover'|'win'} type
     */
    play(type) {
        if (!this.enabled) return;
        if (!this.ctx) this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const sounds = {
            tap: { freq: 600, dur: 0.08, wave: 'sine' },
            correct: { freq: 880, dur: 0.15, wave: 'sine' },
            wrong: { freq: 200, dur: 0.3, wave: 'square' },
            clear: { freq: 1200, dur: 0.2, wave: 'sine' },
            combo: { freq: 1600, dur: 0.3, wave: 'triangle' },
            gameover: { freq: 150, dur: 0.5, wave: 'sawtooth' },
            win: { freq: 1000, dur: 0.4, wave: 'sine' },
        };

        const s = sounds[type] || sounds.tap;
        osc.type = s.wave;
        osc.frequency.value = s.freq;
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + s.dur);
        osc.start();
        osc.stop(this.ctx.currentTime + s.dur);
    },

    /**
     * Toggle sound on/off. Saves preference to localStorage.
     * @returns {boolean} New enabled state
     */
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('pv_sound', this.enabled ? 'on' : 'off');
        return this.enabled;
    }
};
