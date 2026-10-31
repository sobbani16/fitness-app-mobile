jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../storage/session', () => ({ accountKey: key => `alice:${key}`, getSession: () => ({ user: { id: 'alice' } }) }));
jest.mock('../../api/dailyStats', () => ({ syncWater: jest.fn(async () => ({})) }));
jest.mock('../../api/supplements', () => ({}));
const React = require('react'), { act, create } = require('react-test-renderer');
const { useDailyStats } = require('../useDailyStats');
const { syncWater } = require('../../api/dailyStats');
let today, quick, tree;
function Today() { today = useDailyStats(false); return null; }
function Quick() { quick = useDailyStats(false); return null; }
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
test('Quick Add updates mounted Today immediately and serializes server totals', async () => {
  await act(async () => { tree = create(<><Today /><Quick /></>); });
  let release;
  syncWater.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  let first, second;
  await act(async () => {
    first = quick.addWater(250);
    second = today.addWater(250);
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  expect(quick.stats.waterMl).toBe(500);
  expect(today.stats.waterMl).toBe(500);
  expect(syncWater).toHaveBeenCalledTimes(1);
  await act(async () => { release({}); await Promise.all([first, second]); });
  expect(syncWater.mock.calls.map(([total]) => total)).toEqual([250, 500]);
});
