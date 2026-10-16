import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { getSession, saveSession } from '../storage/session';
import { blockAccountWrites, exportAccountCache, purgeAccountCache } from '../storage/accountStorage';

const PENDING = 'fitness.pendingAccountCleanup.v1';
function exportDirectory() { return new Directory(Paths.cache, 'account-exports'); }
export function clearTemporaryExports() {
  const dir = exportDirectory();
  if (dir.exists) dir.delete();
}
export async function resumeAccountCleanup() {
  const userId = await AsyncStorage.getItem(PENDING);
  if (!userId) return;
  await purgeAccountCache(userId);
  if (getSession()?.user.id === userId) await saveSession(null);
  await AsyncStorage.removeItem(PENDING);
}
export async function shareAccountExport(password: string) {
  const session = getSession();
  if (!session) throw new Error('Sign in first.');
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const { data } = await api.post('/me/account/export', { password }, { timeout: 90000 });
  if (getSession()?.token !== session.token) throw new Error('Account changed. Export cancelled.');
  const localDeviceData = await exportAccountCache(session.user.id);
  if (getSession()?.token !== session.token) throw new Error('Account changed. Export cancelled.');
  clearTemporaryExports();
  const dir = exportDirectory(); dir.create({ intermediates: true });
  const file = new File(dir, 'fitness-account.json');
  try {
    file.write(JSON.stringify({ ...data, localDeviceData }, null, 2));
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your account export' });
  } finally { clearTemporaryExports(); }
}
export async function removeAccount(password: string, confirmation: string) {
  const session = getSession();
  if (!session) throw new Error('Sign in first.');
  const { data } = await api.post('/me/account/delete', { password, confirmation }, { timeout: 90000 });
  if (data.deleted !== true) throw new Error('Deletion was not confirmed. Please try again.');
  blockAccountWrites(session.user.id);
  // Persist the cleanup task before removing credentials, so crashes can resume it.
  try {
    await AsyncStorage.setItem(PENDING, session.user.id);
    await purgeAccountCache(session.user.id);
    clearTemporaryExports();
    if (getSession()?.token === session.token) await saveSession(null);
    await AsyncStorage.removeItem(PENDING);
  } catch {
    throw new Error('Your server account was deleted, but device cleanup could not finish. Restart the app while online to retry cleanup.');
  }
}
