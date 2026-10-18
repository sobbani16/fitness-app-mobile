jest.mock('../../storage/accountStorage', () => ({ accountStorage: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock('../../storage/session', () => ({ accountKey: key => `alice:${key}`, getSession: jest.fn(() => ({ user: { id: 'alice' } })) }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const { accountStorage: storage } = require('../../storage/accountStorage');
const { getSession } = require('../../storage/session');
const { DisplayPreferencesProvider, useDisplayPreferences } = require('../DisplayPreferencesContext');
let tree, current;
function Child() { current = useDisplayPreferences(); return null; }
const mount = async () => { await act(async () => { tree = create(<DisplayPreferencesProvider><Child /></DisplayPreferencesProvider>); }); };
beforeEach(() => { jest.clearAllMocks(); getSession.mockReturnValue({ user: { id: 'alice' } }); storage.getItem.mockResolvedValue('{"water":false,"steps":"bad"}'); storage.setItem.mockResolvedValue(); });
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
it('loads validated account preferences and saves confirmed changes', async () => {
  await mount(); expect(current.cards.water).toBe(false); expect(current.cards.steps).toBe(true);
  await act(async () => current.setCard('steps', false));
  expect(storage.setItem).toHaveBeenCalledWith('alice:fitness.dashboard.v1', expect.any(String));
  expect(current.cards.steps).toBe(false);
});
it('retains choices on disk failure and rejects writes after account changes', async () => {
  await mount(); storage.setItem.mockRejectedValue(new Error('disk'));
  await act(async () => current.setCard('water', true));
  expect(current.cards.water).toBe(false); expect(current.error).toContain('Could not save');
  storage.setItem.mockClear(); getSession.mockReturnValue({ user: { id: 'bob' } });
  await act(async () => current.setCard('water', true)); expect(storage.setItem).not.toHaveBeenCalled();
});
