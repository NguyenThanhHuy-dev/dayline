// minutes per type for one group, largest first
export function statsByType(group) {
  const m = new Map();
  for (const it of group.items) m.set(it.type, (m.get(it.type) ?? 0) + it.end - it.start);
  return [...m].map(([type, minutes]) => ({ type, minutes })).sort((a, b) => b.minutes - a.minutes);
}

export const formatDuration = (min) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;

// "1g 30p" (vi) / "1h 30m" (en); zero parts are dropped
export function formatDurationHuman(min, lang = 'vi') {
  const [hu, mu] = lang === 'en' ? ['h', 'm'] : ['g', 'p'];
  const h = Math.floor(min / 60), m = min % 60;
  return [h && `${h}${hu}`, (m || !h) && `${m}${mu}`].filter(Boolean).join(' ');
}
