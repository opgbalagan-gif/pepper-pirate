const { test } = require('node:test');
const assert = require('node:assert/strict');
const Game = require('./engine.js');
const warning = game => { for (let i = 0; i < 9; i++) game.tap(); game.update(5); assert.equal(game.phase, 'warning'); };
test('timely retreat scores once and preserves pepper', () => {
  const g = new Game(() => .5); g.start(); warning(g); g.retreat();
  assert.equal(g.score, 100); assert.equal(g.bites, 0); assert.equal(g.combo, 1);
  g.retreat(); assert.equal(g.score, 100); g.update(1); warning(g); g.retreat();
  assert.equal(g.score, 225); assert.equal(g.bestCombo, 2);
});
test('third missed warning ends the attempt; restart clears it', () => {
  const g = new Game(); g.start();
  for (let n = 1; n <= 3; n++) { warning(g); g.update(1); assert.equal(g.bites, n); if (n < 3) g.update(2); }
  assert.equal(g.phase, 'over'); g.tap(); g.retreat(); assert.equal(g.phase, 'over');
  g.start(); assert.equal(g.phase, 'playing'); assert.equal(g.bites, 0); assert.equal(g.score, 0);
});
test('early retreat cancels warning without a phantom bite or score', () => {
  const g = new Game(); g.start(); g.tap(); g.update(20); assert.equal(g.phase, 'warning');
  g.retreat(); g.update(2); g.update(20); assert.equal(g.bites, 0); assert.equal(g.score, 0);
});
test('idle is safe; difficulty keeps a reaction window', () => {
  const g = new Game(); g.start(); g.update(100); assert.equal(g.heat, 0);
  g.round = 100; warning(g); assert.ok(g.warning >= .32); g.update(NaN); assert.ok(Number.isFinite(g.warning));
});
test('dragging away cools the dog; holding close provokes it', () => {
  const g = new Game(() => .5); g.start(); g.position(.05); g.update(5);
  assert.equal(g.heat, 0); g.position(.8); g.update(1); const hot = g.heat;
  assert.ok(hot > 0); g.position(.05); g.update(.5); assert.ok(g.heat < hot);
  g.position(.9); g.update(5); assert.equal(g.phase, 'warning');
  g.position(0); assert.equal(g.phase, 'cooldown'); assert.equal(g.bites, 0); assert.equal(g.score, 100);
});
test('drag cannot farm points by instantly touching then releasing', () => {
  const g = new Game(); g.start(); g.position(1); g.retreat(); assert.equal(g.score, 0);
  g.update(1); assert.equal(g.reach, 0); assert.equal(g.positioned, false);
});
