jest.mock('../../api/client', () => ({ api: { get: jest.fn(), put: jest.fn() } }));
jest.mock('../../storage/profile', () => ({ loadProfile: jest.fn(), saveProfile: jest.fn(async () => {}), clearProfile: jest.fn() }));
jest.mock('../../storage/session', () => ({ getSession: jest.fn(() => ({ user: { id: 'alice' } })) }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const { api } = require('../../api/client');
const storage = require('../../storage/profile');
const { getSession } = require('../../storage/session');
const { ProfileProvider, useProfile } = require('../ProfileContext');
const profile = { name: 'Alex', weightKg: 75, units: 'metric' };
let current, tree;
function Child() { current = useProfile(); return null; }
beforeEach(() => { jest.clearAllMocks(); getSession.mockReturnValue({ user: { id: 'alice' } }); storage.loadProfile.mockResolvedValue(profile); api.get.mockResolvedValue({ data: { profile } }); api.put.mockImplementation(async (_url, body) => ({ data: { profile: body } })); });
afterEach(async () => { await act(async () => tree.unmount()); });
async function mount() { await act(async () => { tree = create(<ProfileProvider><Child /></ProfileProvider>); }); }
it('serializes patches against the latest confirmed profile', async () => {
  await mount();
  await act(async () => { await Promise.all([current.update({ weightKg: 76 }), current.update({ units: 'imperial' })]); });
  expect(current.profile).toMatchObject({ weightKg: 76, units: 'imperial' });
  expect(api.put.mock.calls[1][1]).toMatchObject({ weightKg: 76, units: 'imperial' });
});
it('does not let a stale initial server read overwrite a saved edit', async () => {
  let resolve; api.get.mockImplementation(() => new Promise(r => { resolve = r; }));
  await mount();
  await act(async () => current.update({ name: 'Updated' }));
  await act(async () => resolve({ data: { profile } }));
  expect(current.profile.name).toBe('Updated');
});
it('does not persist a completed request into another account', async () => {
  await mount(); let resolve;
  api.put.mockImplementation(() => new Promise(r => { resolve = r; }));
  let promise;
  await act(async () => { promise = current.update({ weightKg: 80 }).catch(e => e.message); });
  const before = storage.saveProfile.mock.calls.length;
  getSession.mockReturnValue({ user: { id: 'bob' } });
  await act(async () => { resolve({ data: { profile: { ...profile, weightKg: 80 } } }); expect(await promise).toBe('Account changed'); });
  expect(storage.saveProfile).toHaveBeenCalledTimes(before);
});
