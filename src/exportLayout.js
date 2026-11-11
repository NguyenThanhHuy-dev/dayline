// Pure geometry/naming for PNG export (no DOM): usable from node tests.
export const EXPORT = { L: 64, TOP: 56, BOTTOM: 16, SINGLE_COL: 496, MULTI_COL: 300, MAX_COLS: 4 };

// Time range covering every group (full = whole day); groups without items are ignored.
export function unionRange(groups, full = false) {
  if (full) return { t0: 0, t1: 1440 };
  const items = groups.flatMap((g) => g.items);
  if (!items.length) return { t0: 0, t1: 0 };
  return {
    t0: Math.floor(Math.min(...items.map((i) => i.start)) / 60) * 60,
    t1: Math.ceil(Math.max(...items.map((i) => i.end)) / 60) * 60,
  };
}

// n columns (max MAX_COLS per row, wrapping to more rows) sharing one range. Cell x is the column's origin (axis x for column 0).
export function exportLayout(n, { t0, t1 }, px) {
  const { L, TOP, BOTTOM, SINGLE_COL, MULTI_COL, MAX_COLS } = EXPORT;
  const cols = Math.min(n, MAX_COLS), rows = Math.ceil(n / MAX_COLS);
  const colW = n === 1 ? SINGLE_COL : MULTI_COL;
  const rowH = TOP + (t1 - t0) * px + BOTTOM;
  const cells = Array.from({ length: n }, (_, i) => ({ x: L + (i % MAX_COLS) * colW, y: Math.floor(i / MAX_COLS) * rowH }));
  return { cols, rows, colW, rowH, W: L + cols * colW, H: rows * rowH, cells };
}

// '<name>.png' with unicode-safe sanitizing; duplicates get -2, -3...
export function fileNames(names) {
  const seen = new Map();
  return names.map((n) => {
    const base = n.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'dayline';
    const k = (seen.get(base) ?? 0) + 1;
    seen.set(base, k);
    return `${k > 1 ? `${base}-${k}` : base}.png`;
  });
}
