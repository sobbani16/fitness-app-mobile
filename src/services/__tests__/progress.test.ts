jest.mock('../../api/client', () => ({ api: { get: jest.fn() } }));
jest.mock('../../storage/accountStorage', () => ({ accountStorage: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}) } }));
jest.mock('../../storage/session', () => ({ getSession: jest.fn(() => ({ user: { id: 'alice' } })), accountKey: (k: string) => `alice:${k}` }));
jest.mock('../../storage/meals', () => ({ loadMealsFor: jest.fn(async () => []) }));
import { chartPoints, dateWindow, mean, ProgressDay, cachedProgress } from '../progress';
const day = (date: string, calories: number | null): ProgressDay => ({ date, calories, mealCount: calories === null ? 0 : 1, protein: null, carbs: null, fat: null, fiber: null, steps: null, waterMl: null, weightKg: null, workouts: null });
it('excludes unknown observations without excluding explicit zero', () => {
  expect(mean([day('a', null), day('b', 0), day('c', 100)], 'calories')).toEqual({ value: 50, count: 2 });
  expect(mean([day('a', null)], 'weightKg')).toEqual({ value: null, count: 0 });
});
it('groups long charts with coverage and keeps all-unknown buckets null', () => {
  const points = chartPoints(Array.from({ length: 90 }, (_, i) => day(String(i), null)), 'calories');
  expect(points).toHaveLength(10); expect(points[0]).toMatchObject({ value: null }); expect(points[0].label).toContain('0/9 days');
});
it('builds local calendar windows through daylight saving boundaries', () => {
  expect(dateWindow(3, new Date(2026, 2, 9, 12))).toEqual(['2026-03-07', '2026-03-08', '2026-03-09']);
});
it('does not invent zeros when neither remote cache nor device logs exist', async () => {
  expect(await cachedProgress(['2026-03-08'], 'UTC')).toEqual([day('2026-03-08', null)]);
});

it('coalesces identical in-flight reads but fetches again after settlement', async () => {
  const { api } = require('../../api/client');
  const { fetchProgress } = require('../progress');
  let resolve: Function = () => {};
  api.get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const a = fetchProgress(['2026-03-08'], 'UTC'), b = fetchProgress(['2026-03-08'], 'UTC');
  expect(api.get).toHaveBeenCalledTimes(1);
  resolve({ data: { entries: [day('2026-03-08', null)] } });
  expect(await a).toEqual(await b);
  api.get.mockResolvedValueOnce({ data: { entries: [] } });
  await fetchProgress(['2026-03-08'], 'UTC'); expect(api.get).toHaveBeenCalledTimes(2);
});
it('does not share different windows and releases failed requests for retry', async () => {
  const { api } = require('../../api/client'); const { fetchProgress } = require('../progress'); api.get.mockClear();
  api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { entries: [] } });
  const results = await Promise.allSettled([fetchProgress(['2026-03-09'], 'UTC'), fetchProgress(['2026-03-10'], 'UTC')]);
  expect(results[0].status).toBe('rejected'); expect(results[1].status).toBe('fulfilled'); expect(api.get).toHaveBeenCalledTimes(2);
  await fetchProgress(['2026-03-09'], 'UTC'); expect(api.get).toHaveBeenCalledTimes(3);
});

it('isolates concurrent accounts and rejects the old account response', async () => {
  const { api } = require('../../api/client'), { getSession } = require('../../storage/session');
  const { fetchProgress } = require('../progress'); api.get.mockClear();
  let resolve: Function = () => {};
  api.get.mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue({ data: { entries: [] } });
  const old = fetchProgress(['2026-03-11'], 'UTC');
  const checked = expect(old).rejects.toThrow('Account changed');
  getSession.mockReturnValue({ user: { id: 'bob' } });
  try {
    await fetchProgress(['2026-03-11'], 'UTC'); expect(api.get).toHaveBeenCalledTimes(2);
    resolve({ data: { entries: [] } }); await checked;
  } finally { getSession.mockReturnValue({ user: { id: 'alice' } }); }
});
