import { ReminderCategorySetting, ReminderPreferences } from '../api/reminders';

export interface PlannedNotification {
  identifier: string;
  category: string;
  title: string;
  body: string;
  fireAt: Date;
  deepLink: string;
}

const TITLES: Record<string, string> = {
  'meal:breakfast': 'Time for breakfast?',
  'meal:lunch': 'Time for lunch?',
  'meal:dinner': 'Time for dinner?',
  'meal:snack': 'Snack time?',
  water: 'Time for some water?',
  supplement: 'Supplement reminder',
  workout: 'Workout coming up',
  movement: 'Time to move a little?',
};

// Tab names inside the Main navigator.
const DEEP_LINKS: Record<string, string> = {
  'meal:breakfast': 'LogMeal', 'meal:lunch': 'LogMeal', 'meal:dinner': 'LogMeal', 'meal:snack': 'LogMeal',
  water: 'Dashboard', supplement: 'Dashboard', workout: 'LogExercise', movement: 'Dashboard',
};

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const HORIZON_DAYS = 14;
const MAX_PER_CATEGORY = 20;

// Quiet check: explicit waking bounds mean "only allowed inside" — implemented
// by treating the complement as the quiet range.
function isQuiet(minutes: number, s: ReminderCategorySetting, prefs: ReminderPreferences): boolean {
  if (s.wakingStart != null && s.wakingEnd != null) return inWindow(minutes, s.wakingEnd, s.wakingStart);
  return inWindow(minutes, prefs.quietStart, prefs.quietEnd);
}

function parseHHMM(s: string): number | null {
  const m = HHMM.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function inWindow(minutes: number, start: string | null, end: string | null): boolean {
  const s = start == null ? null : parseHHMM(start);
  const e = end == null ? null : parseHHMM(end);
  if (s == null || e == null) return false;
  if (s === e) return true;
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

function nextOccurrences(from: Date, minutes: number, daysOfWeek: number[] | null, horizon: number): Date[] {
  const out: Date[] = [];
  for (let d = 0; d < horizon && out.length < MAX_PER_CATEGORY; d += 1) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + d);
    const weekday = day.getDay();
    if (daysOfWeek && !daysOfWeek.includes(weekday)) continue;
    const fire = new Date(day.getTime() + minutes * 60000);
    if (fire > from) out.push(fire);
  }
  return out;
}

// Pure planning: which local notifications should exist right now.
// All consent gating happens here too — nothing is scheduled unless the user
// opted in. Quiet hours suppress fixed times; waking bounds scope water.
export function planNotifications(
  prefs: ReminderPreferences,
  settings: ReminderCategorySetting[],
  ctx: { now: Date; lastWaterAt: Date | null; mealsLoggedToday: Set<string>; supplementsEnabled: boolean },
): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  if (!prefs.masterEnabled) return out;
  if (prefs.pausedUntil && new Date(prefs.pausedUntil) > ctx.now) return out;

  for (const s of settings) {
    if (!s.enabled) continue;
    if (s.source === 'adaptive' && !prefs.adaptiveEnabled) continue;
    const cat = s.category;

    if (cat === 'water') {
      const interval = (s.intervalMinutes ?? 120) * 60000;
      // Water needs a real anchor: never guess from missing logs.
      if (!ctx.lastWaterAt) continue;
      const fire = new Date(ctx.lastWaterAt.getTime() + interval);
      if (fire <= ctx.now) continue; // backend tick handles the overdue gap
      if (isQuiet(fire.getHours() * 60 + fire.getMinutes(), s, prefs)) continue;
      out.push({ identifier: `water|${ctx.lastWaterAt.toISOString()}`, category: cat, title: TITLES.water, body: `It's been ${s.intervalMinutes ?? 120} min since your last water log.`, fireAt: fire, deepLink: DEEP_LINKS.water });
      continue;
    }

    if (cat === 'movement') continue; // needs fresh device health data — later milestone

    const times = Array.isArray(s.times) ? s.times : [];
    const days = Array.isArray(s.daysOfWeek) ? s.daysOfWeek : null;
    for (const t of times) {
      const minutes = parseHHMM(t);
      if (minutes == null) continue;
      const lead = cat === 'workout' ? (s.leadMinutes ?? 30) : 0;
      for (const at of nextOccurrences(ctx.now, minutes - lead, days, HORIZON_DAYS)) {
        if (isQuiet(at.getHours() * 60 + at.getMinutes(), s, prefs)) continue;
        if (cat.startsWith('meal:') && at.getDate() === ctx.now.getDate() && ctx.mealsLoggedToday.has(cat.split(':')[1])) continue;
        if (cat === 'workout' && at.getDate() === ctx.now.getDate() && ctx.mealsLoggedToday.has('workout')) continue;
        const slot = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}@${t}`;
        out.push({ identifier: `${cat}|${slot}`, category: cat, title: TITLES[cat] || 'Reminder', body: cat === 'workout' ? `Your workout starts at ${t}.` : '', fireAt: at, deepLink: DEEP_LINKS[cat] || 'Dashboard' });
      }
    }
  }
  return out;
}
