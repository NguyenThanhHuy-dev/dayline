import { TYPES } from './parser.js';
import { formatTime } from './serializer.js';

export const PX_PER_MIN = 1.5;
const SHORT_MIN = 40; // items shorter than this render on one line

// shortcut: overlapping items are drawn on top of each other (a warning is shown), when needed add lanes
export function renderTimeline(el, group) {
  el.replaceChildren();
  if (!group || !group.items.length) {
    el.style.height = '';
    el.textContent = 'Chưa có dữ liệu.';
    return;
  }
  const items = [...group.items].sort((a, b) => a.start - b.start);
  const t0 = Math.floor(items[0].start / 60) * 60;
  const t1 = Math.ceil(Math.max(...items.map((i) => i.end)) / 60) * 60;
  el.style.height = `${(t1 - t0) * PX_PER_MIN}px`;

  for (let m = t0; m <= t1; m += 60) {
    const hour = document.createElement('div');
    hour.className = 'hour';
    hour.style.top = `${(m - t0) * PX_PER_MIN}px`;
    hour.textContent = formatTime(m);
    el.append(hour);
  }

  for (const it of items) {
    const known = TYPES.includes(it.type);
    const div = document.createElement('div');
    div.className = `item t-${known ? it.type : 'unknown'}${it.end - it.start < SHORT_MIN ? ' short' : ''}`;
    div.style.top = `${(it.start - t0) * PX_PER_MIN}px`;
    div.style.height = `${(it.end - it.start) * PX_PER_MIN}px`;
    const time = `${formatTime(it.start)}-${formatTime(it.end)}`;
    div.title = [`${time} ${it.title}`, ...it.notes].join('\n');
    div.append(span('time', time), span('title', it.title), ...it.notes.map((n) => span('note', n)));
    el.append(div);
  }
}

function span(cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}
