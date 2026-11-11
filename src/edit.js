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
