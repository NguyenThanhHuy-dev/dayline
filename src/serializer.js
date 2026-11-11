export function formatTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// model (groups) -> text; inverse of parse()
export function serialize(groups) {
  return groups
    .map((g) => [
      `# ${g.name}`,
      ...g.items.map((i) => [`${formatTime(i.start)}-${formatTime(i.end)}`, i.type, i.title, ...i.notes].join(' | ')),
    ].join('\n'))
    .join('\n\n') + '\n';
}
