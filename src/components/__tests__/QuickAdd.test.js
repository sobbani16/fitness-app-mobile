jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const QuickAdd = require('../QuickAdd').default;
let tree;
afterEach(async () => { if (tree) await act(async () => tree.unmount()); jest.clearAllMocks(); });
it.each([
  ['Scan nutrition label', 'LabelScanner', {}], ['Search food', 'FoodEntry', { mode: 'search' }], ['Log a meal', 'LogMeal', undefined],
  ['Log exercise', 'LogExercise', undefined], ['Update weight', 'EditProfile', undefined],
  ['Log water', 'Dashboard', expect.objectContaining({ waterRequest: expect.any(Number) })],
])('routes %s to the existing destination', async (label, route, params) => {
  await act(async () => { tree = create(<QuickAdd />); });
  await act(async () => tree.root.findAllByProps({ accessibilityLabel: '＋ Add' })[0].props.onPress());
  await act(async () => tree.root.findAllByProps({ accessibilityLabel: label })[0].props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith(route, params);
});
