// Per-account dismissal state for the "reminders are off" nudge shown on
// Today. "Don't show again" is permanent; "maybe later" snoozes for N days.
// Enabling reminders is the real fix — this only controls the prompt.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountKey } from './session';

const KEY = 'reminders.nudge.v1';
const SNOOZE_DAYS = 7;

export interface ReminderNudgeState { dontShow: boolean; snoozedUntil: number }

export async function loadReminderNudge(): Promise<ReminderNudgeState> {
  try {
    const raw = await AsyncStorage.getItem(accountKey(KEY));
    if (!raw) return { dontShow: false, snoozedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<ReminderNudgeState>;
    return {
      dontShow: parsed.dontShow === true,
      snoozedUntil: typeof parsed.snoozedUntil === 'number' ? parsed.snoozedUntil : 0,
    };
  } catch {
    return { dontShow: false, snoozedUntil: 0 };
  }
}

async function save(state: ReminderNudgeState): Promise<void> {
  try { await AsyncStorage.setItem(accountKey(KEY), JSON.stringify(state)); } catch { /* UI pref — safe to drop */ }
}

export async function dismissReminderNudge(): Promise<void> {
  await save({ dontShow: true, snoozedUntil: 0 });
}

export async function snoozeReminderNudge(days: number = SNOOZE_DAYS): Promise<void> {
  await save({ dontShow: false, snoozedUntil: Date.now() + days * 86400000 });
}
