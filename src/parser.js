export const TYPES = ['personal', 'commute', 'work', 'meal', 'study', 'exercise', 'chores', 'relax', 'sleep'];

const TIME_RE = /^(\d{1,2})\s*[:h]\s*(\d{2})?$/i;

// "6:30" | "06:30" | "6h30" | "6h" -> minutes since midnight, or null
export function parseTime(s) {
  const m = TIME_RE.exec(s.trim());
  if (!m) return null;
  const h = +m[1];
  const min = m[2] ? +m[2] : 0;
  if (min > 59 || h > 24 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

// shortcut: no support for ranges crossing midnight (use two lines), when needed upgrade here
// Display name of a group (auto-named groups are translated)
export const groupLabel = (g, t) => (g.auto ? t(`group.${g.auto}`) : g.name);

// issue {line, code, params} -> message in the language of `t`
export function formatIssue(issue, t) {
  const { auto, group, ...rest } = issue.params;
  const p = { line: issue.line, ...rest };
  if (group !== undefined) p.group = groupLabel({ name: group, auto }, t);
  return t(`issue.${issue.code}`, p);
}

function parseRange(s) {
  const parts = s.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return { code: 'rangeFormat', params: {} };
  const [a, b] = parts.map(parseTime);
  if (a === null) return { code: 'badStart', params: { value: parts[0] } };
  if (b === null) return { code: 'badEnd', params: { value: parts[1] } };
  return [a, b];
}

export function parse(text) {
  const groups = [];
  const errors = [];
  const warnings = [];
  let cur = null;

  String(text).replace(/^﻿/, '').split(/\r?\n/).forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trim();
    if (!line || line.startsWith('```')) return;

    const h = /^#+\s*(.*)$/.exec(line);
    if (h) {
      const name = h[1].trim();
      cur = name ? { name, items: [] } : { name: 'Untitled', auto: 'untitled', items: [] }; // auto: UI shows a translated label
      groups.push(cur);
      return;
    }

    const err = (code, params = {}) => errors.push({ line: n, code, params });
    const f = line.split('|').map((s) => s.trim());
    if (f.length < 3) return err('fields');
    const range = parseRange(f[0]);
    if (!Array.isArray(range)) return err(range.code, range.params);
    const [start, end] = range;
    if (end < start) return err('endBeforeStart');
    if (end === start) return err('endEqualsStart');
    if (!f[2]) return err('noTitle');

    const type = f[1].toLowerCase();
    if (!TYPES.includes(type)) {
      warnings.push({ line: n, code: 'unknownType', params: { type: f[1] } });
    }
    if (!cur) {
      cur = { name: 'Default', auto: 'default', items: [] };
      groups.push(cur);
    }
    cur.items.push({ start, end, type, title: f[2], notes: f.slice(3).filter(Boolean), line: n });
  });

  groups.forEach((g) => checkContinuity(g, warnings));
  warnings.sort((a, b) => a.line - b.line);
  return { groups, errors, warnings };
}

function checkContinuity(group, warnings) {
  const items = [...group.items].sort((a, b) => a.start - b.start);
  const who = { group: group.name, auto: group.auto };
  let prev = null; // item with the latest end so far
  for (const it of items) {
    if (prev) {
      if (it.start < prev.end) {
        warnings.push({ line: it.line, code: 'overlap', params: { with: prev.line, ...who } });
      } else if (it.start > prev.end) {
        warnings.push({ line: it.line, code: 'gap', params: { minutes: it.start - prev.end, after: prev.line, ...who } });
      }
    }
    if (!prev || it.end > prev.end) prev = it;
  }
}
