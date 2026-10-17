jest.mock('../../storage/dailyStats', () => ({ loadDailyStats: jest.fn(), addWater: jest.fn(), toggleSupplement: jest.fn() }));
jest.mock('../../api/dailyStats', () => ({ syncWater: jest.fn() }));
jest.mock('../../api/supplements', () => ({ getSupplementLogs: jest.fn(), logSupplement: jest.fn(), deleteSupplementLog: jest.fn() }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const storage = require('../../storage/dailyStats');
const { syncWater } = require('../../api/dailyStats');
const { getSupplementLogs } = require('../../api/supplements');
const { useDailyStats } = require('../useDailyStats');
let current, tree;
function Harness() { current = useDailyStats(false); return null; }
beforeEach(async () => {
  jest.clearAllMocks();
  storage.loadDailyStats.mockResolvedValue({ waterMl: 250, supplements: {} });
  storage.addWater.mockResolvedValue({ waterMl: 500, supplements: {} });
  syncWater.mockResolvedValue();
  await act(async () => { tree = create(<Harness />); });
});
afterEach(async () => { await act(async () => tree.unmount()); });
it('skips disabled supplements and keeps local water when network fails; retries the current total', async () => {
  expect(getSupplementLogs).not.toHaveBeenCalled();
  syncWater.mockRejectedValueOnce(new Error('offline'));
  await act(async () => current.addWater(250));
  expect(current.stats.waterMl).toBe(500);
  expect(current.waterSyncError).toContain('has not synced');
  storage.loadDailyStats.mockResolvedValue({ waterMl: 500, supplements: {} });
  await act(async () => current.retryWaterSync());
  expect(syncWater).toHaveBeenLastCalledWith(500);
  expect(current.waterSyncError).toBeNull();
});
it('prevents duplicate concurrent local writes and does not sync if local saving fails', async () => {
  let fail;
  storage.addWater.mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
  let pending;
  await act(async () => { pending = current.addWater(250).catch(error => error); await current.addWater(250); });
  expect(storage.addWater).toHaveBeenCalledTimes(1);
  await act(async () => { fail(new Error('storage')); await pending; });
  expect(syncWater).not.toHaveBeenCalled();
});
