jest.mock('../LegacyMigrationGate', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('../../storage/accountMedia', () => ({ removeOwnedPhotoCopies: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../services/accountLifecycle', () => ({ clearTemporaryExports: jest.fn(), resumeAccountCleanup: jest.fn(), removeAccount: jest.fn(), shareAccountExport: jest.fn() }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn().mockResolvedValue(null), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('../../api/client', () => ({ api: { post: jest.fn(), get: jest.fn() } }));
const React = require('react');
const { act, create } = require('react-test-renderer');
const { Button, TextInput, Text, AppState } = require('react-native');
const { api } = require('../../api/client');
const { saveSession, getSession } = require('../../storage/session');
const SecureStore = require('expo-secure-store');
const AuthGate = require('../AuthGate').default;
const unverified = { token: 'session', expiresAt: '2099-01-01', user: { id: 'alice', email: 'alice@example.test', emailVerifiedAt: null } };
let tree;
const button = title => tree.root.findAllByType(Button).find(node => node.props.title === title);
async function mount() { await act(async () => { tree = create(<AuthGate><Text>Protected account</Text></AuthGate>); }); }
async function press(title) { await act(async () => { await button(title).props.onPress(); }); }
function text() { return JSON.stringify(tree.toJSON()); }
beforeEach(async () => { await saveSession(null); jest.clearAllMocks(); SecureStore.getItemAsync.mockResolvedValue(null); });
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });

test('forgot password submits email only, clears password and can return to sign in', async () => {
  await mount();
  await act(async () => { tree.root.findAllByType(TextInput)[0].props.onChangeText(' Alice@Example.test '); tree.root.findAllByType(TextInput)[1].props.onChangeText('secret-password'); });
  await press('Forgot password?');
  expect(tree.root.findAllByType(TextInput)).toHaveLength(1);
  api.post.mockResolvedValue({ data: { message: 'If eligible, check your email.' } });
  await press('Send reset link');
  expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'alice@example.test' });
  expect(text()).toContain('If eligible');
  await press('Back to sign in');
  expect(tree.root.findAllByType(TextInput)[1].props.value).toBe('');
});
test('registration gates data, resends verification, then refresh unlocks verified account', async () => {
  await mount(); await press('Create an account');
  await act(async () => { tree.root.findAllByType(TextInput)[0].props.onChangeText('alice@example.test'); tree.root.findAllByType(TextInput)[1].props.onChangeText('secret-password'); });
  api.post.mockResolvedValueOnce({ data: unverified });
  await press('Create account');
  expect(text()).toContain('Verify your email'); expect(text()).not.toContain('Protected account');
  api.post.mockResolvedValueOnce({ data: { message: 'If eligible, check email.' } });
  await press('Resend verification email');
  expect(api.post).toHaveBeenLastCalledWith('/auth/resend-verification', { email: 'alice@example.test' });
  api.get.mockResolvedValueOnce({ data: { user: { ...unverified.user, emailVerifiedAt: '2026-10-13' } } });
  await press('I’ve verified my email'); expect(text()).toContain('Protected account');
});
test('legacy session cannot bypass verification and revoked session returns to login', async () => {
  SecureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(unverified));
  api.get.mockRejectedValueOnce({ response: { status: 401 } });
  await mount(); expect(getSession()).toBeNull(); expect(text()).toContain('Welcome back');
});
test('network and rate limit errors are visible and allow retry', async () => {
  await mount(); await press('Forgot password?');
  await act(async () => tree.root.findByType(TextInput).props.onChangeText('alice@example.test'));
  api.post.mockRejectedValueOnce({ response: { status: 429, data: { error: 'Too many attempts. Try again in 15 minutes.' } } });
  await press('Send reset link'); expect(text()).toContain('Too many attempts'); expect(button('Send reset link').props.disabled).toBe(false);
  api.post.mockRejectedValueOnce(new Error('offline'));
  await press('Send reset link'); expect(text()).toContain('Check your connection');
});
test('returning from email refreshes status without overwriting a newer session', async () => {
  let onState;
  const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((event, fn) => { onState = fn; return { remove: jest.fn() }; });
  SecureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(unverified));
  api.get.mockResolvedValueOnce({ data: { user: unverified.user } });
  await mount();
  let resolve;
  api.get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await act(async () => { onState('active'); });
  await act(async () => { await saveSession(null); resolve({ data: { user: { ...unverified.user, emailVerifiedAt: '2026-10-13' } } }); });
  expect(getSession()).toBeNull(); expect(text()).toContain('Welcome back'); listener.mockRestore();
});
