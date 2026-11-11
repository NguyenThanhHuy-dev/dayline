import { parse, TYPES } from './parser.js';
import { renderTimeline, exportPng } from './render.js';
import { buildPrompt } from './prompt.js';
import { statsByType, formatDuration } from './stats.js';

const $ = (id) => document.getElementById(id);
const src = $('src');
const KEY = 'dayline:text';
let selected = null;

function update() {
  const { groups, errors, warnings } = parse(src.value);
  if (!groups.some((g) => g.name === selected)) selected = groups[0]?.name ?? null;

  $('pills').replaceChildren(...groups.map((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill';
    b.role = 'tab';
    b.ariaSelected = String(g.name === selected);
    b.textContent = g.name;
    b.onclick = () => { selected = g.name; update(); };
    return b;
  }));

  const group = groups.find((g) => g.name === selected);
  renderTimeline($('timeline'), group);
  $('stats').replaceChildren(...(group ? statsByType(group) : []).map(({ type, minutes }) => {
    const item = document.createElement('li');
    const sw = document.createElement('i');
    sw.className = `t-${TYPES.includes(type) ? type : 'unknown'}`;
    item.append(sw, `${type}: ${formatDuration(minutes)}`);
    return item;
  }));

  const li = (cls, msg) => Object.assign(document.createElement('li'), { className: cls, textContent: msg });
  $('issues').replaceChildren(...errors.map((e) => li('err', e.msg)), ...warnings.map((w) => li('warn', w.msg)));
}

const changed = () => { localStorage.setItem(KEY, src.value); update(); };
src.addEventListener('input', changed);

$('file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  src.value = await f.text();
  e.target.value = '';
  changed();
});

$('copy-prompt').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  await navigator.clipboard.writeText(buildPrompt());
  flash(btn, 'Đã copy!');
});

const flash = (btn, text) => {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = old; }, 1500);
};

$('share').addEventListener('click', async (e) => {
  location.hash = `d=${LZString.compressToEncodedURIComponent(src.value)}`;
  await navigator.clipboard.writeText(location.href);
  flash(e.currentTarget, 'Đã copy link!');
});

$('png').addEventListener('click', () => exportPng(parse(src.value).groups.find((g) => g.name === selected)));

// initial content: URL hash > localStorage > example files
const fetchText = (p) => fetch(p).then((r) => (r.ok ? r.text() : ''));
const shared = /^#d=(.+)$/.exec(location.hash);
src.value = (shared && LZString.decompressFromEncodedURIComponent(shared[1])) || localStorage.getItem(KEY) || (await Promise.all(['examples/weekday.txt', 'examples/weekend.txt'].map(fetchText).map((p) => p.catch(() => '')))).join('\n');
update();
