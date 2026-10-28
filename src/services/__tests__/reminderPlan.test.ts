import { planNotifications } from '../reminderPlan';
import { ReminderPreferences, ReminderCategorySetting } from '../../api/reminders';

// Tuesday Oct 27 2026, 12:00 local
const NOW = new Date(2026, 9, 27, 12, 0, 0);

const prefs: ReminderPreferences = {
  masterEnabled: true, adaptiveEnabled: true, suggestionsMuted: false,
  quietStart: '22:00', quietEnd: '07:00', dailyCap: 3, snoozeMinutes: 30,
  pausedUntil: null, pauseReason: null, weeklyDigest: false, timezone: null, timezoneLocked: false,
};

const meal = (over: Partial<ReminderCategorySetting> = {}): ReminderCategorySetting => ({
  category: 'meal:lunch', enabled: true, times: ['12:30'], daysOfWeek: null,
  intervalMinutes: null, leadMinutes: null, wakingStart: null, wakingEnd: null, triggerEvent: null, triggerDelay: null, source: 'manual', ...over,
});

const ctx = (over = {}) => ({ now: NOW, lastWaterAt: null as Date | null, mealsLoggedToday: new Set<string>(), supplementsEnabled: true, ...over });

describe('planNotifications', () => {
  it('plans nothing without master consent', () => {
    expect(planNotifications({ ...prefs, masterEnabled: false }, [meal()], ctx())).toEqual([]);
  });
  it('plans nothing while paused', () => {
    expect(planNotifications({ ...prefs, pausedUntil: new Date(2026, 9, 28).toISOString() }, [meal()], ctx())).toEqual([]);
  });
  it('plans upcoming occurrences only, up to the horizon', () => {
    const plan = planNotifications(prefs, [meal()], ctx());
    expect(plan.length).toBeGreaterThanOrEqual(13);
    expect(plan.length).toBeLessThanOrEqual(14);
    expect(plan.every(p => p.fireAt > NOW)).toBe(true);
    expect(plan[0].category).toBe('meal:lunch');
    expect(plan[0].deepLink).toBe('LogMeal');
    expect(plan[0].identifier).toContain('meal:lunch|');
  });
  it('respects weekday-only schedules', () => {
    const plan = planNotifications(prefs, [meal({ daysOfWeek: [1, 2, 3, 4, 5] })], ctx());
    expect(plan.every(p => p.fireAt.getDay() >= 1 && p.fireAt.getDay() <= 5)).toBe(true);
  });
  it('skips today when the meal is already logged', () => {
    const plan = planNotifications(prefs, [meal()], ctx({ mealsLoggedToday: new Set(['lunch']) }));
    expect(plan.every(p => p.fireAt.getDate() !== NOW.getDate())).toBe(true);
  });
  it('suppresses times inside quiet hours', () => {
    const late = meal({ times: ['23:30'] });
    expect(planNotifications(prefs, [late], ctx())).toEqual([]);
    const p2 = { ...prefs, quietStart: null, quietEnd: null };
    expect(planNotifications(p2, [late], ctx()).length).toBeGreaterThan(0);
  });
  it('never schedules adaptive schedules without adaptive consent', () => {
    const s = meal({ source: 'adaptive' });
    expect(planNotifications({ ...prefs, adaptiveEnabled: false }, [s], ctx())).toEqual([]);
    expect(planNotifications(prefs, [s], ctx()).length).toBeGreaterThan(0);
  });
  it('water fires once per gap, anchored to the last log', () => {
    const water: ReminderCategorySetting = { ...meal(), category: 'water', times: [], intervalMinutes: 120 };
    expect(planNotifications(prefs, [water], ctx())).toEqual([]); // no logs -> no evidence
    const last = new Date(NOW.getTime() - 30 * 60000);
    const plan = planNotifications(prefs, [water], ctx({ lastWaterAt: last }));
    expect(plan).toHaveLength(1);
    expect(plan[0].fireAt.getTime()).toBe(last.getTime() + 120 * 60000);
    expect(plan[0].identifier).toContain(last.toISOString());
  });
  it('does not plan an overdue water reminder', () => {
    const water: ReminderCategorySetting = { ...meal(), category: 'water', times: [], intervalMinutes: 60 };
    const last = new Date(NOW.getTime() - 90 * 60000);
    expect(planNotifications(prefs, [water], ctx({ lastWaterAt: last }))).toEqual([]);
  });
  it('movement is never planned locally', () => {
    const movement: ReminderCategorySetting = { ...meal(), category: 'movement', times: ['15:00'] };
    expect(planNotifications(prefs, [movement], ctx())).toEqual([]);
  });
  it('workout fires lead-minutes before the configured time', () => {
    const workout: ReminderCategorySetting = { ...meal(), category: 'workout', times: ['18:00'], leadMinutes: 30 };
    const plan = planNotifications(prefs, [workout], ctx());
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0].fireAt.getHours() * 60 + plan[0].fireAt.getMinutes()).toBe(17 * 60 + 30);
    expect(plan[0].body).toContain('18:00');
  });
  it('waking window on a category overrides global quiet hours', () => {
    const water: ReminderCategorySetting = { ...meal(), category: 'water', times: [], intervalMinutes: 60, wakingStart: '08:00', wakingEnd: '21:00' };
    const last = new Date(NOW.getTime() - 30 * 60000); // fires 12:30 — inside waking window
    expect(planNotifications(prefs, [water], ctx({ lastWaterAt: last }))).toHaveLength(1);
  });
});

