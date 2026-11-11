import { test } from 'node:test';
import assert from 'node:assert/strict';
import { removeLine, setLineTimes, moveRange, resolveRange, applyEdits } from '../src/edit.js';
import { parse } from '../src/parser.js';

const t = '# A\n\n07:00-08:00 | work | a\n  08:00-09:00 | meal | b  \n09:00-10:00 | work | c\n';

test('removes a middle line only', () => {
  assert.equal(removeLine(t, 4), '# A\n\n07:00-08:00 | work | a\n09:00-10:00 | work | c\n');
});

test('removes first and last lines', () => {
  assert.equal(removeLine(t, 1), t.slice(4));
  assert.equal(removeLine('a\nb\nc', 3), 'a\nb\n');
  assert.equal(removeLine('a\nb\nc', 1), 'b\nc');
});

test('keeps CRLF endings of other lines', () => {
  assert.equal(removeLine('a\r\nb\r\nc\r\n', 2), 'a\r\nc\r\n');
});

test('out of range is a no-op', () => {
  for (const n of [0, -1, 99, 1.5, NaN, undefined]) assert.equal(removeLine(t, n), t);
});

test('other lines stay byte-identical', () => {
  const kept = t.split(/(?<=\n)/).filter((_, i) => i !== 3).join('');
  assert.equal(removeLine(t, 4), kept);
});

test('setLineTimes rewrites only the time field', () => {
  assert.equal(setLineTimes(t, 3, 480, 540), t.replace('07:00-08:00', '08:00-09:00'));
});

test('setLineTimes keeps other fields, indent, spacing', () => {
  assert.equal(setLineTimes('  08:00-09:00 | meal | b | note x\n', 1, 0, 65), '  00:00-01:05 | meal | b | note x\n');
  assert.equal(setLineTimes('08:00-09:00|meal|b', 1, 600, 660), '10:00-11:00|meal|b');
});

test('setLineTimes keeps CRLF', () => {
  assert.equal(setLineTimes('a\r\n07:00-08:00 | work | a\r\nb\r\n', 2, 60, 120), 'a\r\n01:00-02:00 | work | a\r\nb\r\n');
});

test('setLineTimes out of range is a no-op, other lines identical', () => {
  for (const n of [0, 99, 1.5, NaN]) assert.equal(setLineTimes(t, n, 0, 60), t);
  const a = t.split('\n'), b = setLineTimes(t, 3, 0, 60).split('\n');
  assert.deepEqual(b.filter((_, i) => i !== 2), a.filter((_, i) => i !== 2));
});

test('moveRange snaps to 5, keeps duration', () => {
  assert.deepEqual(moveRange(420, 480, 13), { start: 435, end: 495 });
  assert.deepEqual(moveRange(420, 480, -7), { start: 415, end: 475 });
  assert.deepEqual(moveRange(421, 466, 0), { start: 420, end: 465 });
});

test('moveRange clamps at both ends', () => {
  assert.deepEqual(moveRange(30, 90, -500), { start: 0, end: 60 });
  assert.deepEqual(moveRange(1380, 1430, 500), { start: 1390, end: 1440 });
  assert.deepEqual(moveRange(1380, 1440, 5), { start: 1380, end: 1440 });
});

// lines: 2=A 07-08, 3=B 08-09, 4=C 09-10 in group X; 6=Z (group Y)
const g = '# X\n07:00-08:00 | work | A\n08:00-09:00 | meal | B\n09:00-10:00 | work | C\n# Y\n08:00-09:00 | work | Z\n';
const run = (text, line, s, e) => {
  const grp = parse(text).groups.find((x) => x.items.some((i) => i.line === line));
  return applyEdits(text, resolveRange(grp.items, line, s, e));
};

test('resize bottom into next block shrinks it', () => {
  assert.equal(run(g, 3, 480, 570), g.replace('08:00-09:00 | meal', '08:00-09:30 | meal').replace('09:00-10:00', '09:30-10:00'));
});

test('resize top into previous block cuts its end', () => {
  assert.equal(run(g, 4, 530, 600), g.replace('09:00-10:00', '08:50-10:00').replace('07:00-08:00', '07:00-08:00').replace('08:00-09:00 | meal', '08:00-08:50 | meal'));
});

test('fully covered block is deleted', () => {
  assert.equal(run(g, 2, 420, 540), '# X\n07:00-09:00 | work | A\n09:00-10:00 | work | C\n# Y\n08:00-09:00 | work | Z\n');
});

test('covering two blocks deletes both; Y untouched', () => {
  assert.equal(run(g, 2, 420, 600), '# X\n07:00-10:00 | work | A\n# Y\n08:00-09:00 | work | Z\n');
});

test('block left under 5 minutes counts as covered', () => {
  assert.deepEqual(resolveRange([{ line: 1, start: 0, end: 60 }, { line: 2, start: 60, end: 120 }], 1, 0, 117), [{ line: 1, start: 0, end: 117 }, { line: 2, remove: true }]);
});

test('min duration and clamping', () => {
  assert.deepEqual(resolveRange([{ line: 1, start: 60, end: 120 }], 1, 60, 62), [{ line: 1, start: 60, end: 65 }]);
  assert.deepEqual(resolveRange([{ line: 1, start: 60, end: 120 }], 1, -30, 120), [{ line: 1, start: 0, end: 120 }]);
  assert.deepEqual(resolveRange([{ line: 1, start: 60, end: 120 }], 1, 60, 2000), [{ line: 1, start: 60, end: 1440 }]);
});

test('move into another block pushes/cuts; strictly inside cuts the tail', () => {
  assert.equal(run(g, 2, 450, 510), '# X\n07:30-08:30 | work | A\n08:30-09:00 | meal | B\n09:00-10:00 | work | C\n# Y\n08:00-09:00 | work | Z\n');
  const big = '# X\n06:00-12:00 | work | Big\n13:00-14:00 | meal | M\n';
  assert.equal(run(big, 3, 480, 540), '# X\n06:00-08:00 | work | Big\n08:00-09:00 | meal | M\n');
});

test('unchanged range is a no-op', () => {
  assert.deepEqual(resolveRange([{ line: 1, start: 60, end: 120 }], 1, 60, 120), []);
  assert.equal(run(g, 3, 480, 540), g);
});

test('CRLF text keeps endings', () => {
  const c = g.replace(/\n/g, '\r\n');
  assert.equal(run(c, 2, 420, 540), '# X\r\n07:00-09:00 | work | A\r\n09:00-10:00 | work | C\r\n# Y\r\n08:00-09:00 | work | Z\r\n');
});

test('unknown line is a no-op', () => {
  assert.deepEqual(resolveRange([{ line: 1, start: 60, end: 120 }], 9, 0, 60), []);
});
