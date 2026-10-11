(function (root) {
  'use strict';
  class PepperGame {
    constructor(random = Math.random) { this.random = random; this.reset(); }
    reset() {
      Object.assign(this, { phase: 'ready', score: 0, bestCombo: 0, combo: 0,
        bites: 0, round: 1, reach: 0, heat: 0, timer: 0, warning: 0, events: [] });
      this.nextThreshold();
    }
    nextThreshold() { this.threshold = 82 + this.random() * 18; }
    emit(type, data = {}) { this.events.push({ type, ...data }); }
    start() { this.reset(); this.phase = 'playing'; this.emit('start'); }
    tap() {
      if (this.phase !== 'playing') return;
      this.reach = Math.min(1, this.reach + .12);
      this.heat = Math.min(100, this.heat + 7);
      this.emit('tap');
    }
    retreat() {
      if (!['playing', 'warning'].includes(this.phase) || this.reach === 0) return;
      const perfect = this.phase === 'warning', close = this.reach >= .36;
      const points = close ? Math.round((perfect ? 100 : 25 + this.heat * .5) *
        (1 + Math.min(perfect ? this.combo : 0, 4) * .25)) : 0;
      this.combo = perfect && close ? this.combo + 1 : 0;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.score += points;
      if (close) this.round++;
      this.phase = 'cooldown'; this.timer = .7;
      this.reach = 0; this.heat = 0; this.warning = 0;
      this.nextThreshold();
      this.emit(close ? 'saved' : 'early', { perfect, points });
    }
    update(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      if (this.phase === 'cooldown') {
        this.timer -= dt;
        if (this.timer <= 0) { this.phase = 'playing'; this.emit('round'); }
        return;
      }
      if (this.phase === 'warning') {
        this.warning -= dt;
        if (this.warning <= 0) {
          this.bites++; this.combo = 0; this.reach = 0; this.heat = 0;
          this.phase = this.bites >= 3 ? 'over' : 'cooldown';
          this.timer = 1.1; this.nextThreshold();
          this.emit(this.bites >= 3 ? 'lose' : 'bite');
        }
        return;
      }
      if (this.phase !== 'playing' || this.reach === 0) return;
      this.heat = Math.min(100, this.heat + dt *
        (12 + this.reach * 25 + Math.min(this.round, 15) * 1.4));
      if (this.heat >= this.threshold) {
        this.phase = 'warning';
        this.warning = Math.max(.32, .72 - this.round * .018);
        this.emit('warning', { duration: this.warning });
      }
    }
  }
  if (typeof module !== 'undefined') module.exports = PepperGame;
  else root.PepperGame = PepperGame;
})(typeof window !== 'undefined' ? window : globalThis);
