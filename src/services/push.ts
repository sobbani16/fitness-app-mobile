import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerPushToken, unregisterPushToken } from '../api/pushTokens';
import { requestNotificationPermission } from './notifications';

/**
 * Requests notification permission, grabs the native device push token and
 * registers it with the backend. Returns the token on success, null when
 * permission is denied or any step fails (callers can safely fire-and-forget).
 * Wire from App.tsx once authenticated.
 */
export async function registerForPush(): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;
    const token = await Notifications.getDevicePushTokenAsync();
    const value = typeof token === 'string' ? token : token?.data;
    if (!value) return null;
    await registerPushToken(value, Platform.OS);
    return value;
  } catch {
    // Simulator without push entitlements, offline, etc. — never block startup.
    return null;
  }
}

/** Call on sign-out so the backend stops targeting this device. */
export async function unregisterForPush(token: string): Promise<void> {
  try {
    await unregisterPushToken(token);
  } catch {
    // Best-effort cleanup; token expiry handles the rest.
  }
}