describe('budget, conflicts and copy', () => {
  const waterSetting: ReminderCategorySetting = { category: 'water', enabled: true, times: [], daysOfWeek: null, intervalMinutes: 60, leadMinutes: null, wakingStart: null, wakingEnd: null, source: 'manual', triggerEvent: null, triggerDelay: null };

  it('caps optional reminders per day without touching manual schedules', () => {
    const adaptiveMeal: ReminderCategorySetting = { ...waterSetting, category: 'meal:lunch', times: ['09:00', '11:00', '13:00', '15:00', '17:00'], source: 'adaptive' };
    const manual: ReminderCategorySetting = { ...waterSetting, category: 'meal:dinner', times: ['19:00', '20:00'] };
    const plan = planNotifications({ ...prefs, dailyCap: 2 }, [adaptiveMeal, manual], ctx());
    const todayOptional = plan.filter(p => p.optional && p.fireAt.toDateString() === NOW.toDateString());
    const manualToday = plan.filter(p => !p.optional && p.fireAt.toDateString() === NOW.toDateString());
    expect(todayOptional.length).toBeLessThanOrEqual(2);
    expect(manualToday.length).toBe(2); // manual schedules are exempt from the cap
  });
  it('merges compatible same-slot reminders into one', () => {
    const lunch = { identifier: 'a', category: 'meal:lunch', title: 'Lunch', body: '', fireAt: new Date(2026, 9, 27, 12, 30), deepLink: 'LogMeal' };
    const supp = { identifier: 'b', category: 'supplement', title: 'Supplement', body: '', fireAt: new Date(2026, 9, 27, 12, 32), deepLink: 'Dashboard' };
    const merged = require('../reminderPlan').resolveConflicts([lunch, supp], NOW);
    expect(merged).toHaveLength(1);
    expect(merged[0].category).toBe('bundle:meal:lunch+supplement');
    expect(merged[0].merged).toEqual(['meal:lunch', 'supplement']);
  });
  it('defers an optional reminder overlapping a manual one in both orders', () => {
    const opt = { identifier: 'w', category: 'water', title: 'Water', body: '', fireAt: new Date(2026, 9, 27, 12, 25), deepLink: 'Dashboard', optional: true };
    const manual = { identifier: 'm', category: 'meal:lunch', title: 'Lunch', body: '', fireAt: new Date(2026, 9, 27, 12, 30), deepLink: 'LogMeal' };
    const { resolveConflicts } = require('../reminderPlan');
    const plan = resolveConflicts([opt, manual], NOW);
    expect(plan).toHaveLength(2);
    const w = plan.find((p: any) => p.category === 'water');
    expect(w.identifier).toContain('deferred');
    expect(w.fireAt.getTime()).toBe(manual.fireAt.getTime() + 15 * 60000);
  });
  it('localized copy falls back to en and formats 12/24h', () => {
    const { reminderTitle, formatReminderTime, resolveLocale } = require('../reminderCopy');
    expect(reminderTitle('meal:lunch')).toBe('Time for lunch?');
    expect(reminderTitle('meal:lunch', 'es')).toBe('¿Hora de comer?');
    expect(reminderTitle('meal:lunch', 'fr')).toBe('Time for lunch?');
    expect(resolveLocale('es-MX')).toBe('es');
    expect(formatReminderTime(new Date(2026, 9, 27, 18, 30), 'en-US', true)).toContain('6:30');
    expect(formatReminderTime(new Date(2026, 9, 27, 18, 30), 'en-US', false)).toContain('18:30');
  });
});

