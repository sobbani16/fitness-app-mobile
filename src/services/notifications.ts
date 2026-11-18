import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { addWater } from '../api/dailyStats';
import { doseAction } from '../api/supplements';
import { navigateToTab } from '../navigation/navigationRef';
import { accountStorage } from '../storage/accountStorage';
import { PlannedNotification } from './reminderPlan';

// v2 channel: sound + HIGH importance configured at creation (Android channel
// settings can't be changed programmatically afterwards — hence a new id).
const CHANNEL_ID = 'reminders-v2';
// Categories the user configured as silent go on a separate Android channel:
// per-notification sound can't override a channel on Android 8+.
const CHANNEL_QUIET_ID = 'reminders-quiet-v2';
const IDENTIFIER_PREFIX = 'humai-reminder:';
const CATEGORY_PREFIX = 'humai-reminder:';
const QUICK_ADD_ML = 250;
const SOUND_PREF_KEY = 'reminders:soundEnabledByCategory';

const snooze15 = { identifier: 'snooze-15', buttonTitle: 'Snooze 15 min', options: { opensAppToForeground: false } };
const snooze30 = { identifier: 'snooze-30', buttonTitle: 'Snooze 30 min', options: { opensAppToForeground: false } };
const snooze60 = { identifier: 'snooze-60', buttonTitle: 'Snooze 60 min', options: { opensAppToForeground: false } };
const skip = { identifier: 'skip', buttonTitle: 'Skip this dose', options: { opensAppToForeground: false } };
const skipToday = { identifier: 'skip', buttonTitle: 'Skip today', options: { opensAppToForeground: false } };

// One OS notification-category per reminder category so buttons stay relevant.
const ACTIONS: Record<string, { identifier: string; buttonTitle: string; options?: { opensAppToForeground: boolean } }[]> = {
  'meal:breakfast': [{ identifier: 'act', buttonTitle: 'Log meal', options: { opensAppToForeground: true } }, snooze30, skipToday],
  'meal:lunch': [{ identifier: 'act', buttonTitle: 'Log meal', options: { opensAppToForeground: true } }, snooze30, skipToday],
  'meal:dinner': [{ identifier: 'act', buttonTitle: 'Log meal', options: { opensAppToForeground: true } }, snooze30, skipToday],
  'meal:snack': [{ identifier: 'act', buttonTitle: 'Log meal', options: { opensAppToForeground: true } }, snooze30, skipToday],
  water: [{ identifier: 'add-water', buttonTitle: `Log ${QUICK_ADD_ML} ml`, options: { opensAppToForeground: false } }, snooze30, skipToday],
  supplement: [
    { identifier: 'mark-taken', buttonTitle: 'Mark taken', options: { opensAppToForeground: false } },
    { identifier: 'open-supplement', buttonTitle: 'Open details', options: { opensAppToForeground: true } },
    snooze15, snooze30, snooze60, skip,
  ],
  workout: [{ identifier: 'act', buttonTitle: 'Start workout', options: { opensAppToForeground: true } }, snooze30, skipToday],
  movement: [{ identifier: 'act', buttonTitle: 'View progress', options: { opensAppToForeground: true } }, snooze60, skipToday],
};

// Per-category audible choices cached by reminderSync so the foreground
// handler can decide without a network call. Default: sound on.
export async function setReminderSoundPrefs(prefs: Record<string, boolean>): Promise<void> {
  await accountStorage.setItem(SOUND_PREF_KEY, JSON.stringify(prefs)).catch(() => {});
}

async function soundAllowedFor(category?: string): Promise<boolean> {
  try {
    const raw = await accountStorage.getItem(SOUND_PREF_KEY);
    if (!raw) return true;
    const prefs = JSON.parse(raw) as Record<string, boolean>;
    if (prefs['*'] === false) return false;
    if (!category) return true;
    const base = category.split(':')[0].split('+').pop() || category;
    return prefs[category] !== false && prefs[base] !== false;
  } catch {
    return true;
  }
}

let initialized = false;
let lastNavigationResponse: string | null = null;

function openNotification(response: Notifications.NotificationResponse) {
  const action = response.actionIdentifier;
  if (action !== Notifications.DEFAULT_ACTION_IDENTIFIER && action !== 'act' && action !== 'open-supplement') return;
  const key = `${response.notification.request.identifier}:${response.notification.date}:${action}`;
  if (lastNavigationResponse === key) return;
  lastNavigationResponse = key;
  navigateToTab(response.notification.request.content.data?.deepLink);
  // Do not reopen an already-consumed destination on every subsequent app launch.
  void Notifications.clearLastNotificationResponseAsync().catch(() => {});
}

