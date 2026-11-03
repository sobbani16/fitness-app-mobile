// Outbox flush semantics: permanent 4xx drops a poisoned op instead of
// blocking the queue; transient failures halt and retry later.
jest.mock('../../api/client', () => ({ api: { post: jest.fn(), delete: jest.fn() } }));
jest.mock('../../storage/accountStorage', () => {
  const mem = new Map<string, string>();
  return { accountStorage: { getItem: async (k: string) => mem.get(k) ?? null, setItem: async (k: string, v: string) => { mem.set(k, v); }, _mem: mem } };
});
jest.mock('../../storage/session', () => ({
  accountKey: (k: string) => `u1:${k}`,
  getSession: () => ({ user: { id: 'u1' }, token: 't' }),
}));
import { api } from '../../api/client';
import { accountStorage } from '../../storage/accountStorage';
import { queueMeal, flushMeals } from '../mealSync';
import type { LoggedMeal } from '../../storage/meals';

const meal = (id: string): LoggedMeal => ({
  id, name: id, calories: 100, quantityG: 100, createdAt: '2026-11-03T12:00:00Z',
  macros: { protein_g: 10, carbs_g: 10, fat_g: 5 },
});
const OUTBOX = 'u1:fitness.mealOutbox.v1';
const ops = async () => JSON.parse((await accountStorage.getItem(OUTBOX)) || '[]');

beforeEach(async () => { jest.clearAllMocks(); await accountStorage.setItem(OUTBOX, '[]'); });

test('successful flush empties the outbox', async () => {
  (api.post as jest.Mock).mockResolvedValue({});
  await queueMeal(meal('m1'));
  await flushMeals();
  expect(api.post).toHaveBeenCalledWith('/food-logs', expect.objectContaining({ id: 'm1' }));
  expect(await ops()).toEqual([]);
});

test('a permanently rejected meal is dropped and later ops still sync', async () => {
  (api.post as jest.Mock)
    .mockRejectedValueOnce({ response: { status: 400 } })
    .mockResolvedValueOnce({});
  await queueMeal(meal('bad'));
  await queueMeal(meal('good'));
  await flushMeals();
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(await ops()).toEqual([]);
});

test('a transient failure halts the flush and keeps all remaining ops', async () => {
  (api.post as jest.Mock).mockRejectedValueOnce(new Error('ECONNRESET'));
  await queueMeal(meal('m1'));
  await queueMeal(meal('m2'));
  await expect(flushMeals()).rejects.toThrow('temporarily unavailable');
  expect((await ops()).length).toBe(2);
});

test('429/408 are treated as transient, not dropped', async () => {
  (api.post as jest.Mock).mockRejectedValueOnce({ response: { status: 429 } });
  await queueMeal(meal('m1'));
  await expect(flushMeals()).rejects.toThrow();
  expect((await ops()).length).toBe(1);
});
