// Pure 12-hour ↔ 24-hour conversions (B5). No RN imports — unit-testable.
//   12:00 AM → "00:00" · 12:00 PM → "12:00" · 1:30 PM → "13:30" · 11:45 PM → "23:45"

export function toHHMM(hour12: number, minute: number, meridiem: 'AM' | 'PM'): string {
  const h24 = (hour12 % 12) + (meridiem === 'PM' ? 12 : 0);
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function fromHHMM(hhmm: string): { hour12: number; minute: number; meridiem: 'AM' | 'PM' } | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  return { hour12: h % 12 === 0 ? 12 : h % 12, minute: Number(m[2]), meridiem: h < 12 ? 'AM' : 'PM' };
}

export function display12(hhmm: string): string {
  const p = fromHHMM(hhmm);
  return p ? `${p.hour12}:${String(p.minute).padStart(2, '0')} ${p.meridiem}` : hhmm;
}
