import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';
import { getSession } from '../storage/session';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const notificationTabs = ['Dashboard', 'LogMeal', 'LogExercise', 'History', 'Summary'] as const;
type NotificationTab = typeof notificationTabs[number];
let pending: { screen: NotificationTab; accountId: string } | null = null;

export function clearPendingNavigation() { pending = null; }

/** Notification destinations are an allowlist, never an arbitrary route from payload data. */
export function navigateToTab(screen: unknown) {
  const accountId = getSession()?.user.id;
  if (!accountId || !notificationTabs.some(tab => tab === screen)) return;
  pending = { screen: screen as NotificationTab, accountId };
  flushPendingNavigation();
}

export function flushPendingNavigation() {
  if (!pending) return;
  if (getSession()?.user.id !== pending.accountId) { pending = null; return; }
  if (!navigationRef.isReady() || !navigationRef.getRootState()?.routeNames.includes('Main')) return;
  const destination = pending;
  pending = null;
  navigationRef.navigate('Main', { screen: destination.screen });
}
