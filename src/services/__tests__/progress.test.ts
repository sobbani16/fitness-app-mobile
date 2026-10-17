jest.mock('../../api/client', () => ({ api: { get: jest.fn() } }));
jest.mock('../../storage/accountStorage', () => ({ accountStorage: { getItem: jest.fn(async () => null), setItem: jest.fn() } }));
jest.mock('../../storage/session', () => ({ getSession: () => ({ user: { id: 'alice' } }), accountKey: (k: string) => `alice:${k}` }));
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
