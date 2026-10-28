const mockCards = { note: true, water: true, steps: true, meals: true };
jest.mock('../../context/DisplayPreferencesContext', () => ({ useDisplayPreferences: () => ({ cards: mockCards }) }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }), useRoute: () => ({ params: {} }), useFocusEffect: callback => require('react').useEffect(callback, [callback]) }));
const mockDiary = { meals: [], loading: false, refresh: jest.fn(), syncAll: jest.fn(), syncError: null };
jest.mock('../../context/MealsContext', () => ({ useMeals: () => mockDiary }));
jest.mock('../../context/ProfileContext', () => ({ useProfile: () => ({ profile: { name: 'Sam', units: 'metric', weightKg: 70 } }) }));
const mockDaily = { stats: { waterMl: 500 }, loading: false, addWater: jest.fn(), refresh: jest.fn(), retryWaterSync: jest.fn(), waterSyncError: null };
jest.mock('../../hooks/useDailyStats', () => ({ useDailyStats: () => mockDaily }));
jest.mock('../../api/macroScore', () => ({ getMacroGoals: jest.fn() }));
jest.mock('../../api/dailyStats', () => ({ syncSteps: jest.fn() }));
jest.mock('../../hooks/useStepCounter', () => ({ useStepCounter: jest.fn(() => ({ steps: 20, available: true })) }));
jest.mock('../../components/today/OptionalDetails', () => ({ WeatherDetail: () => null, SupplementsDetail: () => null }));
jest.mock('../../config/betaFeatures', () => ({ betaFeatures: { ai: false, weeklyPlans: false, supplements: false } }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const { Text } = require('react-native');
const { getMacroGoals } = require('../../api/macroScore');
const { useStepCounter } = require('../../hooks/useStepCounter');
const Screen = require('../DashboardScreen').default;
let tree;
const output = () => tree.root.findAllByType(Text).map(node => node.props.children).flat().join(' ');
const press = label => tree.root.findAllByProps({ accessibilityLabel: label })[0].props.onPress();
beforeEach(() => {
  jest.clearAllMocks();
  mockDiary.meals = [{ id: 'meal', name: 'Saved lunch', createdAt: new Date().toISOString(), calories: 450, macros: { protein_g: 20, carbs_g: 40, fat_g: 15 } }];
  mockDiary.syncError = null;
  mockDaily.addWater.mockResolvedValue();
  getMacroGoals.mockResolvedValue({ caloriesTarget: 2000, proteinTarget: 90, carbsTarget: 250, fatTarget: 70, fiberTarget: 30, waterMlTarget: 2100 });
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
it('keeps cached meals and logging available when targets fail, without claiming deficit', async () => {
  getMacroGoals.mockRejectedValue(new Error('offline'));
  mockDiary.syncError = 'pending';
  await act(async () => { tree = create(<Screen />); });
  expect(output()).toContain('Saved lunch');
  expect(output()).toContain('Targets couldn’t load');
  expect(output()).toContain('Incomplete data');
  expect(output()).not.toMatch(/need to burn|only eaten|under target/);
  await act(async () => press('Log a meal'));
  expect(mockNavigate).toHaveBeenCalledWith('LogMeal');
  getMacroGoals.mockResolvedValue({ caloriesTarget: 2200 });
  await act(async () => press('Retry targets'));
  expect(output()).toContain('2,200');
});
it('connects steps automatically on load without refetching targets', async () => {
  await act(async () => { tree = create(<Screen />); });
  expect(useStepCounter).toHaveBeenCalled();
  expect(getMacroGoals).toHaveBeenCalledTimes(1);
  expect(output()).not.toContain('Ask Leo');
});
it('blocks repeated water taps while saving, and reports storage errors', async () => {
  let reject;
  mockDaily.addWater.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
  await act(async () => { tree = create(<Screen />); });
  await act(async () => press('Log water'));
  const add = tree.root.findAllByProps({ accessibilityLabel: 'Add 250 ml water' })[0].props.onPress;
  await act(async () => { add(); add(); });
  expect(mockDaily.addWater).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('disk full')));
  expect(output()).toContain('Could not save water');
});
it('empty diary offers an action without describing actual intake', async () => {
  mockDiary.meals = [];
  await act(async () => { tree = create(<Screen />); });
  expect(output()).toContain('No meals logged yet');
  expect(output()).toContain('Missing logs don’t mean');
});

it('hides optional cards while retaining essential logging', async () => {
  Object.keys(mockCards).forEach(key => { mockCards[key] = false; });
  try {
    await act(async () => { tree = create(<Screen />); });
    expect(output()).not.toContain('A note for today');
    expect(output()).not.toContain('Your meals');
    expect(output()).not.toContain('Connect steps');
    expect(useStepCounter).not.toHaveBeenCalled();
    await act(async () => press('Log a meal'));
    expect(mockNavigate).toHaveBeenCalledWith('LogMeal');
  } finally { Object.keys(mockCards).forEach(key => { mockCards[key] = true; }); }
});
