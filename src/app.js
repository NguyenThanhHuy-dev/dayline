import { parse, TYPES, formatIssue, groupLabel } from './parser.js';
import { renderTimeline, exportPng, DEFAULT_VIEW } from './render.js';
import { buildPrompt } from './prompt.js';
import { createHistory } from './history.js';
import { removeLine, setLineTimes } from './edit.js';
import { statsByType, formatDuration } from './stats.js';
import { t, getLang, setLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
const src = $('src');
const KEY = 'dayline:text';
const VKEY = 'dayline:view';
const view = { ...DEFAULT_VIEW, ...JSON.parse(localStorage.getItem(VKEY) ?? '{}') };
let selected = null;
let selLine = null; // source line of the selected block

function update() {
  const { groups, errors, warnings } = parse(src.value);
  if (!groups.some((g) => g.name === selected)) selected = groups[0]?.name ?? null;

  $('pills').replaceChildren(...groups.map((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill';
    b.role = 'tab';
    b.ariaSelected = String(g.name === selected);
    b.textContent = groupLabel(g, t);
    b.onclick = () => { selected = g.name; update(); };
    return b;
  }));

  const group = groups.find((g) => g.name === selected);
  if (!group?.items.some((i) => i.line === selLine)) selLine = null;
  $('selbar').hidden = selLine === null;
  renderTimeline($('timeline'), group && { ...group, name: groupLabel(group, t) }, view, { selectedLine: selLine, onSelect: select, onDelete: deleteLine, onMove: moveLine });
  $('stats').replaceChildren(...(group ? statsByType(group) : []).map(({ type, minutes }) => {
    const item = document.createElement('li');
    const sw = document.createElement('i');
    sw.className = `t-${TYPES.includes(type) ? type : 'unknown'}`;
    item.append(sw, `${TYPES.includes(type) ? t(`type.${type}`) : type}: ${formatDuration(minutes)}`);
    return item;
  }));

  const li = (cls, msg) => Object.assign(document.createElement('li'), { className: cls, textContent: msg });
  $('issues').replaceChildren(...errors.map((e) => li('err', formatIssue(e, t))), ...warnings.map((w) => li('warn', formatIssue(w, t))));
}

$('sel-del').addEventListener('click', () => deleteLine(selLine));
$('sel-clear').addEventListener('click', () => select(null));

// mobile pane switch (CSS shows both panes on desktop)
let pane;
function setPane(name) {
  pane = name;
  document.body.dataset.pane = name;
  for (const b of document.querySelectorAll('#panes button')) b.ariaSelected = String(b.dataset.pane === name);
}
for (const b of document.querySelectorAll('#panes button')) b.addEventListener('click', () => setPane(b.dataset.pane));

function select(line) { selLine = line; update(); }
function deleteLine(line) {
  flush();
  selLine = null;
  src.value = removeLine(src.value, line);
  changed();
  flush();
}

function moveLine(line, start, end) {
  flush();
  src.value = setLineTimes(src.value, line, start, end);
  changed();
  flush();
}

let history = createHistory();
let timer;
const syncButtons = () => {
  $('undo').disabled = !history.canUndo;
  $('redo').disabled = !history.canRedo;
  $('revert').disabled = src.value === history.base;
};
const changed = () => { localStorage.setItem(KEY, src.value); update(); syncButtons(); };
const flush = () => { clearTimeout(timer); history.push(src.value); syncButtons(); };
const restore = (text) => { src.value = text; changed(); };
const step = (fn) => { flush(); restore(fn()); };
src.addEventListener('input', () => { changed(); clearTimeout(timer); timer = setTimeout(flush, 400); });
$('undo').addEventListener('click', () => step(() => history.undo()));
$('redo').addEventListener('click', () => step(() => history.redo()));
$('revert').addEventListener('click', () => step(() => history.revert()));
document.addEventListener('click', (e) => {
  if (selLine !== null && !e.target.closest('.item')) select(null);
});
document.addEventListener('keydown', (e) => {
  if (selLine === null || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape') select(null);
  else if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.closest('input, textarea, select, [contenteditable]')) {
    e.preventDefault();
    deleteLine(selLine);
  }
});
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); step(() => history.undo()); }
  else if ((k === 'z' && e.shiftKey) || (k === 'y' && !e.metaKey)) { e.preventDefault(); step(() => history.redo()); }
});

$('file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const text = await f.text();
  flush();
  e.target.value = '';
  history.push(text);
  history.mark(text);
  restore(text);
});

$('copy-prompt').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  await navigator.clipboard.writeText(buildPrompt());
  flash(btn, 'flash.copied');
});

const flash = (btn, key) => {
  btn.textContent = t(key);
  setTimeout(() => { btn.textContent = t(btn.dataset.i18n); }, 1500);
};

$('share').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  location.hash = `d=${LZString.compressToEncodedURIComponent(src.value)}`;
  await navigator.clipboard.writeText(location.href);
  flash(btn, 'flash.linkCopied');
});

$('png').addEventListener('click', () => {
  const g = parse(src.value).groups.find((x) => x.name === selected);
  if (g) exportPng(g, view, groupLabel(g, t));
});

function setView(patch) {
  Object.assign(view, patch);
  view.px = Math.min(4, Math.max(0.5, view.px));
  $('zoom').value = view.px;
  localStorage.setItem(VKEY, JSON.stringify(view));
  update();
}
$('zoom').addEventListener('input', (e) => setView({ px: +e.target.value }));
$('full').addEventListener('change', (e) => setView({ full: e.target.checked }));
$('zoom').value = view.px;
$('full').checked = view.full;

function applyI18n() {
  document.documentElement.lang = getLang();
  document.title = t('doc.title');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const a of ['title', 'placeholder', 'aria-label']) {
    for (const el of document.querySelectorAll(`[data-i18n-${a}]`)) el.setAttribute(a, t(el.getAttribute(`data-i18n-${a}`)));
  }
  for (const b of document.querySelectorAll('#lang button')) b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
}
for (const b of document.querySelectorAll('#lang button')) {
  b.addEventListener('click', () => { setLang(b.dataset.lang); applyI18n(); update(); });
}
applyI18n();

// initial content: URL hash > localStorage > example files
const exampleFile = (n) => `examples/${n}${getLang() === 'en' ? '.en' : ''}.txt`;
const fetchText = (p) => fetch(p).then((r) => (r.ok ? r.text() : ''));
const shared = /^#d=(.+)$/.exec(location.hash);
src.value = (shared && LZString.decompressFromEncodedURIComponent(shared[1])) || localStorage.getItem(KEY) || (await Promise.all(['weekday', 'weekend'].map(exampleFile).map(fetchText).map((p) => p.catch(() => '')))).join('\n');
setPane(src.value.trim() ? 'view' : 'edit');
history = createHistory(src.value);
syncButtons();
update();
