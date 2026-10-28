// Per-account Progress preferences: calendar view + optional workout plan.
// accountKey scoping keeps prefs user-specific across account switching.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountKey } from './session';
import type { CalendarView } from '../services/dayAssessment';

const KEY = 'progress.preferences.v1';

export interface ProgressPrefs {
  calendarView: CalendarView;
  /** Weekdays (0=Sun..6=Sat) the user plans to train. Empty = no plan configured. */
  workoutDays: number[];
  /** Weekdays explicitly marked as planned rest. */
  restDays: number[];
}

const DEFAULTS: ProgressPrefs = { calendarView: 'overall', workoutDays: [], restDays: [] };

export async function loadProgressPrefs(): Promise<ProgressPrefs> {
  try {
    const raw = await AsyncStorage.getItem(accountKey(KEY));
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw);
    return {
      calendarView: ['nutrition', 'workouts', 'overall'].includes(p.calendarView) ? p.calendarView : 'overall',
      workoutDays: Array.isArray(p.workoutDays) ? p.workoutDays.filter((d: number) => d >= 0 && d <= 6) : [],
      restDays: Array.isArray(p.restDays) ? p.restDays.filter((d: number) => d >= 0 && d <= 6) : [],
    };
  } catch { return DEFAULTS; }
}

export async function saveProgressPrefs(p: ProgressPrefs): Promise<void> {
  await AsyncStorage.setItem(accountKey(KEY), JSON.stringify(p));
}
