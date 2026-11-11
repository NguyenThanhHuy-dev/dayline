import { TYPES } from './parser.js';
import { formatTime } from './serializer.js';
import { moveRange } from './edit.js';
import { t } from './i18n.js';

export const DEFAULT_VIEW = { px: 1.5, full: false };
const SHORT_PX = 60; // items shorter than this (in px) render on one line
const DRAG_PX = 4; // pointer travel below this counts as a click
const LONG_PRESS_MS = 350; // touch: hold this long (moving < LONG_PRESS_SLOP px) to start dragging
const LONG_PRESS_SLOP = 8;

// Greedy lanes per cluster of overlapping items (items sorted by start). -> [{ lane, lanes }] aligned with items
export function assignLanes(items) {
  const out = [];
  let from = 0, laneEnds = [], clusterEnd = -1;
  const close = (to) => { for (let k = from; k < to; k++) out[k].lanes = laneEnds.length; };
  items.forEach((it, k) => {
    const fresh = it.start >= clusterEnd;
    if (fresh) { close(k); from = k; laneEnds = []; }
    let lane = laneEnds.findIndex((e) => e <= it.start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = it.end;
    clusterEnd = fresh ? it.end : Math.max(clusterEnd, it.end);
    out.push({ lane, lanes: 1 });
  });
  close(items.length);
  return out;
}

// Vertical pointer-drag of a block; commits once on release, a short press stays a click.
// Mouse/pen drag after DRAG_PX; touch needs a long press (LONG_PRESS_MS) so a finger can still scroll the page.
function enableDrag(div, it, view, ui) {
  div.style.touchAction = 'pan-y';
  div.addEventListener('pointerdown', (e) => {
    if (e.button || e.target.closest('.del')) return;
    const y0 = e.clientY, x0 = e.clientX;
    const touch = e.pointerType === 'touch';
    let moved = false, armed = !touch, timer;
    const stopScroll = (ev) => ev.preventDefault(); // non-passive: only after long press, scrolling hasn't started yet
    if (touch) {
      timer = setTimeout(() => {
        armed = true;
        div.classList.add('dragging');
        document.addEventListener('touchmove', stopScroll, { passive: false });
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS);
    }
    try { div.setPointerCapture(e.pointerId); } catch { /* pointer already gone: keep dragging without capture */ }
    const delta = (ev) => moveRange(it.start, it.end, (ev.clientY - y0) / view.px);
    const onMove = (ev) => {
      if (!armed) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > LONG_PRESS_SLOP) clearTimeout(timer); // finger is scrolling
        return;
      }
      if (!moved && Math.abs(ev.clientY - y0) < DRAG_PX) return;
      moved = true;
      div.classList.add('dragging');
      div.style.transform = `translateY(${(delta(ev).start - it.start) * view.px}px)`;
    };
    const end = (ev) => {
      clearTimeout(timer);
      document.removeEventListener('touchmove', stopScroll);
      div.removeEventListener('pointermove', onMove);
      div.removeEventListener('pointerup', end);
      div.removeEventListener('pointercancel', end);
      div.classList.remove('dragging');
      if (!moved) return;
      div.style.transform = '';
      div.addEventListener('click', (c) => c.stopImmediatePropagation(), { capture: true, once: true });
      const r = delta(ev);
      if (ev.type === 'pointerup' && r.start !== it.start) ui.onMove(it.line, r.start, r.end);
    };
    div.addEventListener('pointermove', onMove);
    div.addEventListener('pointerup', end);
    div.addEventListener('pointercancel', end);
  });
  if (matchMedia('(pointer: coarse)').matches) div.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ui: { selectedLine, onSelect(line), onDelete(line), onMove(line, start, end) } - interactive only, exportPng ignores it
export function renderTimeline(el, group, view = DEFAULT_VIEW, ui = {}) {
  el.replaceChildren();
  if (!group || !group.items.length) {
    el.style.height = '';
    el.textContent = t('timeline.empty');
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

  const lanes = assignLanes(items);
  for (const [n, it] of items.entries()) {
    const known = TYPES.includes(it.type);
    const div = document.createElement('div');
    div.className = `item t-${known ? it.type : 'unknown'}${(it.end - it.start) * view.px < SHORT_PX ? ' short' : ''}`;
    div.style.top = `${(it.start - t0) * view.px}px`;
    div.style.height = `${(it.end - it.start) * view.px}px`;
    const { lane, lanes: count } = lanes[n];
    if (count > 1) {
      div.style.left = `calc(8px + (100% - 8px) * ${lane / count})`;
      div.style.width = `calc((100% - 8px) / ${count})`;
      div.style.right = 'auto';
    }
    const time = `${formatTime(it.start)}-${formatTime(it.end)}`;
    div.title = [`${time} ${it.title}`, ...it.notes].join('\n');
    div.append(span('time', time), span('title', it.title), ...it.notes.map((n) => span('note', n)));
    if (ui.onMove) enableDrag(div, it, view, ui);
    if (ui.onSelect) div.onclick = () => ui.onSelect(it.line);
    if (it.line === ui.selectedLine) {
      div.classList.add('selected');
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'del';
      x.title = t('timeline.deleteBlock');
      x.textContent = '×';
      x.onclick = (e) => { e.stopPropagation(); ui.onDelete?.(it.line); };
      div.append(x);
    }
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
export function exportPng(group, view = DEFAULT_VIEW, title = group?.name) {
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
  ctx.fillText(title, 12, 28);

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
    if (!TYPES.includes(it.type)) { // hatch unknown, as in CSS
      ctx.strokeStyle = v('--bg');
      for (let d = -h; d < w; d += 10) { ctx.beginPath(); ctx.moveTo(x + d, y + h); ctx.lineTo(x + d + h, y); ctx.stroke(); }
    }
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
    a.download = `${title.replace(/[^\p{L}\p{N}]+/gu, '-')}.png`;
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
