import { TYPES } from './parser.js';
import { formatTime } from './serializer.js';
import { moveRange } from './edit.js';
import { t } from './i18n.js';
import { EXPORT, unionRange, exportLayout, fileNames } from './exportLayout.js';

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

// ui: { selectedLine, onSelect(line), onDelete(line), onMove(line, start, end) (body move and edge resize) } - interactive only, export ignores it
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

// Draws groups (names already display-ready) on canvases with the same geometry as the DOM timeline.
// combine: one canvas, groups as columns on a shared hour axis; otherwise one canvas per group. Empty groups are skipped.
const SANS = '"IBM Plex Sans", system-ui, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';
const VI_TEST = 'ạ ế ộ ữ Thứ Chủ nhật';

// Makes sure the web fonts used by the canvas are loaded (Vietnamese + latin) before drawing.
export async function loadExportFonts() {
  if (!document.fonts) return;
  await Promise.all([
    ...[400, 600, 700].map((w) => document.fonts.load(`${w} 16px "IBM Plex Sans"`, VI_TEST)),
    document.fonts.load('400 12px "IBM Plex Mono"', '0123456789:-'),
  ]).catch(() => {});
  await document.fonts.ready;
}

export function drawGroups(groups, view = DEFAULT_VIEW, { combine = false } = {}) {
  const list = groups.filter((g) => g?.items.length);
  const sets = combine && list.length ? [list] : list.map((g) => [g]);
  return sets.map((set) => drawSet(set, view, set.length > 1));
}

function drawSet(set, view, combined) {
  const { L, TOP } = EXPORT, S = 2;
  const range = unionRange(set, view.full);
  const { t0, t1 } = range;
  const lay = exportLayout(set.length, range, view.px);
  const cv = document.createElement('canvas');
  cv.width = lay.W * S;
  cv.height = lay.H * S;
  const ctx = cv.getContext('2d');
  ctx.scale(S, S);
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  const font = (w, px, fam = SANS) => { ctx.font = `${w} ${px}px ${fam}`; };

  ctx.fillStyle = v('--bg');
  ctx.fillRect(0, 0, lay.W, lay.H);
  for (let r = 0; r < lay.rows; r++) { // one hour axis per row (same range, so columns align)
    const y0 = r * lay.rowH;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = v('--fg');
    ctx.fillRect(L, y0 + TOP, 2, (t1 - t0) * view.px);
    font(400, 12, MONO);
    for (let m = t0; m <= t1; m += 60) {
      const y = y0 + TOP + (m - t0) * view.px;
      ctx.textAlign = 'right';
      ctx.fillText(formatTime(m), L - 14, y);
      ctx.fillRect(L - 8, y - 1, 14, 2);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (combined) { // small brand mark in the axis gutter
      ctx.fillStyle = v('--muted');
      font(600, 12);
      ctx.fillText('Dayline', 12, y0 + 34);
    }
  }
  set.forEach((g, i) => {
    const { x: cx, y: cy } = lay.cells[i];
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = v('--fg');
    font(700, combined ? 22 : 26);
    ctx.fillText(g.name, combined ? cx + 18 : 16, cy + 34, lay.colW - 30);
    drawColumn(ctx, g, cx, cy, lay.colW, t0, view, v, font);
  });
  return cv;
}

function drawColumn(ctx, group, cx, cy, colW, t0, view, v, font) {
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  for (const it of layout(group, view.full).items) {
    const y = cy + EXPORT.TOP + (it.start - t0) * view.px;
    const h = (it.end - it.start) * view.px;
    const x = cx + 18, w = colW - 30;
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
    const short = h < SHORT_PX;
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
      ctx.fillText(it.title, x + 24 + tw + 10, y + h / 2, w - 24 - tw - 10 - 8);
    } else {
      font(400, 12, MONO);
      ctx.fillText(time, x + 24, y + 17);
      font(700, 16);
      ctx.fillText(it.title, x + 24, y + 38, w - 36);
      font(400, 12);
      ctx.fillStyle = v('--muted');
      it.notes.forEach((n, k) => ctx.fillText(n, x + 24, y + 58 + k * 16, w - 36));
    }
    ctx.restore();
  }
}

// Downloads canvases as PNGs one after another (small delay so browsers do not block multiple downloads).
export async function downloadCanvases(cvs, names, delay = 150) {
  const files = fileNames(names);
  for (let i = 0; i < cvs.length; i++) {
    const blob = await new Promise((res) => cvs[i].toBlob(res));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = files[i];
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    if (i < cvs.length - 1) await new Promise((r) => setTimeout(r, delay));
  }
}

function span(cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}
