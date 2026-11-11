import { test } from 'node:test';
import assert from 'node:assert/strict';
import { removeLine, setLineTimes, moveRange } from '../src/edit.js';

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
