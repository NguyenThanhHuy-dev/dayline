// Pure undo/redo stack of text snapshots, plus a `base` snapshot for revert.
export function createHistory(initial = '', max = 100) {
  const stack = [initial];
  let i = 0;
  const h = {
    base: initial,
    get current() { return stack[i]; },
    get canUndo() { return i > 0; },
    get canRedo() { return i < stack.length - 1; },
    push(text) {
      if (text === stack[i]) return;
      stack.splice(i + 1, Infinity, text);
      if (stack.length > max) stack.shift();
      i = stack.length - 1;
    },
    undo() { if (h.canUndo) i--; return stack[i]; },
    redo() { if (h.canRedo) i++; return stack[i]; },
    mark(text = stack[i]) { h.base = text; },
    revert() { h.push(h.base); return stack[i]; },
  };
  return h;
}
