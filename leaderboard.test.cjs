const { test } = require('node:test');
const assert = require('node:assert/strict');
const Board = require('./leaderboard.js');
const row = (id, score, extras = {}) => ({id, score, round: 2, combo: 1, time: 1000, ...extras});
function storage(value = '[]') { return { getItem: () => value, setItem: (_, next) => { value = next; } }; }
test('keeps ten best finished attempts, survives reload, and avoids duplicate saves', () => {
  const disk = storage(), board = new Board(disk);
  for (let n = 0; n < 12; n++) board.add(row(String(n), n * 100));
  board.add(row('11', 1100));
  assert.equal(board.rows.length, 10);
  assert.deepEqual(new Board(disk).rows.map(r => r.score), [1100,1000,900,800,700,600,500,400,300,200]);
  assert.equal(board.add(row('low', 0)), null);
  assert.equal(board.add(row('winner', 2000)), 1);
});
test('ties use combo, round, then newest result; malformed saved records are ignored', () => {
  const disk = storage(JSON.stringify([null, row('bad', -1), row('date', 1, {time: 1e16}), row('a', 100), row('b', 100, {combo:2}), row('c', 100, {combo:2,round:3}), row('d', 100, {combo:2,round:3,time:2000})]));
  assert.deepEqual(new Board(disk).rows.map(r => r.id), ['d','c','b','a']);
  assert.deepEqual(new Board(storage('{broken')).rows, []);
});
test('blocked storage retains results for this session without crashing', () => {
  const board = new Board({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
  assert.equal(board.add(row('one', 100)), 1); assert.equal(board.persistent, false);
  assert.equal(board.rows[0].score, 100);
  assert.equal(new Board().add(row('zero', 0)), 1);
});
