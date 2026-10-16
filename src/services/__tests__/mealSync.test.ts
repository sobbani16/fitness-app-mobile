const mockStore = new Map<string, string>();
let mockUser = 'alice';
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true, default: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) || null),
    setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
  },
}));
jest.mock('../../storage/session', () => ({
  accountKey: (key: string) => `${mockUser}:${key}`,
  getSession: () => ({ user: { id: mockUser } }),
}));
jest.mock('../../api/client', () => ({ api: { post: jest.fn(), delete: jest.fn(), get: jest.fn() } }));
import { api } from '../../api/client';
import { queueMeal, flushMeals, saveMealChange, reconcileMealsFor, reconcileMealDays } from '../mealSync';
import { loadHistory, todayKey } from '../../storage/meals';
const meal = { id: 'meal-1', createdAt: '2026-10-09T12:00:00Z', name: 'Apple', calories: 52, macros: { protein_g: 0, carbs_g: 14, fat_g: 0, fiber_g: 2 }, feedback: '', source: 'manual' };
beforeEach(() => { mockStore.clear(); mockUser = 'alice'; jest.clearAllMocks(); });
it('retains failed writes and retries with the same identity and fiber', async () => {
  (api.post as jest.Mock).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({});
  await queueMeal(meal);
  await expect(flushMeals()).rejects.toThrow('offline');
  await flushMeals();
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(api.post).toHaveBeenLastCalledWith('/food-logs', expect.objectContaining({ id: meal.id, fiberG: 2, loggedAt: meal.createdAt }));
  await flushMeals();
  expect(api.post).toHaveBeenCalledTimes(2);
});
it('coalesces an unsent addition followed by deletion', async () => {
  await queueMeal(meal); await queueMeal(meal.id); await flushMeals();
  expect(api.post).not.toHaveBeenCalled();
  expect(api.delete).toHaveBeenCalledWith('/food-logs/meal-1');
});
it('isolates pending meals by account', async () => {
  await queueMeal(meal); mockUser = 'bob'; await flushMeals();
  expect(api.post).not.toHaveBeenCalled();
  mockUser = 'alice'; await flushMeals();
  expect(api.post).toHaveBeenCalledTimes(1);
});

