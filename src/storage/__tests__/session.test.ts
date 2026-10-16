jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));
import * as SecureStore from 'expo-secure-store';
import { loadSession, saveSession, accountKey, getSession } from '../session';
beforeEach(async () => { await saveSession(null); jest.clearAllMocks(); });
it('rejects an expired stored session', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'test', user: { id: 'alice' }, expiresAt: '2000-01-01' }));
  expect(await loadSession()).toBeNull();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
});
it('rejects an invalid expiration instead of keeping a permanent session', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'test', user: { id: 'alice' }, expiresAt: 'invalid' }));
  expect(await loadSession()).toBeNull();
});
it('scopes cache keys to the authenticated account and clears them on logout', async () => {
  await saveSession({ token: 'test', user: { id: 'alice', email: 'alice@example.test' }, expiresAt: '2099-01-01' });
  expect(accountKey('meals')).toBe('alice:meals');
  await saveSession(null);
  expect(getSession()).toBeNull();
  expect(accountKey('meals')).toBe('signed-out:meals');
});
