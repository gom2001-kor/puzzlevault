/* ===================================================
   PuzzleVault — Daily Seed System (seed.js)
   =================================================== */

/**
 * Generate a deterministic daily seed for a given game.
 * Same gameId + same date (UTC) = same seed globally.
 * @param {string} gameId — e.g. 'numvault', 'gridsmash'
 * @returns {number} Positive integer seed
 */
function getDailySeed(gameId) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const combined = gameId + ':' + dateStr;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns the day count since 2026-01-01 (Day #1).
 * Used for "Daily #N" display in share text.
 * @returns {number}
 */
function getDailyNumber() {
  const epoch = new Date('2026-01-01T00:00:00Z');
  const now = new Date();
  const diff = now - epoch;
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Seeded pseudo-random number generator (LCG).
 * Provides deterministic random sequences from a given seed.
 */
class SeededRandom {
  /**
   * @param {number} seed — Positive integer seed
   */
  constructor(seed) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  /**
   * Returns next random float in [0, 1).
   * @returns {number}
   */
  next() {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }

  /**
   * Returns a random integer in [min, max] (inclusive).
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Returns a new shuffled copy of the array (Fisher-Yates).
   * @param {Array} arr
   * @returns {Array}
   */
  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
