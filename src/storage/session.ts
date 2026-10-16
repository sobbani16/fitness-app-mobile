import { allowAccountWrites } from './accountWriteState';
import * as SecureStore from 'expo-secure-store';
export interface Session { token: string; expiresAt: string; user: { id: string; email: string; emailVerifiedAt?: string | null } }
const KEY = 'fitness.session.v1';
let current: Session | null = null;
const listeners = new Set<() => void>();
export const getSession = () => current;
export const accountKey = (key: string) => `${current?.user.id || 'signed-out'}:${key}`;
export async function loadSession() {
  const raw = await SecureStore.getItemAsync(KEY);
  try { current = raw ? JSON.parse(raw) : null; } catch { current = null; }
  if (current && (!current.token || !current.user?.id || !Number.isFinite(Date.parse(current.expiresAt)) || Date.parse(current.expiresAt) <= Date.now())) await saveSession(null);
  return current;
}
export async function saveSession(session: Session | null) {
  if (session) await SecureStore.setItemAsync(KEY, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(KEY);
  if (session) allowAccountWrites(session.user.id);
  current = session; listeners.forEach(fn => fn());
}
export function subscribeSession(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
