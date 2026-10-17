const mockStore = new Map<string, string>();
let mockUser = 'alice';
jest.mock('../accountStorage', () => ({ accountStorage: { getItem: async (key: string) => mockStore.get(key) || null, setItem: async (key: string, value: string) => { mockStore.set(key, value); } } }));
jest.mock('../session', () => ({ accountKey: (key: string) => `${mockUser}:${key}`, getSession: () => ({ user: { id: mockUser } }) }));
import { loadFavorites, setFavorite } from '../favoriteFoods';
import { LoggedMeal } from '../meals';
const meal: LoggedMeal = { id: 'meal', name: 'Recipe soup', createdAt: new Date().toISOString(), calories: 200, macros: { protein_g: 8, carbs_g: 20, fat_g: 3 }, photoUri: 'file:///private.jpg', source: 'recipe', feedback: '' };
beforeEach(() => { mockStore.clear(); mockUser = 'alice'; });
it('persists reusable nutrition without photos and serializes repeated favorite taps', async () => {
  await Promise.all([setFavorite(meal, true), setFavorite(meal, true)]);
  expect(await loadFavorites()).toEqual([{ ...meal, photoUri: undefined }]);
  expect(JSON.stringify(await loadFavorites())).not.toContain('private.jpg');
  await setFavorite(meal, false); expect(await loadFavorites()).toEqual([]);
});
it('isolates favorites between accounts', async () => {
  await setFavorite(meal, true); mockUser = 'bob'; expect(await loadFavorites()).toEqual([]);
  mockUser = 'alice'; expect(await loadFavorites()).toHaveLength(1);
});
