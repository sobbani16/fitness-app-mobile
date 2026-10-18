jest.mock('../../api/exercises', () => ({ createSession: jest.fn(), appendSet: jest.fn(), finishSession: jest.fn() }));
jest.mock('../../storage/accountStorage', () => ({ accountStorage: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock('../../storage/session', () => ({ getSession: jest.fn(() => ({ user: { id: 'alice' } })), accountKey: key => `alice:${key}` }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const api = require('../../api/exercises');
const { accountStorage: storage } = require('../../storage/accountStorage');
const { getSession } = require('../../storage/session');
const { useExerciseSession } = require('../useExerciseSession');
let current, tree, disk;
function Harness() { current = useExerciseSession(); return null; }
async function mount() { await act(async () => { tree = create(<Harness />); }); }
beforeEach(async () => {
  jest.clearAllMocks(); disk = null;
  getSession.mockReturnValue({ user: { id: 'alice' } });
  storage.getItem.mockImplementation(async () => disk);
  storage.setItem.mockImplementation(async (_key, value) => { disk = value; });
  api.createSession.mockImplementation(async (type, sets, id) => ({ id, exerciseType: type, sets }));
  await mount();
});
afterEach(async () => { await act(async () => tree.unmount()); });
it('starts locally and blocks duplicate concurrent set taps', async () => {
  await act(async () => current.start('squat'));
  let resolve;
  api.createSession.mockImplementation(() => new Promise(r => { resolve = r; }));
  let pending;
  await act(async () => { pending = current.addSet(5, 100); await current.addSet(5, 100); });
  expect(api.createSession).toHaveBeenCalledTimes(1);
  expect(JSON.parse(disk).pending).toMatchObject({ reps: 5, weight: 100 });
  await act(async () => { resolve({ id: 'saved', sets: [{ reps: 5, weight: 100 }] }); await pending; });
  expect(current.sets).toHaveLength(1);
});
it('recovers an uncertain request after remount and reuses both IDs and the reviewed payload', async () => {
  await act(async () => current.start('squat'));
  api.createSession.mockRejectedValueOnce(new Error('response lost'));
  await act(async () => current.addSet(5, 100));
  const first = api.createSession.mock.calls[0];
  await act(async () => tree.unmount()); await mount();
  await act(async () => current.addSet(99, 999));
  expect(api.createSession.mock.calls[1]).toEqual(first);
  expect(current.draft.pending).toBeUndefined();
});
it('does not send a set when durable storage fails', async () => {
  await act(async () => current.start('squat'));
  storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await act(async () => current.addSet(5, 100));
  expect(api.createSession).not.toHaveBeenCalled();
  expect(current.error).toBe('disk full');
});
it('preserves finishing after a lost response and prevents additional sets until retry succeeds', async () => {
  await act(async () => current.start('squat'));
  await act(async () => current.addSet(5, 100));
  api.finishSession.mockRejectedValueOnce(new Error('offline'));
  await act(async () => current.finish());
  expect(current.draft.finishing).toBe(true);
  await act(async () => current.addSet(5, 100));
  expect(api.appendSet).not.toHaveBeenCalled();
  api.finishSession.mockResolvedValue({ ...current.draft.session, finishedAt: new Date().toISOString() });
  await act(async () => current.finish());
  expect(current.draft.session.finishedAt).toBeTruthy();
  await act(async () => current.clear()); expect(current.draft).toBeNull();
});
it('blocks requests after account changes and does not overwrite another account', async () => {
  await act(async () => current.start('squat'));
  getSession.mockReturnValue({ user: { id: 'bob' } });
  await act(async () => current.addSet(5, 100));
  expect(api.createSession).not.toHaveBeenCalled();
});
it('emits completion only after confirmed persistence and never includes workout details', async () => {
  const { setAnalyticsAdapter } = require('../../analytics/events'); const sink = jest.fn(); setAnalyticsAdapter(sink);
  try {
    await act(async () => current.start('squat')); await act(async () => current.addSet(5, 100));
    api.finishSession.mockRejectedValueOnce(new Error('offline'));
    await act(async () => current.finish()); expect(sink.mock.calls.map(call => call[0].name)).toEqual(['workout_started']);
    api.finishSession.mockResolvedValue({ ...current.draft.session, finishedAt: new Date().toISOString() });
    await act(async () => current.finish()); await act(async () => current.finish());
    expect(sink.mock.calls.map(call => call[0])).toEqual([{ name: 'workout_started', version: 1 }, { name: 'workout_completed', version: 1 }]);
  } finally { setAnalyticsAdapter(); }
});
