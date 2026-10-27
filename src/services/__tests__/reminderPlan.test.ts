import { planNotifications } from '../reminderPlan';
import { ReminderPreferences, ReminderCategorySetting } from '../../api/reminders';

// Tuesday Oct 27 2026, 12:00 local
const NOW = new Date(2026, 9, 27, 12, 0, 0);

const prefs: ReminderPreferences = {
  masterEnabled: true, adaptiveEnabled: true, suggestionsMuted: false,
  quietStart: '22:00', quietEnd: '07:00', dailyCap: 3, snoozeMinutes: 30,
  pausedUntil: null, weeklyDigest: false, timezone: null, timezoneLocked: false,
};

const meal = (over: Partial<ReminderCategorySetting> = {}): ReminderCategorySetting => ({
  category: 'meal:lunch', enabled: true, times: ['12:30'], daysOfWeek: null,
  intervalMinutes: null, leadMinutes: null, wakingStart: null, wakingEnd: null, source: 'manual', ...over,
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
