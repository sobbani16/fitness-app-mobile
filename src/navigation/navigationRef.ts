import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';
import { getSession } from '../storage/session';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const notificationTabs = ['Dashboard', 'LogMeal', 'LogExercise', 'History', 'Summary'] as const;
const notificationScreens = ['MySupplements'] as const;
type NotificationTab = typeof notificationTabs[number];
type NotificationScreen = typeof notificationScreens[number];
let pending: { screen: NotificationTab | NotificationScreen; accountId: string } | null = null;

export function clearPendingNavigation() { pending = null; }

/** Notification destinations are an allowlist, never an arbitrary route from payload data. */
export function navigateToTab(screen: unknown) {
  const accountId = getSession()?.user.id;
  const allowed = notificationTabs.some(tab => tab === screen) || notificationScreens.some(s => s === screen);
  if (!accountId || !allowed) return;
  pending = { screen: screen as NotificationTab | NotificationScreen, accountId };
  flushPendingNavigation();
}

export function flushPendingNavigation() {
  if (!pending) return;
  if (getSession()?.user.id !== pending.accountId) { pending = null; return; }
  if (!navigationRef.isReady() || !navigationRef.getRootState()?.routeNames.includes('Main')) return;
  const destination = pending;
  pending = null;
  if ((notificationTabs as readonly string[]).includes(destination.screen)) {
    navigationRef.navigate('Main', { screen: destination.screen as NotificationTab });
  } else {
    navigationRef.navigate(destination.screen as 'MySupplements');
  }
}