describe('delivery visibility and quiet-hours fixes', () => {
  const waterSetting: ReminderCategorySetting = { category: 'water', enabled: true, times: [], daysOfWeek: null, intervalMinutes: 60, leadMinutes: null, wakingStart: null, wakingEnd: null, source: 'manual', triggerEvent: null, triggerDelay: null };

  it('water reminders are not optional (they must show a banner on iOS)', () => {
    const last = new Date(Date.now() + 60 * 60000 * -0.5 + 3600000); // fires 90m from now
    const plan = planNotifications(prefs, [waterSetting], ctx({ lastWaterAt: last }));
    expect(plan).toHaveLength(1);
    expect(plan[0].optional).toBe(false);
  });

  it('a water reminder inside quiet hours is rescheduled to quiet end, not dropped', () => {
    // Last water chosen so +60m lands at 23:00 (inside 22:00–07:00 quiet).
    const anchor = new Date(); anchor.setHours(22, 0, 0, 0);
    const plan = planNotifications(prefs, [{ ...waterSetting, intervalMinutes: 60 }], ctx({ lastWaterAt: anchor }));
    expect(plan).toHaveLength(1);
    const hour = plan[0].fireAt.getHours();
    expect(hour >= 7 && hour < 22).toBe(true); // moved to morning boundary
  });

  it('equal quiet start/end disables quiet suppression instead of silencing all', () => {
    const p = { ...prefs, quietStart: '22:00', quietEnd: '22:00' };
    const plan = planNotifications(p, [meal()], ctx());
    expect(plan.length).toBeGreaterThan(0);
  });

  it('workout suppression uses workoutDoneToday, not meal logs', () => {
    const w: ReminderCategorySetting = { ...meal(), category: 'workout', times: ['14:00'] };
    const isToday = (p: any) => p.fireAt.getDate() === NOW.getDate();
    expect(planNotifications(prefs, [w], ctx({ workoutDoneToday: true })).filter(isToday)).toEqual([]);
    expect(planNotifications(prefs, [w], ctx({ mealsLoggedToday: new Set(['workout'] as any) })).filter(isToday)).toHaveLength(1);
  });
});

test('workout plan days intersect reminder days; no plan keeps schedule', () => {
  const workout = meal({ category: 'workout', times: ['18:00'], daysOfWeek: null, leadMinutes: 30 });
  const withPlan = planNotifications(prefs, [workout], ctx({ workoutPlanDays: [1, 3, 5] }));
  expect(withPlan.length).toBeGreaterThan(0);
  expect(withPlan.every(p => [1, 3, 5].includes(p.fireAt.getDay()))).toBe(true);
});
