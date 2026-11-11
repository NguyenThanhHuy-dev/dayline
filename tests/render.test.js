import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, assignLanes } from '../src/render.js';
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

test('assignLanes: disjoint items stay single lane', () => {
  const g = parse('# A\n07:00-08:00 | work | a\n08:00-09:00 | work | b').groups[0];
  assert.deepEqual(assignLanes(g.items), [{ lane: 0, lanes: 1 }, { lane: 0, lanes: 1 }]);
});

test('assignLanes: overlapping cluster shares columns, later cluster separate', () => {
  const g = parse('# A\n07:00-09:00 | work | a\n08:00-10:00 | work | b\n09:00-09:30 | work | c\n12:00-13:00 | work | d').groups[0];
  assert.deepEqual(assignLanes(g.items), [
    { lane: 0, lanes: 2 }, { lane: 1, lanes: 2 }, { lane: 0, lanes: 2 }, { lane: 0, lanes: 1 },
  ]);
});
