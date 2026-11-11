import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DICT, translator, getLang, setLang } from '../src/i18n.js';
import { parse, formatIssue, TYPES } from '../src/parser.js';
import { buildPrompt } from '../src/prompt.js';

test('vi and en have exactly the same keys', () => {
  assert.deepEqual(Object.keys(DICT.en).sort(), Object.keys(DICT.vi).sort());
  for (const l of ['vi', 'en']) for (const [k, v] of Object.entries(DICT[l])) assert.ok(v.trim(), `${l}.${k}`);
});

test('export dialog strings exist in both languages', () => {
  for (const k of ['title', 'choose', 'all', 'none', 'combine', 'separate', 'go', 'cancel', 'empty']) {
    for (const l of ['vi', 'en']) assert.ok(DICT[l][`export.${k}`], `${l}.export.${k}`);
  }
});

test('every type has a label in both languages', () => {
  for (const l of ['vi', 'en']) for (const ty of TYPES) assert.ok(DICT[l][`type.${ty}`], `${l}.type.${ty}`);
});

test('interpolation, unknown params left alone, missing key returns key', () => {
  const t = translator('en');
  assert.equal(t('issue.noTitle', { line: 3 }), 'Line 3: missing title');
  assert.equal(t('issue.noTitle'), 'Line {line}: missing title');
  assert.equal(t('nope.key'), 'nope.key');
});

test('setLang/getLang: no storage in node, unknown lang ignored', () => {
  setLang('en');
  assert.equal(getLang(), 'en');
  setLang('fr');
  assert.equal(getLang(), 'en');
  setLang('vi');
  assert.equal(getLang(), 'vi');
});

test('formatIssue renders errors and warnings in both languages', () => {
  const r = parse('# A\n09:00-08:00 | work | x\n07:00-08:00 | gaming | a\n07:30-09:00 | work | b\n10:00-11:00 | work | c\n12:00-13:00 | work |');
  const vi = [...r.errors, ...r.warnings].map((i) => formatIssue(i, translator('vi')));
  const en = [...r.errors, ...r.warnings].map((i) => formatIssue(i, translator('en')));
  assert.deepEqual(vi, [
    'Dòng 2: giờ kết thúc nhỏ hơn giờ bắt đầu',
    'Dòng 6: thiếu tiêu đề',
    'Dòng 3: loại lạ "gaming", tô màu xám',
    'Dòng 4: chồng giờ với dòng 3 (A)',
    'Dòng 5: hở 60 phút sau dòng 4 (A)',
  ]);
  assert.deepEqual(en, [
    'Line 2: end time is earlier than start time',
    'Line 6: missing title',
    'Line 3: unknown type "gaming", shown in gray',
    'Line 4: overlaps line 3 (A)',
    'Line 5: 60 min gap after line 4 (A)',
  ]);
});

test('auto-named group is translated in messages', () => {
  const r = parse('07:00-08:00 | work | a\n07:30-09:00 | work | b');
  assert.equal(formatIssue(r.warnings[0], translator('vi')), 'Dòng 2: chồng giờ với dòng 1 (Mặc định)');
  assert.equal(formatIssue(r.warnings[0], translator('en')), 'Line 2: overlaps line 1 (Default)');
});

test('prompt: same format and types, language-specific instructions and groups', () => {
  const vi = buildPrompt('vi');
  const en = buildPrompt('en');
  for (const p of [vi, en]) {
    assert.ok(p.includes(TYPES.join(', ')));
    assert.ok(p.includes('06:45-07:45 | personal |'));
    assert.ok(!p.includes('{types}'));
  }
  assert.ok(vi.includes('# Thứ 2-6') && !vi.includes('Mon-Fri'));
  assert.ok(en.includes('# Mon-Fri') && en.includes('# Saturday') && !en.includes('Thứ'));
});
