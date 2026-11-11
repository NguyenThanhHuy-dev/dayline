import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse, parseTime } from '../src/parser.js';
import { serialize } from '../src/serializer.js';

test('bad start/end time carry the offending value', () => {
  assert.deepEqual(parse('# A\n25:00-08:00 | work | x').errors, [{ line: 2, code: 'badStart', params: { value: '25:00' } }]);
  assert.deepEqual(parse('# A\n07:00-xx | work | x').errors, [{ line: 2, code: 'badEnd', params: { value: 'xx' } }]);
  assert.equal(parse('# A\n07:00-07:00 | work | x').errors[0].code, 'endEqualsStart');
});

test('parseTime accepts 6:30, 06:30, 6h30, 6h, 24:00', () => {
  assert.equal(parseTime('6:30'), 390);
  assert.equal(parseTime('06:30'), 390);
  assert.equal(parseTime('6h30'), 390);
  assert.equal(parseTime('6h'), 360);
  assert.equal(parseTime('24:00'), 1440);
});

test('parseTime rejects bad values', () => {
  for (const s of ['25:00', '6:60', '24:30', 'abc', '']) assert.equal(parseTime(s), null, s);
});

test('parses groups, items, notes, en dash, loose spacing', () => {
  const r = parse('# Thứ 2\n  6h30 – 7:00 |  Work | Họp  | n1 | n2 \n');
  assert.deepEqual(r.errors, []);
  assert.equal(r.groups[0].name, 'Thứ 2');
  assert.deepEqual(r.groups[0].items[0], { start: 390, end: 420, type: 'work', title: 'Họp', notes: ['n1', 'n2'], line: 2 });
});

test('strips code fences and blank lines, keeps original line numbers', () => {
  const r = parse('```\n# A\n\n07:00-08:00 | work | X\n```');
  assert.equal(r.groups[0].items[0].line, 4);
  assert.deepEqual(r.errors, []);
});

test('end < start gives line-specific error and other lines survive', () => {
  const r = parse('# A\n07:00-08:00 | work | ok\n\n\n\n\n09:00-08:00 | work | bad\n10:00-11:00 | work | ok2');
  assert.deepEqual(r.errors, [{ line: 7, code: 'endBeforeStart', params: {} }]);
  assert.equal(r.groups[0].items.length, 2);
});

test('malformed lines only break themselves', () => {
  const r = parse('# A\nhello\n07:00 | work | x\nxx-yy | work | x\n07:00-08:00 | work |');
  assert.deepEqual(r.errors, [
    { line: 2, code: 'fields', params: {} },
    { line: 3, code: 'rangeFormat', params: {} },
    { line: 4, code: 'badStart', params: { value: 'xx' } },
    { line: 5, code: 'noTitle', params: {} },
  ]);
  assert.equal(r.groups[0].items.length, 0);
});

test('unknown type warns and is kept', () => {
  const r = parse('# A\n07:00-08:00 | gaming | X');
  assert.equal(r.errors.length, 0);
  assert.deepEqual(r.warnings, [{ line: 2, code: 'unknownType', params: { type: 'gaming' } }]);
  assert.equal(r.groups[0].items[0].type, 'gaming');
});

test('warns on overlap and gap', () => {
  const r = parse('# A\n07:00-08:00 | work | a\n07:30-09:00 | work | b\n10:00-11:00 | work | c');
  assert.deepEqual(r.warnings, [
    { line: 3, code: 'overlap', params: { with: 2, group: 'A', auto: undefined } },
    { line: 4, code: 'gap', params: { minutes: 60, after: 3, group: 'A', auto: undefined } },
  ]);
});

test('lines without header go to default group', () => {
  assert.equal(parse('07:00-08:00 | work | a').groups[0].auto, 'default');
  assert.equal(parse('#\n07:00-08:00 | work | a').groups[0].auto, 'untitled');
});

test('serialize(parse(x)) round-trips', () => {
  for (const f of ['weekday', 'weekend', 'weekday.en', 'weekend.en']) {
    const text = readFileSync(new URL(`../examples/${f}.txt`, import.meta.url), 'utf8');
    const r = parse(text);
    assert.equal(serialize(r.groups), text);
  }
});

test('example files have no errors or warnings', () => {
  for (const f of ['weekday', 'weekend', 'weekday.en', 'weekend.en']) {
    const r = parse(readFileSync(new URL(`../examples/${f}.txt`, import.meta.url), 'utf8'));
    assert.deepEqual([r.errors, r.warnings], [[], []], f);
  }
});