export async function setupNotifications() {
  if (initialized) return;
  initialized = true;
  Notifications.setNotificationHandler({
    // Foreground presentation: audible unless the user disabled sound for this
    // reminder category. Banners always show — a silent-mode device stays
    // silent at OS level regardless of this flag.
    handleNotification: async (notification) => ({
      shouldPlaySound: await soundAllowedFor(notification.request.content.data?.category as string | undefined),
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Smart reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_QUIET_ID, {
      name: 'Smart reminders (silent)',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
    });
  }
  for (const [category, actions] of Object.entries(ACTIONS)) {
    await Notifications.setNotificationCategoryAsync(CATEGORY_PREFIX + category, actions as Notifications.NotificationAction[]);
  }
  Notifications.addNotificationResponseReceivedListener(response => { void handleResponse(response); });
  // Recover a cold-start tap after auth/profile gates mount navigation. Never replay a logging action.
  const last = await Notifications.getLastNotificationResponseAsync().catch(() => null);
  if (last) openNotification(last);
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

export async function cancelAllReminderNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter(n => String(n.identifier).startsWith(IDENTIFIER_PREFIX))
    .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

// Replaces every managed local notification with the current plan. Local
// schedules are device-local by design: no duplicate remote sends.
export async function applyPlan(plan: PlannedNotification[]) {
  await cancelAllReminderNotifications();
  for (const p of plan) {
    const soundOff = p.soundEnabled === false;
    await Notifications.scheduleNotificationAsync({
      identifier: IDENTIFIER_PREFIX + p.identifier,
      content: {
        title: p.title,
        body: p.body,
        categoryIdentifier: CATEGORY_PREFIX + p.category,
        data: { category: p.category, deepLink: p.deepLink, identifier: p.identifier, soundEnabled: !soundOff, ...(p.data || {}) },
        // Optional reminders stay low-interruption; nothing here is urgent enough
        // for time-sensitive delivery.
        // Every scheduled reminder is an explicit user request — always show a
        // banner. 'passive' delivery goes straight to Notification Center with
        // no alert on iOS, which reads as "notifications not working".
        interruptionLevel: 'active',
        ...(soundOff ? {} : { sound: 'default' as const }),
        ...(Platform.OS === 'android' ? { channelId: soundOff ? CHANNEL_QUIET_ID : CHANNEL_ID } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.fireAt },
    });
  }
}

async function snooze(content: Notifications.NotificationContent, minutes: number) {
  const data = (content.data || {}) as { category?: string; deepLink?: string; identifier?: string; soundEnabled?: boolean };
  const soundOff = data.soundEnabled === false;
  await Notifications.scheduleNotificationAsync({
    identifier: `${IDENTIFIER_PREFIX}snooze|${Date.now()}`,
    content: {
      title: content.title || undefined,
      body: content.body || undefined,
      data,
      categoryIdentifier: `${CATEGORY_PREFIX}${data.category || 'meal:lunch'}`,
      ...(soundOff ? {} : { sound: 'default' as const }),
      ...(Platform.OS === 'android' ? { channelId: soundOff ? CHANNEL_QUIET_ID : CHANNEL_ID } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60 },
  });
}

async function handleResponse(response: Notifications.NotificationResponse) {
  const action = response.actionIdentifier;
  const data = (response.notification.request.content.data || {}) as { occurrenceId?: string };
  try {
    if (action === 'add-water') {
      await addWater(QUICK_ADD_ML);
      return; // next sync reschedules the water reminder off this new log
    }
    // Supplement dose actions write straight through to the occurrence so
    // history/adherence stays consistent with what the user tapped.
    if (action === 'mark-taken') {
      if (data.occurrenceId) await doseAction(data.occurrenceId, 'taken', { source: 'notification' });
      return;
    }
    if (action === 'skip') {
      if (data.occurrenceId) await doseAction(data.occurrenceId, 'skipped', { source: 'notification' });
      return; // today's other slots are user-configured repeats; leave them
    }
    if (action?.startsWith('snooze-')) {
      const minutes = Number(action.split('-')[1]) || 30;
      if (data.occurrenceId) await doseAction(data.occurrenceId, 'snoozed', { minutes, source: 'notification' }).catch(() => {});
      await snooze(response.notification.request.content, minutes);
      return;
    }
    openNotification(response);
  } catch {
    // Offline or transient failure: the user can act again from the app.
  }
}
