import { toHHMM, fromHHMM, display12 } from '../time12';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: jest.fn(async (k: string) => { store.delete(k); }),
  };
});

describe('12-hour ↔ 24-hour conversion (B5)', () => {
  test.each([
    [12, 0, 'AM', '00:00'], // midnight — never confused with noon
    [12, 0, 'PM', '12:00'], // noon
    [8, 0, 'AM', '08:00'],  // breakfast
    [12, 30, 'PM', '12:30'],// lunch
    [7, 30, 'PM', '19:30'], // dinner
    [1, 30, 'PM', '13:30'],
    [11, 45, 'PM', '23:45'],
    [12, 15, 'AM', '00:15'],
  ] as const)('%i:%i %s → %s', (h, m, mer, want) => {
    expect(toHHMM(h, m, mer)).toBe(want);
  });
  test('round-trips every canonical value', () => {
    for (const t of ['00:00', '08:00', '12:30', '13:30', '19:30', '23:45']) {
      const p = fromHHMM(t)!;
      expect(toHHMM(p.hour12, p.minute, p.meridiem)).toBe(t);
    }
  });
  test('display12 renders AM/PM correctly', () => {
    expect(display12('00:00')).toBe('12:00 AM');
    expect(display12('12:30')).toBe('12:30 PM');
    expect(display12('19:30')).toBe('7:30 PM');
  });
  test('rejects malformed input', () => {
    expect(fromHHMM('25:00')).toBeNull();
    expect(fromHHMM('lunch')).toBeNull();
  });
});

jest.mock('../../api/reminders', () => ({
  getReminderPreferences: jest.fn(),
  getReminderCategories: jest.fn(),
  updateTimezonePrefs: jest.fn(),
  reconcileReminders: jest.fn(),
}));
jest.mock('../../api/dailyStats', () => ({ getLastWaterAt: jest.fn() }));
jest.mock('../../storage/meals', () => ({ loadMealsFor: jest.fn() }));
jest.mock('../../storage/progressPrefs', () => ({ loadProgressPrefs: jest.fn() }));
jest.mock('../notifications', () => ({ applyPlan: jest.fn(), setupNotifications: jest.fn() }));

const api = require('../../api/reminders');
const { syncReminderSchedules, _resetReminderSyncForTests } = require('../reminderSync');

describe('reminderSync — storm guards + timezone reporting', () => {
  beforeEach(() => {
    jest.clearAllMocks(); _resetReminderSyncForTests();
    (require('@react-native-async-storage/async-storage') as { __store: Map<string, string> }).__store.clear();
    api.getReminderPreferences.mockResolvedValue({ masterEnabled: true, adaptiveEnabled: false, dailyCap: 3 });
    api.getReminderCategories.mockResolvedValue([{ category: 'meal:lunch', enabled: true, times: ['12:30'], source: 'manual' }]);
    api.updateTimezonePrefs.mockResolvedValue({ travelDetected: true });
    api.reconcileReminders.mockResolvedValue({ rescheduled: 1, expired: 0, planned: 1 });
    require('../../api/dailyStats').getLastWaterAt.mockResolvedValue(null);
    require('../../storage/meals').loadMealsFor.mockResolvedValue([]);
    require('../../storage/progressPrefs').loadProgressPrefs.mockResolvedValue({ workoutDays: [] });
  });

  test('concurrent calls share one in-flight sync (no request storm)', async () => {
    const [a, b, c] = await Promise.all([syncReminderSchedules(), syncReminderSchedules(), syncReminderSchedules()]);
    expect(api.getReminderPreferences).toHaveBeenCalledTimes(1);
    expect(b).toEqual(a); expect(c).toEqual(a);
  });

  test('throttles repeat syncs within the interval; force bypasses', async () => {
    await syncReminderSchedules();
    await syncReminderSchedules(); // throttled — no second fetch
    expect(api.getReminderPreferences).toHaveBeenCalledTimes(1);
    await syncReminderSchedules(true);
    expect(api.getReminderPreferences).toHaveBeenCalledTimes(2);
  });

  test('reports the device timezone on first sync, reconciles on travel detection', async () => {
    await syncReminderSchedules(true);
    expect(api.updateTimezonePrefs).toHaveBeenCalledWith({ detectedTimezone: expect.any(String) });
    expect(api.reconcileReminders).toHaveBeenCalled();
  });

  test('same timezone on next sync → no redundant tz write', async () => {
    await syncReminderSchedules(true);
    await syncReminderSchedules(true);
    expect(api.updateTimezonePrefs).toHaveBeenCalledTimes(1); // second call skipped — tz unchanged
  });
});
