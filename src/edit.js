// Removes only source line `lineNo` (1-based); every other byte of the text is kept as is.
export function removeLine(text, lineNo) {
  const lines = text.split(/(?<=\n)/);
  if (!Number.isInteger(lineNo) || lineNo < 1 || lineNo > lines.length) return text;
  lines.splice(lineNo - 1, 1);
  return lines.join('');
}
