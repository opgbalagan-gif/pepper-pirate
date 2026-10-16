(function (root) {
  'use strict';
  const KEY = 'pepper-pirate-leaderboard-v1';
  const valid = row => row && typeof row.id === 'string' && row.id.length <= 100 &&
    ['score', 'round', 'combo', 'time'].every(key => Number.isSafeInteger(row[key])) &&
    row.score >= 0 && row.round >= 1 && row.combo >= 0 && row.time >= 0 && row.time <= 8640000000000000;
  const rank = rows => rows.sort((a, b) => b.score - a.score || b.combo - a.combo || b.round - a.round || b.time - a.time).slice(0, 10);
  class LocalLeaderboard {
    constructor(storage) {
      this.storage = storage; this.rows = []; this.persistent = !!storage;
      try {
        const saved = JSON.parse(storage?.getItem(KEY) || '[]');
        if (Array.isArray(saved)) this.rows = rank(saved.filter(valid).filter((row, i, all) => all.findIndex(other => other.id === row.id) === i));
      } catch { /* Corrupt or unavailable storage must never stop the game. */ }
    }
    add(row) {
      if (!valid(row)) return null;
      this.rows = rank([...this.rows.filter(other => other.id !== row.id), { ...row }]);
      try { this.storage.setItem(KEY, JSON.stringify(this.rows)); this.persistent = true; }
      catch { this.persistent = false; }
      const index = this.rows.findIndex(other => other.id === row.id);
      return index < 0 ? null : index + 1;
    }
  }
  if (typeof module !== 'undefined') module.exports = LocalLeaderboard;
  else root.LocalLeaderboard = LocalLeaderboard;
})(typeof window !== 'undefined' ? window : globalThis);
