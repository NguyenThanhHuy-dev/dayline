import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from '../src/history.js';

test('push/undo/redo', () => {
  const h = createHistory('a');
  h.push('b'); h.push('c');
  assert.equal(h.undo(), 'b');
  assert.equal(h.undo(), 'a');
  assert.equal(h.canUndo, false);
  assert.equal(h.undo(), 'a');
  assert.equal(h.redo(), 'b');
  assert.equal(h.redo(), 'c');
  assert.equal(h.canRedo, false);
});

test('new push clears redo', () => {
  const h = createHistory('a');
  h.push('b'); h.undo(); h.push('x');
  assert.equal(h.canRedo, false);
  assert.equal(h.undo(), 'a');
});

test('dedupes same text as current', () => {
  const h = createHistory('a');
  h.push('a'); h.push('b'); h.push('b');
  assert.equal(h.undo(), 'a');
  assert.equal(h.canUndo, false);
});

test('max size drops oldest', () => {
  const h = createHistory('0', 3);
  h.push('1'); h.push('2'); h.push('3');
  assert.equal(h.undo(), '2');
  assert.equal(h.undo(), '1');
  assert.equal(h.canUndo, false);
});

test('revert goes to base as an undoable entry', () => {
  const h = createHistory('a');
  h.mark();
  h.push('b'); h.push('c');
  assert.equal(h.revert(), 'a');
  assert.equal(h.undo(), 'c');
  assert.equal(h.redo(), 'a');
});

test('mark(text) sets base explicitly', () => {
  const h = createHistory('a');
  h.push('b'); h.mark('b'); h.push('c');
  assert.equal(h.revert(), 'b');
});
