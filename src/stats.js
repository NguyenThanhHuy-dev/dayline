// minutes per type for one group, largest first
export function statsByType(group) {
  const m = new Map();
  for (const it of group.items) m.set(it.type, (m.get(it.type) ?? 0) + it.end - it.start);
  return [...m].map(([type, minutes]) => ({ type, minutes })).sort((a, b) => b.minutes - a.minutes);
}

export const formatDuration = (min) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
