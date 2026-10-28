import { ReminderCategorySetting, ReminderPreferences } from '../api/reminders';

export interface PlannedNotification {
  identifier: string;
  category: string;
  title: string;
  body: string;
  fireAt: Date;
  deepLink: string;
  optional?: boolean; // counts against the daily nonessential budget
  merged?: string[];
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
const CONFLICT_WINDOW_MS = 10 * 60000;
const OPTIONAL_DEFER_MS = 15 * 60000;
const MERGEABLE = /^(meal:|supplement)/;

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
  if (s === e) return false; // equal start/end means "no quiet window", not 24h quiet
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
  ctx: { now: Date; lastWaterAt: Date | null; mealsLoggedToday: Set<string>; supplementsEnabled: boolean; workoutDoneToday?: boolean },
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
      let fire = new Date(ctx.lastWaterAt.getTime() + interval);
      if (fire <= ctx.now) continue; // backend tick handles the overdue gap
      if (isQuiet(fire.getHours() * 60 + fire.getMinutes(), s, prefs)) {
        // Reschedule to the end of the quiet window instead of dropping the reminder.
        const boundary = s.wakingStart != null && s.wakingEnd != null ? s.wakingStart : prefs.quietEnd;
        const bm = parseHHMM(boundary || '');
        if (bm == null) continue;
        const day = new Date(fire.getFullYear(), fire.getMonth(), fire.getDate());
        fire = new Date(day.getTime() + bm * 60000);
        if (fire <= new Date(ctx.lastWaterAt.getTime() + interval)) fire = new Date(fire.getTime() + 86400000);
      }
      out.push({ identifier: `water|${ctx.lastWaterAt.toISOString()}`, category: cat, title: TITLES.water, body: `It's been ${s.intervalMinutes ?? 120} min since your last water log.`, fireAt: fire, deepLink: DEEP_LINKS.water, optional: false });
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
        if (cat === 'workout' && at.getDate() === ctx.now.getDate() && ctx.workoutDoneToday) continue;
        const slot = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}@${t}`;
        out.push({ identifier: `${cat}|${slot}`, category: cat, title: TITLES[cat] || 'Reminder', body: cat === 'workout' ? `Your workout starts at ${t}.` : '', fireAt: at, deepLink: DEEP_LINKS[cat] || 'Dashboard', optional: s.source === 'adaptive' });
      }
    }
  }
  return enforceBudget(resolveConflicts(out, ctx.now), prefs, ctx.now);
}

// Compatible same-slot reminders merge; lower-priority optional ones defer —
// never completed or dropped silently.
export function resolveConflicts(plan: PlannedNotification[], now: Date): PlannedNotification[] {
  const sorted = [...plan].sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || Number(a.optional) - Number(b.optional));
  const kept: PlannedNotification[] = [];
  for (const p of sorted) {
    const clash = kept.find(k => Math.abs(k.fireAt.getTime() - p.fireAt.getTime()) <= CONFLICT_WINDOW_MS);
    if (!clash) { kept.push(p); continue; }
    if (MERGEABLE.test(clash.category) && MERGEABLE.test(p.category) && Boolean(clash.optional) === Boolean(p.optional)) {
      const cats = [...new Set([...(clash.merged || [clash.category]), p.category])].sort();
      clash.category = `bundle:${cats.join('+')}`;
      clash.identifier = `bundle|${cats.join('+')}|${clash.fireAt.toISOString()}`;
      clash.merged = cats;
      clash.title = `Reminder: ${cats.map(c => c.split(':').pop()).join(' and ')}`;
      clash.body = 'These reminders line up, so they arrive together.';
    } else if (p.optional && !clash.optional) {
      kept.push({ ...p, identifier: `${p.identifier}|deferred`, fireAt: new Date(clash.fireAt.getTime() + OPTIONAL_DEFER_MS) });
    } else if (clash.optional && !p.optional) {
      // Incoming user-scheduled reminder wins the slot; defer the optional one.
      clash.identifier = `${clash.identifier}|deferred`;
      clash.fireAt = new Date(p.fireAt.getTime() + OPTIONAL_DEFER_MS);
      kept.push(p);
    } else {
      kept.push(p);
    }
  }
  return kept;
}

// Optional (adaptive/interval) reminders are capped per local day; explicit
// user-scheduled times are exempt.
export function enforceBudget(plan: PlannedNotification[], prefs: ReminderPreferences, now: Date): PlannedNotification[] {
  const cap = prefs.dailyCap ?? 3;
  const counts: Record<string, number> = {};
  return plan.filter(p => {
    if (!p.optional) return true;
    const day = p.fireAt.toDateString();
    counts[day] = (counts[day] || 0) + 1;
    return counts[day] <= cap;
  });
}