it('loads server meals and reconciles remote deletions after local writes are flushed', async () => {
  const date = new Date('2026-10-09T12:00:00Z');
  await saveMealChange(meal);
  (api.get as jest.Mock).mockResolvedValue({ data: { logs: [{
    id: 'remote-2', loggedAt: date.toISOString(), foodName: 'Rice', calories: 130,
    proteinG: 3, carbsG: 28, fatG: 0, fiberG: 1, quantityG: 100, mealType: 'lunch',
  }] } });
  const result = await reconcileMealsFor(date);
  expect(api.post).toHaveBeenCalledWith('/food-logs', expect.objectContaining({ id: meal.id }));
  expect(result.map(m => m.id)).toEqual(['remote-2']);
  expect(result[0].macros.fiber_g).toBe(1);
  expect(JSON.parse(mockStore.get(todayKey(date))!)).toEqual(result);
});
it('keeps cached meals when server refresh fails', async () => {
  const date = new Date(meal.createdAt);
  await saveMealChange(meal);
  (api.get as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await expect(reconcileMealsFor(date)).rejects.toThrow('offline');
  expect(JSON.parse(mockStore.get(todayKey(date))!)[0].id).toBe(meal.id);
});
it('filters UTC API results to the requested local calendar day', async () => {
  const date = new Date(2026, 9, 9, 12);
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const row = { id: 'inside', loggedAt: date.toISOString(), foodName: 'Rice', calories: 130, proteinG: 3, carbsG: 28, fatG: 0, fiberG: 1, quantityG: 100, mealType: 'lunch' };
  (api.get as jest.Mock).mockResolvedValue({ data: { logs: [row, { ...row, id: 'yesterday', loggedAt: new Date(start.getTime() - 1).toISOString() }] } });
  expect((await reconcileMealsFor(date)).map(m => m.id)).toEqual(['inside']);
});
it('does not write a response into another account after switching accounts', async () => {
  (api.get as jest.Mock).mockImplementation(async () => { mockUser = 'bob'; return { data: { logs: [] } }; });
  await expect(reconcileMealsFor()).rejects.toThrow('Account changed');
  expect(mockStore.size).toBe(0);
});

const serverRow = (id: string, date: Date) => ({ id, loggedAt: date.toISOString(), foodName: 'Rice', calories: 130, proteinG: 3, carbsG: 28, fatG: 0, fiberG: 1, quantityG: 100, mealType: 'lunch' });
it('recovers older history with empty reinstall storage and repeats without duplicates', async () => {
  const dates = [new Date(2026, 2, 7, 12), new Date(2026, 2, 8, 12), new Date(2026, 2, 9, 12)];
  const rows = dates.map((date, i) => serverRow(`old-${i}`, date));
  (api.get as jest.Mock).mockImplementation(async (_url, { params }) => ({ data: { logs: rows.filter(row => row.loggedAt.startsWith(params.date)) } }));
  await reconcileMealDays(dates);
  expect(await loadHistory(3, dates[2])).toEqual(dates.map((_, i) => ({ date: `2026-03-0${7+i}`, caloriesIn: 130, mealCount: 1 })));
  const requested = (api.get as jest.Mock).mock.calls.map(call => call[1].params.date);
  expect(new Set(requested).size).toBe(requested.length);
  await reconcileMealDays(dates);
  expect((await loadHistory(3, dates[2])).map(day => day.mealCount)).toEqual([1, 1, 1]);
  mockStore.clear(); // reinstall: same server records and authenticated account
  await reconcileMealDays(dates);
  expect((await loadHistory(3, dates[2])).map(day => day.caloriesIn)).toEqual([130, 130, 130]);
});
it('does not replace any older cache when one day fails and retains offline outbox', async () => {
  const date = new Date(meal.createdAt);
  await saveMealChange(meal);
  (api.post as jest.Mock).mockRejectedValueOnce(new Error('offline upload'));
  await expect(reconcileMealDays([date])).rejects.toThrow('offline upload');
  expect(JSON.parse(mockStore.get('alice:fitness.mealOutbox.v1')!)).toHaveLength(1);
  (api.post as jest.Mock).mockResolvedValue({});
  const later = new Date(date); later.setDate(later.getDate() + 7);
  (api.get as jest.Mock).mockImplementation(async (_url, { params }) => {
    if (params.date === later.toISOString().slice(0, 10)) throw new Error('partial failure');
    return { data: { logs: [] } };
  });
  await expect(reconcileMealDays([date, later])).rejects.toThrow('partial failure');
  expect(JSON.parse(mockStore.get(todayKey(date))!)[0].id).toBe(meal.id);
});
it('refreshes remote deletion while retaining unuploaded legacy history', async () => {
  const date = new Date(meal.createdAt);
  mockStore.set(todayKey(date), JSON.stringify([meal, { ...meal, id: 'legacy', source: 'legacy-local' }]));
  (api.get as jest.Mock).mockResolvedValue({ data: { logs: [] } });
  expect((await reconcileMealDays([date]))[0].map(row => row.id)).toEqual(['legacy']);
});
it('isolates history on a second account and rejects account switching during multi-day fetch', async () => {
  const dates = Array.from({ length: 8 }, (_, i) => new Date(2026, 2, i + 1, 12));
  (api.get as jest.Mock).mockImplementation(async () => { mockUser = 'bob'; return { data: { logs: [] } }; });
  await expect(reconcileMealDays(dates)).rejects.toThrow('Account changed');
  expect(mockStore.size).toBe(0);
  expect(api.get).toHaveBeenCalledTimes(4);
});
it('handles local midnight boundaries on daylight-saving transitions', async () => {
  for (const date of [new Date(2026, 2, 8, 12), new Date(2026, 10, 1, 12)]) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    (api.get as jest.Mock).mockResolvedValue({ data: { logs: [serverRow('start', start), serverRow('last', new Date(+end - 1)), serverRow('outside', end)] } });
    expect((await reconcileMealDays([date]))[0].map(row => row.id)).toEqual(['start', 'last']);
  }
});
