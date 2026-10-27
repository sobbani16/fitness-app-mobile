import { getReminderPreferences, getReminderCategories } from '../api/reminders';
import { getLastWaterAt } from '../api/dailyStats';
import { loadMealsFor } from '../storage/meals';
import { planNotifications } from './reminderPlan';
import { applyPlan, setupNotifications } from './notifications';

// Pulls settings + facts, recomputes the local notification plan, applies it.
// Safe to call on app start, foreground, after settings changes, and after a
// water/meal log. Backend remains source of truth for consent and schedules.
export async function syncReminderSchedules(): Promise<{ planned: number }> {
  try {
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
    });
    await applyPlan(plan);
    return { planned: plan.length };
  } catch {
    return { planned: 0 }; // offline: keep whatever was already scheduled
  }
}
