import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout } from '../src/render.js';
import { parse } from '../src/parser.js';

const group = parse('# A\n07:30-08:15 | work | a\n10:00-11:00 | work | b').groups[0];

test('layout fits the items by default', () => {
  const { t0, t1 } = layout(group);
  assert.deepEqual([t0, t1], [420, 660]);
});

test('layout full covers 00:00-24:00', () => {
  const { t0, t1 } = layout(group, true);
  assert.deepEqual([t0, t1], [0, 1440]);
});
