jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
const mockAddWater = jest.fn(async delta => ({ waterMl: Math.max(0, 250 + delta), supplements: {} }));
jest.mock('../../hooks/useDailyStats', () => ({
  useDailyStats: () => ({ stats: { waterMl: 250, supplements: {} }, loading: false, waterSyncError: null, addWater: mockAddWater, retryWaterSync: jest.fn(), refresh: jest.fn() }),
}));
const mockMealAdd = jest.fn(async () => {});
const mockMealRemove = jest.fn(async () => {});
jest.mock('../../context/MealsContext', () => ({ useMeals: () => ({ meals: [], add: mockMealAdd, remove: mockMealRemove }) }));
const mockProfileUpdate = jest.fn(async () => {});
jest.mock('../../context/ProfileContext', () => ({ useProfile: () => ({ profile: { weightKg: 70, units: 'metric' }, update: mockProfileUpdate }) }));
jest.mock('../../storage/favoriteFoods', () => ({ loadFavorites: jest.fn(async () => []), loadRecentFoods: jest.fn(async () => []) }));
const mockLogWeight = jest.fn(async () => ({}));
jest.mock('../../api/weight', () => ({ logWeight: mockLogWeight }));
jest.mock('../../context/FeatureFlagsContext', () => ({ useFeatureFlags: () => ({ isEnabled: () => true, isLoading: false, refresh: jest.fn() }) }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const QuickAdd = require('../QuickAdd').default;
const { Modal, Platform, TextInput, Text } = require('react-native');
const favorites = require('../../storage/favoriteFoods');
let tree;
afterEach(async () => { if (tree) await act(async () => tree.unmount()); jest.clearAllMocks(); });
const press = label => tree.root.findAllByProps({ accessibilityLabel: label })[0].props.onPress();
const open = async () => { await act(async () => press('Add')); };
const trustedMeal = {
  id: 'm-1', createdAt: '2024-01-01T08:00:00.000Z', name: 'Oats', calories: 300,
  macros: { protein_g: 10, carbs_g: 50, fat_g: 6 }, mealType: 'breakfast',
  quantityG: 80, ingredientId: 'ing-1', source: 'ingredient: usda',
  nutritionSnapshot: { verificationLevel: 'SOURCE_BACKED_FULL' }, photoUri: 'file:///private.jpg',
};
it.each([
  ['Scan nutrition label', 'LabelScanner', {}], ['Search food', 'FoodEntry', { mode: 'search' }], ['Log a meal', 'LogMeal', undefined],
  ['Log exercise', 'LogExercise', undefined], ['Update weight', 'EditProfile', undefined],
  ['Log water', 'Dashboard', expect.objectContaining({ waterRequest: expect.any(Number) })],
])('routes %s to the existing destination', async (label, route, params) => {
  await act(async () => { tree = create(<QuickAdd />); });
  await open();
  await act(async () => press(label));
  expect(mockNavigate).not.toHaveBeenCalled();
  await act(async () => tree.root.findByType(Modal).props.onDismiss());
  expect(mockNavigate).toHaveBeenCalledWith(route, params);
});

it('closes with system Back without navigating and submits a destination only once', async () => {
  await act(async () => { tree = create(<QuickAdd />); });
  await open();
  await act(async () => tree.root.findByType(Modal).props.onRequestClose());
  await act(async () => tree.root.findByType(Modal).props.onDismiss());
  expect(mockNavigate).not.toHaveBeenCalled();
  await open();
  await act(async () => { press('Search food'); press('Search food'); });
  await act(async () => { tree.root.findByType(Modal).props.onDismiss(); tree.root.findByType(Modal).props.onDismiss(); });
  expect(mockNavigate).toHaveBeenCalledTimes(1);
});

it('navigates after the Android modal commit without relying on iOS onDismiss', async () => {
  const original = Platform.OS;
  Platform.OS = 'android';
  jest.useFakeTimers();
  try {
    await act(async () => { tree = create(<QuickAdd />); });
    await open();
    await act(async () => press('Search food'));
    expect(tree.root.findByType(Modal).props.visible).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
    await act(async () => jest.runOnlyPendingTimers());
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  } finally { Platform.OS = original; jest.useRealTimers(); }
});

it('logs one glass of water per submission and offers undo', async () => {
  await act(async () => { tree = create(<QuickAdd />); });
  await open();
  await act(async () => { press('+250 ml water'); press('+250 ml water'); });
  expect(mockAddWater).toHaveBeenCalledTimes(1);
  expect(mockAddWater).toHaveBeenCalledWith(250);
  await act(async () => press('Undo'));
  expect(mockAddWater).toHaveBeenLastCalledWith(-250);
});

it('repeats a trusted meal with a fresh id and no photo, and undoes it', async () => {
  favorites.loadFavorites.mockResolvedValue([trustedMeal]);
  favorites.loadRecentFoods.mockResolvedValue([]);
  await act(async () => { tree = create(<QuickAdd />); });
  await open();
  await act(async () => press('Oats · 300 kcal'));
  expect(mockMealAdd).toHaveBeenCalledTimes(1);
  const copy = mockMealAdd.mock.calls[0][0];
  expect(copy).toMatchObject({ name: 'Oats', calories: 300, quantityG: 80 });
  expect(copy.id).not.toBe(trustedMeal.id);
  expect(copy.photoUri).toBeUndefined();
  await act(async () => press('Undo'));
  expect(mockMealRemove).toHaveBeenCalledWith(copy.id);
});

it('reopens review for an untrusted repeat instead of logging it', async () => {
  favorites.loadFavorites.mockResolvedValue([]);
  favorites.loadRecentFoods.mockResolvedValue([{ ...trustedMeal, id: 'm-2', name: 'Stir fry', source: 'Manual entry', ingredientId: undefined, nutritionSnapshot: undefined }]);
  await act(async () => { tree = create(<QuickAdd />); });
  await open();
  await act(async () => press('Stir fry · 300 kcal'));
  expect(mockMealAdd).not.toHaveBeenCalled();
  await act(async () => tree.root.findByType(Modal).props.onDismiss());
  expect(mockNavigate).toHaveBeenCalledWith('FoodEntry', expect.objectContaining({ meal: expect.objectContaining({ name: 'Stir fry' }) }));
});

it('saves a changed weight through the profile and an unchanged weight as a measurement', async () => {
  await act(async () => { tree = create(<QuickAdd />); });
  await open();
  await act(async () => tree.root.findAllByProps({ accessibilityLabel: 'Weight (kg)' })[0].props.onChangeText('71'));
  await act(async () => press('Save weight'));
  expect(mockProfileUpdate).toHaveBeenCalledWith({ weightKg: 71 });
  expect(mockLogWeight).not.toHaveBeenCalled();
  await act(async () => tree.root.findAllByProps({ accessibilityLabel: 'Weight (kg)' })[0].props.onChangeText('70'));
  await act(async () => press('Save weight'));
  expect(mockLogWeight).toHaveBeenCalledWith(70);
});

it('rejects invalid weight input without a save', async () => {
  await act(async () => { tree = create(<QuickAdd />); });
  await open();
  await act(async () => tree.root.findAllByProps({ accessibilityLabel: 'Weight (kg)' })[0].props.onChangeText('abc'));
  await act(async () => press('Save weight'));
  expect(mockProfileUpdate).not.toHaveBeenCalled();
  expect(mockLogWeight).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(Text).some(n => String(n.props.children).includes('Enter your weight'))).toBe(true);
});

it('keeps a parsed command available and reports an asynchronous save failure', async () => {
  mockAddWater.mockRejectedValueOnce(new Error('disk full'));
  await act(async () => { tree = create(<QuickAdd />); });
  await open();
  await act(async () => tree.root.findAllByProps({ accessibilityLabel: 'Say or type it' })[0].props.onChangeText('water 500 ml'));
  await act(async () => press('Log it'));
  expect(tree.root.findAllByProps({ accessibilityLabel: 'Say or type it' })[0].props.value).toBe('water 500 ml');
  expect(tree.root.findAllByType(Text).some(n => String(n.props.children).includes('Could not save.'))).toBe(true);
});
