import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { addWater } from '../api/dailyStats';
import { navigateToTab } from '../navigation/navigationRef';
import { PlannedNotification } from './reminderPlan';

const CHANNEL_ID = 'reminders';
const IDENTIFIER_PREFIX = 'humai-reminder:';
const CATEGORY_PREFIX = 'humai-reminder:';
const QUICK_ADD_ML = 250;

const snooze30 = { identifier: 'snooze-30', buttonTitle: 'Snooze 30 min', options: { opensAppToForeground: false } };
const snooze60 = { identifier: 'snooze-60', buttonTitle: 'Snooze 60 min', options: { opensAppToForeground: false } };
const skip = { identifier: 'skip', buttonTitle: 'Skip today', options: { opensAppToForeground: false } };

// One OS notification-category per reminder category so buttons stay relevant.
const ACTIONS: Record<string, { identifier: string; buttonTitle: string; options?: { opensAppToForeground: boolean } }[]> = {
  'meal:breakfast': [{ identifier: 'act', buttonTitle: 'Log meal', options: { opensAppToForeground: true } }, snooze30, skip],
  'meal:lunch': [{ identifier: 'act', buttonTitle: 'Log meal', options: { opensAppToForeground: true } }, snooze30, skip],
  'meal:dinner': [{ identifier: 'act', buttonTitle: 'Log meal', options: { opensAppToForeground: true } }, snooze30, skip],
  'meal:snack': [{ identifier: 'act', buttonTitle: 'Log meal', options: { opensAppToForeground: true } }, snooze30, skip],
  water: [{ identifier: 'add-water', buttonTitle: `Log ${QUICK_ADD_ML} ml`, options: { opensAppToForeground: false } }, snooze30, skip],
  supplement: [{ identifier: 'act', buttonTitle: 'Mark taken', options: { opensAppToForeground: true } }, snooze30, skip],
  workout: [{ identifier: 'act', buttonTitle: 'Start workout', options: { opensAppToForeground: true } }, snooze30, skip],
  movement: [{ identifier: 'act', buttonTitle: 'View progress', options: { opensAppToForeground: true } }, snooze60, skip],
};

let initialized = false;
let lastNavigationResponse: string | null = null;

function openNotification(response: Notifications.NotificationResponse) {
  const action = response.actionIdentifier;
  if (action !== Notifications.DEFAULT_ACTION_IDENTIFIER && action !== 'act') return;
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
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Smart reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
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
    await Notifications.scheduleNotificationAsync({
      identifier: IDENTIFIER_PREFIX + p.identifier,
      content: {
        title: p.title,
        body: p.body,
        categoryIdentifier: CATEGORY_PREFIX + p.category,
        data: { category: p.category, deepLink: p.deepLink, identifier: p.identifier },
        // Optional reminders stay low-interruption; nothing here is urgent enough
        // for time-sensitive delivery.
        // Every scheduled reminder is an explicit user request — always show a
        // banner. 'passive' delivery goes straight to Notification Center with
        // no alert on iOS, which reads as "notifications not working".
        interruptionLevel: 'active',
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.fireAt },
    });
  }
}

async function snooze(content: Notifications.NotificationContent, minutes: number) {
  const data = (content.data || {}) as { category?: string; deepLink?: string; identifier?: string };
  await Notifications.scheduleNotificationAsync({
    identifier: `${IDENTIFIER_PREFIX}snooze|${Date.now()}`,
    content: {
      title: content.title || undefined,
      body: content.body || undefined,
      data,
      categoryIdentifier: `${CATEGORY_PREFIX}${data.category || 'meal:lunch'}`,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60 },
  });
}

async function handleResponse(response: Notifications.NotificationResponse) {
  const action = response.actionIdentifier;
  try {
    if (action === 'add-water') {
      await addWater(QUICK_ADD_ML);
      return; // next sync reschedules the water reminder off this new log
    }
    if (action?.startsWith('snooze-')) {
      await snooze(response.notification.request.content, Number(action.split('-')[1]) || 30);
      return;
    }
    if (action === 'skip') return; // today's other slots are user-configured repeats; leave them
    openNotification(response);
  } catch {
    // Offline or transient failure: the user can act again from the app.
  }
}
