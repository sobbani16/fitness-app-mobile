let mockUser: string | null = 'alice';
jest.mock('../../storage/session', () => ({ getSession: () => (mockUser ? { user: { id: mockUser } } : null) }));
jest.mock('../../api/dailyStats', () => ({ syncSteps: jest.fn() }));
import { syncSteps } from '../../api/dailyStats';
import { syncDeviceSteps, resetStepsSync, localDateKey } from '../stepsSync';

beforeEach(() => { mockUser = 'alice'; resetStepsSync(); jest.clearAllMocks(); (syncSteps as jest.Mock).mockResolvedValue({}); });

it('sends the local calendar day, not the server day', async () => {
  const lateEvening = new Date(2026, 10, 2, 22, 30);
  await syncDeviceSteps(5000, { now: lateEvening });
  expect(syncSteps).toHaveBeenCalledWith(5000, '2026-11-02');
  expect(localDateKey(lateEvening)).toBe('2026-11-02');
});
it('throttles live pedometer updates and skips unchanged totals', async () => {
  const t = new Date(2026, 10, 2, 10, 0, 0);
  await syncDeviceSteps(100, { now: t });
  expect((await syncDeviceSteps(150, { now: new Date(t.getTime() + 5000) })).status).toBe('skipped');
  expect((await syncDeviceSteps(100, { now: new Date(t.getTime() + 120000), force: true })).status).toBe('skipped');
  expect((await syncDeviceSteps(200, { now: new Date(t.getTime() + 61000) })).status).toBe('synced');
  expect(syncSteps).toHaveBeenCalledTimes(2);
});
it('shares one in-flight request between simultaneous callers', async () => {
  let resolve: () => void = () => {};
  (syncSteps as jest.Mock).mockReturnValue(new Promise<void>(r => { resolve = r; }));
  const a = syncDeviceSteps(10, { force: true }), b = syncDeviceSteps(20, { force: true });
  resolve();
  await Promise.all([a, b]);
  expect(syncSteps).toHaveBeenCalledTimes(1);
});
it('reports a classified failure and retries on the next attempt', async () => {
  (syncSteps as jest.Mock).mockRejectedValueOnce(Object.assign(new Error('x'), { isAxiosError: true, response: { status: 429 } }));
  expect(await syncDeviceSteps(300)).toEqual({ status: 'failed', category: 'rate_limited' });
  expect((await syncDeviceSteps(300)).status).toBe('synced');
});
it('does nothing when signed out', async () => {
  mockUser = null;
  expect((await syncDeviceSteps(300)).status).toBe('skipped');
  expect(syncSteps).not.toHaveBeenCalled();
});
