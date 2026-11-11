import { test } from 'node:test';
import assert from 'node:assert/strict';
import { removeLine } from '../src/edit.js';

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
