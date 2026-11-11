import { TYPES } from './parser.js';
import { formatTime } from './serializer.js';
import { moveRange } from './edit.js';
import { t } from './i18n.js';

export const DEFAULT_VIEW = { px: 1.5, full: false };
const SHORT_PX = 60; // items shorter than this (in px) render on one line
const DRAG_PX = 4; // pointer travel below this counts as a click
const LONG_PRESS_MS = 350; // touch: hold this long (moving < LONG_PRESS_SLOP px) to start dragging
const LONG_PRESS_SLOP = 8;

// Vertical pointer-drag of a block; commits once on release, a short press stays a click.
// Mouse/pen drag after DRAG_PX; touch needs a long press (LONG_PRESS_MS) so a finger can still scroll the page.
function enableDrag(div, it, view, ui) {
  div.style.touchAction = 'pan-y';
  div.addEventListener('pointerdown', (e) => {
    if (e.button || e.target.closest('.del, .grip')) return;
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

// Edge resize: drag a block's top/bottom grip (5-minute steps, min 5 min). Commits once on release.
// Touch only works on the selected block's grips (touch-action: none there), so scrolling stays free elsewhere.
function enableResize(grip, edge, it, view, ui, div, selected) {
  grip.addEventListener('pointerdown', (e) => {
    if (e.button || (e.pointerType === 'touch' && !selected)) return; // touch on unselected block: falls through to body long-press
    e.stopPropagation();
    e.preventDefault();
    const y0 = e.clientY, top0 = parseFloat(div.style.top);
    let moved = false, r = { start: it.start, end: it.end };
    try { grip.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    const onMove = (ev) => {
      if (!moved && Math.abs(ev.clientY - y0) < 2) return;
      moved = true;
      div.classList.add('resizing');
      const m = Math.round((it[edge === 'top' ? 'start' : 'end'] + (ev.clientY - y0) / view.px) / 5) * 5;
      r = edge === 'top' ? { start: Math.max(0, Math.min(m, it.end - 5)), end: it.end } : { start: it.start, end: Math.min(1440, Math.max(m, it.start + 5)) };
      div.style.top = `${top0 + (r.start - it.start) * view.px}px`;
      div.style.height = `${(r.end - r.start) * view.px}px`;
    };
    const end = (ev) => {
      grip.removeEventListener('pointermove', onMove);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      div.classList.remove('resizing');
      if (!moved) return;
      div.addEventListener('click', (c) => c.stopImmediatePropagation(), { capture: true, once: true });
      if (ev.type === 'pointerup') ui.onMove(it.line, r.start, r.end);
      else { div.style.top = `${top0}px`; div.style.height = `${(it.end - it.start) * view.px}px`; }
    };
    grip.addEventListener('pointermove', onMove);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  });
}

// ui: { selectedLine, onSelect(line), onDelete(line), onMove(line, start, end) (body move and edge resize) } - interactive only, exportPng ignores it
export function renderTimeline(el, group, view = DEFAULT_VIEW, ui = {}) {
  el.replaceChildren();
  if (!group || !group.items.length) {
    el.style.height = '';
    const img = Object.assign(document.createElement('img'), { src: 'assets/capybara-empty.webp', alt: '' });
    el.append(Object.assign(document.createElement('div'), { className: 'empty' }));
    el.firstChild.append(img, t('timeline.empty'));
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
    if (ui.onMove) {
      enableDrag(div, it, view, ui);
      const hPx = (it.end - it.start) * view.px;
      for (const edge of ['top', 'bot']) {
        const grip = document.createElement('div');
        grip.className = `grip ${edge}`;
        grip.style.height = `${hPx < 24 ? hPx * 0.25 : 6}px`;
        enableResize(grip, edge, it, view, ui, div, it.line === ui.selectedLine);
        div.append(grip);
      }
    }
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
  const W = 560, L = 64, TOP = 56, S = 2;
  const cv = document.createElement('canvas');
  cv.width = W * S;
  cv.height = (TOP + (t1 - t0) * view.px + 16) * S;
  const ctx = cv.getContext('2d');
  ctx.scale(S, S);
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  const font = (w, px, fam = 'system-ui, sans-serif') => { ctx.font = `${w} ${px}px ${fam}`; };
  const MONO = 'ui-monospace, Menlo, Consolas, monospace';
  const SERIF = "'Iowan Old Style', 'Palatino Linotype', Georgia, serif";

  ctx.fillStyle = v('--bg');
  ctx.fillRect(0, 0, W, cv.height / S);
  ctx.fillStyle = v('--fg');
  font(400, 26, SERIF);
  ctx.fillText(title, 16, 34);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = v('--fg');
  ctx.fillRect(L, TOP, 2, (t1 - t0) * view.px);
  font(400, 12, MONO);
  for (let m = t0; m <= t1; m += 60) {
    const y = TOP + (m - t0) * view.px;
    ctx.fillStyle = v('--fg');
    ctx.textAlign = 'right';
    ctx.fillText(formatTime(m), L - 14, y);
    ctx.fillRect(L - 8, y - 1, 14, 2);
  }
  ctx.textAlign = 'left';
  for (const it of items) {
    const y = TOP + (it.start - t0) * view.px;
    const h = (it.end - it.start) * view.px;
    const x = L + 18, w = W - x - 12;
    const ty = TYPES.includes(it.type) ? it.type : 'unknown';
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fillStyle = v(`--${ty}`);
    ctx.fill();
    ctx.clip();
    if (ty === 'unknown') { // hatch unknown, as in CSS
      ctx.strokeStyle = v('--bg');
      for (let d = -h; d < w; d += 10) { ctx.beginPath(); ctx.moveTo(x + d, y + h); ctx.lineTo(x + d + h, y); ctx.stroke(); }
    }
    const short = (it.end - it.start) * view.px < SHORT_PX;
    ctx.fillStyle = v(`--a-${ty}`);
    ctx.beginPath();
    ctx.roundRect(x + 11, short ? y + 6 : y + 10, 3, short ? h - 12 : Math.min(34, h - 20), 2);
    ctx.fill();
    ctx.fillStyle = v('--fg');
    const time = `${formatTime(it.start)}-${formatTime(it.end)}`;
    if (short) {
      font(400, 12, MONO);
      ctx.fillText(time, x + 24, y + h / 2);
      const tw = ctx.measureText(time).width;
      font(700, 14);
      ctx.fillText(it.title, x + 24 + tw + 10, y + h / 2);
    } else {
      font(400, 12, MONO);
      ctx.fillText(time, x + 24, y + 17);
      font(700, 16);
      ctx.fillText(it.title, x + 24, y + 38);
      font(400, 12);
      ctx.fillStyle = v('--muted');
      it.notes.forEach((n, k) => ctx.fillText(n, x + 24, y + 58 + k * 16));
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
