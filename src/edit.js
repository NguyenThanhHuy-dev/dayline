import { formatTime } from './serializer.js';

// Removes only source line `lineNo` (1-based); every other byte of the text is kept as is.
export function removeLine(text, lineNo) {
  const lines = text.split(/(?<=\n)/);
  if (!Number.isInteger(lineNo) || lineNo < 1 || lineNo > lines.length) return text;
  lines.splice(lineNo - 1, 1);
  return lines.join('');
}

// Rewrites only the time field (first `|` field) of source line `lineNo` (1-based); the rest of the text is kept as is.
export function setLineTimes(text, lineNo, start, end) {
  const lines = text.split(/(?<=\n)/);
  if (!Number.isInteger(lineNo) || lineNo < 1 || lineNo > lines.length) return text;
  lines[lineNo - 1] = lines[lineNo - 1].replace(
    /^(\s*)[^|\r\n]*?(\s*)(?=\||\r?\n|$)/,
    (_, lead, trail) => `${lead}${formatTime(start)}-${formatTime(end)}${trail}`,
  );
  return lines.join('');
}

// Shifts [start,end] by deltaMin: start snapped to 5 minutes, duration kept, clamped to 00:00-24:00.
export function moveRange(start, end, deltaMin) {
  const dur = end - start;
  const s = Math.min(1440 - dur, Math.max(0, Math.round((start + deltaMin) / 5) * 5));
  return { start: s, end: s + dur };
}

const MIN = 5;

// Single-column rule: places `lineNo` at [newStart,newEnd] (snapped/clamped to 00:00-24:00, >= 5 min) and fixes the
// other blocks of the same group (items: .line/.start/.end). Covered blocks are removed, partly covered ones shrink;
// a block that strictly contains the new range loses its tail (no split). -> [{line,start,end}|{line,remove:true}]
export function resolveRange(items, lineNo, newStart, newEnd) {
  const me = items.find((i) => i.line === lineNo);
  if (!me) return [];
  const s = Math.min(1440 - MIN, Math.max(0, newStart));
  const e = Math.min(1440, Math.max(s + MIN, newEnd));
  if (s === me.start && e === me.end) return [];
  const edits = [{ line: lineNo, start: s, end: e }];
  for (const o of items) {
    if (o === me || o.end <= s || o.start >= e) continue;
    const start = o.start < s ? o.start : e; // overlapped from the right: push start; from the left or containing: cut end
    const end = o.start < s ? s : o.end;
    edits.push(end - start < MIN || (o.start >= s && o.end <= e) ? { line: o.line, remove: true } : { line: o.line, start, end });
  }
  return edits;
}

// Applies resolveRange edits bottom-up so line numbers stay valid; untouched lines stay byte-identical.
export function applyEdits(text, edits) {
  return [...edits].sort((a, b) => b.line - a.line)
    .reduce((t, ed) => (ed.remove ? removeLine(t, ed.line) : setLineTimes(t, ed.line, ed.start, ed.end)), text);
}
