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
  const { items, t0, t1 } = layout(group);
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

function layout(group) {
  const items = [...group.items].sort((a, b) => a.start - b.start);
  const t0 = Math.floor(items[0].start / 60) * 60;
  const t1 = Math.ceil(Math.max(...items.map((i) => i.end)) / 60) * 60;
  return { items, t0, t1 };
}

// Draws the group on a canvas (same geometry as the DOM timeline) and downloads it as PNG.
export function exportPng(group) {
  if (!group?.items.length) return;
  const { items, t0, t1 } = layout(group);
  const W = 520, L = 56, TOP = 44, S = 2;
  const cv = document.createElement('canvas');
  cv.width = W * S;
  cv.height = (TOP + (t1 - t0) * PX_PER_MIN + 16) * S;
  const ctx = cv.getContext('2d');
  ctx.scale(S, S);
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  const font = (w, px) => { ctx.font = `${w} ${px}px system-ui, sans-serif`; };

  ctx.fillStyle = v('--bg');
  ctx.fillRect(0, 0, W, cv.height / S);
  ctx.fillStyle = v('--fg');
  font(700, 18);
  ctx.fillText(group.name, 12, 28);

  ctx.textBaseline = 'middle';
  font(400, 11);
  for (let m = t0; m <= t1; m += 60) {
    const y = TOP + (m - t0) * PX_PER_MIN;
    ctx.fillStyle = v('--muted');
    ctx.fillText(formatTime(m), 10, y);
    ctx.fillStyle = v('--line');
    ctx.fillRect(L, y, W - L - 8, 1);
  }
  for (const it of items) {
    const y = TOP + (it.start - t0) * PX_PER_MIN;
    const h = (it.end - it.start) * PX_PER_MIN;
    const x = L + 6, w = W - x - 8;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fillStyle = v(`--${TYPES.includes(it.type) ? it.type : 'unknown'}`);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = v('--fg');
    const time = `${formatTime(it.start)}-${formatTime(it.end)}`;
    if (it.end - it.start < SHORT_MIN) {
      font(600, 13);
      ctx.fillText(`${time}  ${it.title}`, x + 8, y + h / 2);
    } else {
      font(400, 11);
      ctx.fillText(time, x + 8, y + 12);
      font(600, 13);
      ctx.fillText(it.title, x + 8, y + 28);
      font(400, 12);
      it.notes.forEach((n, k) => ctx.fillText(n, x + 8, y + 44 + k * 15));
    }
    ctx.restore();
  }
  cv.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${group.name.replace(/[^\p{L}\p{N}]+/gu, '-')}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

function span(cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}
