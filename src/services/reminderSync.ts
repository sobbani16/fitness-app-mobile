import { getReminderPreferences, getReminderCategories, updateTimezonePrefs, reconcileReminders } from '../api/reminders';
import { getLastWaterAt } from '../api/dailyStats';
import { loadMealsFor } from '../storage/meals';
import { planNotifications } from './reminderPlan';
import { loadProgressPrefs } from '../storage/progressPrefs';
import { applyPlan, setupNotifications } from './notifications';
import { accountStorage as AsyncStorage } from '../storage/accountStorage';
import { deviceTimezone } from './deviceTime';

export { deviceTimezone };

const LAST_TZ_KEY = 'reminders:lastDeviceTimezone';
const MIN_SYNC_INTERVAL_MS = 60 * 1000;

let inFlight: Promise<{ planned: number }> | null = null;
let lastSyncAt = 0;

// Reports the device zone to the backend when it changed (travel), then asks
// the backend to reconcile pending instances. Best-effort: offline simply
// keeps the last-known state until the next successful sync.
async function syncTimezone(): Promise<void> {
  const zone = deviceTimezone();
  const last = await AsyncStorage.getItem(LAST_TZ_KEY).catch(() => null);
  if (last === zone) return;
  const prefs = await updateTimezonePrefs({ detectedTimezone: zone });
  if (prefs && (prefs as { travelDetected?: boolean }).travelDetected !== false) {
    await reconcileReminders().catch(() => {});
  }
  await AsyncStorage.setItem(LAST_TZ_KEY, zone).catch(() => {});
}

// Pulls settings + facts, reconciles backend instances (travel/settings), then
// recomputes the local notification plan. Deduped + throttled so foreground
// bursts, account switches, and resume events cannot storm the API.
// Safe to call on app start, foreground, settings changes, and logs.
export async function syncReminderSchedules(force = false): Promise<{ planned: number }> {
  if (inFlight) return inFlight;
  if (!force && Date.now() - lastSyncAt < MIN_SYNC_INTERVAL_MS) return { planned: -1 };
  inFlight = (async () => {
    try {
      await syncTimezone().catch(() => {}); // never block scheduling on tz sync
      const [prefs, categories, lastWaterIso, meals] = await Promise.all([
        getReminderPreferences(),
        getReminderCategories(),
        getLastWaterAt().catch(() => null),
        loadMealsFor(new Date()).catch(() => [] as { mealType?: string }[]),
      ]);
      await setupNotifications();
      const plan = planNotifications(prefs, categories, {
        now: new Date(),
        lastWaterAt: lastWaterIso ? new Date(lastWaterIso) : null,
        mealsLoggedToday: new Set(meals.map(m => m.mealType).filter(Boolean) as string[]),
        supplementsEnabled: categories.some(c => c.category === 'supplement' && c.enabled),
        workoutPlanDays: (await loadProgressPrefs()).workoutDays,
      });
      await applyPlan(plan);
      lastSyncAt = Date.now();
      return { planned: plan.length };
    } catch {
      return { planned: 0 }; // offline: keep whatever was already scheduled
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function _resetReminderSyncForTests(): void { inFlight = null; lastSyncAt = 0; }
