import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parser.js';
import { statsByType, formatDuration } from '../src/stats.js';

test('sums minutes per type, sorted desc, unknown types kept', () => {
  const { groups } = parse('# A\n08:00-12:00 | work | a\n12:00-13:00 | meal | b\n13:00-14:30 | work | c\n14:30-15:00 | foo | d');
  assert.deepEqual(statsByType(groups[0]), [
    { type: 'work', minutes: 330 }, { type: 'meal', minutes: 60 }, { type: 'foo', minutes: 30 },
  ]);
});

test('formatDuration', () => {
  assert.equal(formatDuration(330), '5h30');
  assert.equal(formatDuration(65), '1h05');
});
