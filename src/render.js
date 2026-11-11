import { TYPES } from './parser.js';
import { formatTime } from './serializer.js';

export const DEFAULT_VIEW = { px: 1.5, full: false };
const SHORT_PX = 60; // items shorter than this (in px) render on one line

// shortcut: overlapping items are drawn on top of each other (a warning is shown), when needed add lanes
export function renderTimeline(el, group, view = DEFAULT_VIEW) {
  el.replaceChildren();
  if (!group || !group.items.length) {
    el.style.height = '';
    el.textContent = 'Chưa có dữ liệu.';
    return;
  }
  const { items, t0, t1 } = layout(group, view.full);
  el.style.height = `${(t1 - t0) * view.px}px`;

  for (let m = t0; m <= t1; m += 60) {
    const hour = document.createElement('div');
    hour.className = 'hour';
    hour.style.top = `${(m - t0) * view.px}px`;
    hour.textContent = formatTime(m);
    el.append(hour);
  }

  for (const it of items) {
    const known = TYPES.includes(it.type);
    const div = document.createElement('div');
    div.className = `item t-${known ? it.type : 'unknown'}${(it.end - it.start) * view.px < SHORT_PX ? ' short' : ''}`;
    div.style.top = `${(it.start - t0) * view.px}px`;
    div.style.height = `${(it.end - it.start) * view.px}px`;
    const time = `${formatTime(it.start)}-${formatTime(it.end)}`;
    div.title = [`${time} ${it.title}`, ...it.notes].join('\n');
    div.append(span('time', time), span('title', it.title), ...it.notes.map((n) => span('note', n)));
    el.append(div);
  }
}

// full: show the whole 00:00-24:00 day instead of just the span of the items
export function layout(group, full = false) {
  const items = [...group.items].sort((a, b) => a.start - b.start);
  if (full) return { items, t0: 0, t1: 1440 };
  const t0 = Math.floor(items[0].start / 60) * 60;
  const t1 = Math.ceil(Math.max(...items.map((i) => i.end)) / 60) * 60;
  return { items, t0, t1 };
}

// Draws the group on a canvas (same geometry as the DOM timeline) and downloads it as PNG.
export function exportPng(group, view = DEFAULT_VIEW) {
  if (!group?.items.length) return;
  const { items, t0, t1 } = layout(group, view.full);
  const W = 520, L = 56, TOP = 44, S = 2;
  const cv = document.createElement('canvas');
  cv.width = W * S;
  cv.height = (TOP + (t1 - t0) * view.px + 16) * S;
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
    const y = TOP + (m - t0) * view.px;
    ctx.fillStyle = v('--muted');
    ctx.fillText(formatTime(m), 10, y);
    ctx.fillStyle = v('--line');
    ctx.fillRect(L, y, W - L - 8, 1);
  }
  for (const it of items) {
    const y = TOP + (it.start - t0) * view.px;
    const h = (it.end - it.start) * view.px;
    const x = L + 6, w = W - x - 8;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fillStyle = v(`--${TYPES.includes(it.type) ? it.type : 'unknown'}`);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = v('--fg');
    const time = `${formatTime(it.start)}-${formatTime(it.end)}`;
    if ((it.end - it.start) * view.px < SHORT_PX) {
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
