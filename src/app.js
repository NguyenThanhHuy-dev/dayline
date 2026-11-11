import { parse } from './parser.js';
import { renderTimeline } from './render.js';
import { buildPrompt } from './prompt.js';

const $ = (id) => document.getElementById(id);
const src = $('src');
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

  renderTimeline($('timeline'), groups.find((g) => g.name === selected));

  const li = (cls, msg) => Object.assign(document.createElement('li'), { className: cls, textContent: msg });
  $('issues').replaceChildren(...errors.map((e) => li('err', e.msg)), ...warnings.map((w) => li('warn', w.msg)));
}

src.addEventListener('input', update);

$('file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  src.value = await f.text();
  e.target.value = '';
  update();
});

$('copy-prompt').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  await navigator.clipboard.writeText(buildPrompt());
  btn.textContent = 'Đã copy!';
  setTimeout(() => { btn.textContent = 'Copy prompt mẫu'; }, 1500);
});

// default content: the example files
const fetchText = (p) => fetch(p).then((r) => (r.ok ? r.text() : ''));
src.value = (await Promise.all(['examples/weekday.txt', 'examples/weekend.txt'].map(fetchText).map((p) => p.catch(() => '')))).join('\n');
update();
