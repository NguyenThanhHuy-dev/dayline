import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unionRange, exportLayout, fileNames, EXPORT } from '../src/exportLayout.js';
import { parse } from '../src/parser.js';

const [a, b, empty] = parse('# A\n07:30-08:15 | work | a\n# B\n10:00-13:10 | work | b\n# C').groups;

test('unionRange spans all groups, ignores empty, full = 24h', () => {
  assert.deepEqual(unionRange([a, b, empty]), { t0: 420, t1: 840 });
  assert.deepEqual(unionRange([a]), { t0: 420, t1: 540 });
  assert.deepEqual(unionRange([a, b], true), { t0: 0, t1: 1440 });
  assert.deepEqual(unionRange([empty]), { t0: 0, t1: 0 });
});

test('exportLayout columns/rows and sizes', () => {
  const r = { t0: 420, t1: 840 }, px = 1.5, rowH = EXPORT.TOP + 420 * px + EXPORT.BOTTOM;
  const one = exportLayout(1, r, px);
  assert.deepEqual([one.cols, one.rows, one.W, one.H], [1, 1, 560, rowH]);
  const two = exportLayout(2, r, px);
  assert.deepEqual([two.cols, two.rows, two.W], [2, 1, 64 + 600]);
  assert.deepEqual(two.cells, [{ x: 64, y: 0 }, { x: 364, y: 0 }]);
  const four = exportLayout(4, r, px);
  assert.deepEqual([four.cols, four.rows, four.W, four.H], [4, 1, 64 + 1200, rowH]);
  const five = exportLayout(5, r, px);
  assert.deepEqual([five.cols, five.rows, five.W, five.H], [4, 2, 64 + 1200, 2 * rowH]);
  assert.deepEqual(five.cells[4], { x: 64, y: rowH });
});

test('fileNames sanitizes unicode and keeps names unique', () => {
  assert.deepEqual(fileNames(['Thứ 2-6', 'Mon/Fri', 'Mon Fri', '!!!']), ['Thứ-2-6.png', 'Mon-Fri.png', 'Mon-Fri-2.png', 'dayline.png']);
});
