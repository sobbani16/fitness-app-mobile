import { createRefreshCoordinator, summarize, retryDelay } from '../refreshCoordinator';
const net = () => Object.assign(new Error('Network Error'), { isAxiosError: true });
const http = (status: number) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status } });

it('reports partial success per task', async () => {
  const c = createRefreshCoordinator({ goals: async () => { throw http(500); }, meals: async () => 1, health: async () => { throw http(503); } });
  const result = await c.run();
  expect(result).toEqual({ goals: { ok: false, category: 'server' }, meals: { ok: true }, health: { ok: false, category: 'unavailable' } });
  expect(summarize(result)).toEqual({ state: 'partial', failed: ['goals', 'health'], transientOnly: true });
});
it('joins a refresh already in flight instead of duplicating requests', async () => {
  let calls = 0; let release: () => void = () => {};
  const c = createRefreshCoordinator({ goals: () => { calls++; return new Promise<void>(r => { release = r; }); } });
  const a = c.run(), b = c.run(['goals']);
  expect(c.busy()).toBe(true);
  for (let i = 0; i < 5; i++) await Promise.resolve();
  release();
  await Promise.all([a, b]);
  expect(calls).toBe(1);
  const again = c.run();
  for (let i = 0; i < 5; i++) await Promise.resolve();
  release();
  await again;
  expect(calls).toBe(2);
});
it('refreshes only the requested (failed) tasks', async () => {
  const goals = jest.fn(async () => {}), meals = jest.fn(async () => {});
  await createRefreshCoordinator({ goals, meals }).run(['goals']);
  expect(goals).toHaveBeenCalled();
  expect(meals).not.toHaveBeenCalled();
});
it('collapses a full outage into one offline status', () => {
  expect(summarize({ a: { ok: false, category: 'network' }, b: { ok: false, category: 'timeout' } }).state).toBe('offline');
  expect(summarize({ a: { ok: false, category: 'auth' } })).toEqual({ state: 'partial', failed: ['a'], transientOnly: false });
  expect(summarize({ a: { ok: true } }).state).toBe('ok');
});
it('backs off and stops after the bound', () => {
  expect([0, 1, 2, 3].map(n => retryDelay(n))).toEqual([5000, 15000, 45000, null]);
});
it('uses a task error category when provided (e.g. MealSyncError)', async () => {
  const c = createRefreshCoordinator({ meals: async () => { throw Object.assign(new Error('x'), { category: 'rate_limited' }); }, w: async () => { throw net(); } });
  expect(await c.run()).toEqual({ meals: { ok: false, category: 'rate_limited' }, w: { ok: false, category: 'network' } });
});
