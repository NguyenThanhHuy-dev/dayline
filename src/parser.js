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
function parseRange(s) {
  const parts = s.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return 'khung giờ phải có dạng HH:MM-HH:MM';
  const [a, b] = parts.map(parseTime);
  if (a === null) return `giờ bắt đầu không hợp lệ: "${parts[0]}"`;
  if (b === null) return `giờ kết thúc không hợp lệ: "${parts[1]}"`;
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
      cur = { name: h[1].trim() || 'Không tên', items: [] };
      groups.push(cur);
      return;
    }

    const err = (m) => errors.push({ line: n, msg: `Dòng ${n}: ${m}` });
    const f = line.split('|').map((s) => s.trim());
    if (f.length < 3) return err('thiếu trường (cần: giờ | loại | tiêu đề)');
    const range = parseRange(f[0]);
    if (typeof range === 'string') return err(range);
    const [start, end] = range;
    if (end < start) return err('giờ kết thúc nhỏ hơn giờ bắt đầu');
    if (end === start) return err('giờ kết thúc bằng giờ bắt đầu');
    if (!f[2]) return err('thiếu tiêu đề');

    const type = f[1].toLowerCase();
    if (!TYPES.includes(type)) {
      warnings.push({ line: n, msg: `Dòng ${n}: loại lạ "${f[1]}", tô màu xám` });
    }
    if (!cur) {
      cur = { name: 'Mặc định', items: [] };
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
  let prev = null; // item with the latest end so far
  for (const it of items) {
    if (prev) {
      if (it.start < prev.end) {
        warnings.push({ line: it.line, msg: `Dòng ${it.line}: chồng giờ với dòng ${prev.line} (${group.name})` });
      } else if (it.start > prev.end) {
        warnings.push({ line: it.line, msg: `Dòng ${it.line}: hở ${it.start - prev.end} phút sau dòng ${prev.line} (${group.name})` });
      }
    }
    if (!prev || it.end > prev.end) prev = it;
  }
}
