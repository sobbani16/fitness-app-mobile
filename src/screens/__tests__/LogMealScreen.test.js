// These tests exercise the explicitly enabled AI entry flow, independent of the export environment.
jest.mock('../../config/betaFeatures', () => ({ betaFeatures: { ai: true, weeklyPlans: true, supplements: true } }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: jest.fn(), useRoute: () => ({ params: {} }), useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../../storage/session', () => ({ getSession: () => ({ user: { id: 'alice' } }) }));
const mockAdd = jest.fn();
jest.mock('../../context/MealsContext', () => ({ useMeals: () => ({ meals: [], totalCalories: 0, add: mockAdd, remove: jest.fn() }) }));
jest.mock('../../hooks/useScale', () => ({ useScale: () => ({ reset: jest.fn() }) }));
jest.mock('../../components/ScaleConnectCard', () => () => null);
jest.mock('../../components/RecipeSearch', () => () => null);
jest.mock('../../components/RecipeByIngredients', () => () => null);
jest.mock('../../components/IngredientSearch', () => () => null);
jest.mock('../../components/KeyboardAwareScrollView', () => ({ children }) => children);
jest.mock('../../api/meals', () => ({ detectFood: jest.fn(), analyzeMeal: jest.fn() }));
jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn(), requestMediaLibraryPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn(), MediaTypeOptions: { Images: 'Images' } }));
const React = require('react');
const { act, create } = require('react-test-renderer');
const { Button, Text, Alert } = require('react-native');
const picker = require('expo-image-picker');
const { detectFood, analyzeMeal } = require('../../api/meals');
const Screen = require('../FoodEntryScreen').default;
let tree;
const button = title => tree.root.findAllByType(Button).find(node => node.props.title === title);
const pressText = label => {
  let node = tree.root.findAllByType(Text).find(node => node.props.children === label);
  while (node && !node.props.onPress) node = node.parent;
  return node.props.onPress();
};
const text = () => tree.root.findAllByType(Text).map(node => node.props.children).flat().join(' ');
beforeEach(() => {
  jest.clearAllMocks(); mockAdd.mockResolvedValue(undefined); jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
  picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
  picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///photo.jpg', base64: 'anBlZw==' }] });
  picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///library.jpg', base64: 'anBlZw==' }] });
  analyzeMeal.mockImplementation((...args) => detectFood(...args));
  detectFood.mockResolvedValue({ foodName: 'Rice', suggestedPortionGrams: 200, estimatedCalories: 260, caloriesPer100g: 130, macrosPer100g: { protein_g: 3, carbs_g: 28, fat_g: 1 }, source: 'AI estimate', needsReview: true, lowConfidence: true, uncertainty: 'Oil and portion are unclear.' });
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); jest.restoreAllMocks(); });
it.each(['Take photo', 'Pick from library'])('uploads %s bytes and requires review before explicit save', async label => {
  await act(async () => { tree = create(<Screen />); });
  await act(async () => pressText(label));
  await act(async () => button('Detect food').props.onPress());
  expect(detectFood).toHaveBeenCalledWith(expect.objectContaining({ hasPhoto: true, imageDataUrl: 'data:image/jpeg;base64,anBlZw==' }));
  expect(text()).toContain('Uncertain estimate'); expect(text()).toContain('Oil and portion are unclear.');
  expect(button('Save meal').props.disabled).toBe(true); expect(mockAdd).not.toHaveBeenCalled();
  await act(async () => button('I reviewed the food, portion and nutrition').props.onPress());
  await act(async () => button('Save meal').props.onPress());
  expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rice', calories: 260, quantityG: 200 }));
  await act(async () => button('Analyze description').props.onPress());
  expect(analyzeMeal).toHaveBeenLastCalledWith(expect.objectContaining({ hasPhoto: false, imageDataUrl: undefined }));
});
it('displays quota failure without leaving a saveable stale estimate', async () => {
  await act(async () => { tree = create(<Screen />); });
  await act(async () => button('Analyze description').props.onPress());
  detectFood.mockRejectedValueOnce({ response: { status: 429, data: { error: 'Daily food analysis budget reached' } } });
  await act(async () => button('Analyze description').props.onPress());
  expect(text()).toContain('Daily food analysis budget reached'); expect(button('Save meal')).toBeUndefined();
});
it('ignores recognition completed after the photo was removed', async () => {
  let finish;
  detectFood.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { tree = create(<Screen />); });
  await act(async () => pressText('Take photo'));
  await act(async () => { button('Detect food').props.onPress(); });
  await act(async () => pressText('Remove'));
  await act(async () => finish({ foodName: 'Stale' }));
  expect(button('Save meal')).toBeUndefined(); expect(text()).not.toContain('Stale');
});
it('handles denied camera permission without uploading', async () => {
  picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
  await act(async () => { tree = create(<Screen />); });
  await act(async () => pressText('Take photo'));
  expect(text()).toContain('Photo permission is required'); expect(picker.launchCameraAsync).not.toHaveBeenCalled(); expect(detectFood).not.toHaveBeenCalled();
});
it('analyzes a text-only meal, exposes portion assumptions and recalculates edited portions before save', async () => {
  const { TextInput } = require('react-native');
  await act(async () => { tree = create(<Screen />); });
  const description = tree.root.findAllByType(TextInput).find(node => node.props.placeholder?.startsWith('e.g. 150g'));
  await act(async () => description.props.onChangeText('200g cooked rice'));
  await act(async () => button('Analyze description').props.onPress());
  expect(analyzeMeal).toHaveBeenCalledWith(expect.objectContaining({ description: '200g cooked rice', hasPhoto: false, imageDataUrl: undefined }));
  expect(text()).toContain('Estimated nutrition');
  const portion = tree.root.findAllByType(TextInput).find(node => node.props.placeholder === 'e.g. 250');
  await act(async () => portion.props.onChangeText('100'));
  expect(button('Save meal').props.disabled).toBe(true);
  await act(async () => button('I reviewed the food, portion and nutrition').props.onPress());
  await act(async () => button('Save meal').props.onPress());
  expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ calories: 130, quantityG: 100, macros: { protein_g: 3, carbs_g: 28, fat_g: 1 } }));
});
it('allows manual logging without contacting the AI provider', async () => {
  await act(async () => { tree = create(<Screen />); });
  await act(async () => button('Enter nutrition manually').props.onPress());
  expect(button('Save meal').props.disabled).toBe(false);
  expect(detectFood).not.toHaveBeenCalled(); expect(analyzeMeal).not.toHaveBeenCalled();
});
it('does not silently save blank manual values as zero', async () => {
  await act(async () => { tree = create(<Screen />); });
  await act(async () => button('Enter nutrition manually').props.onPress());
  await act(async () => button('Save meal').props.onPress());
  expect(mockAdd).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Check nutrition', expect.any(String));
});
it('keeps a stable meal identity through a failed local save and concurrent taps', async () => {
  let reject;
  mockAdd.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
  await act(async () => { tree = create(<Screen />); });
  await act(async () => button('Analyze description').props.onPress());
  await act(async () => button('I reviewed the food, portion and nutrition').props.onPress());
  const save = button('Save meal').props.onPress;
  await act(async () => { save(); save(); });
  expect(mockAdd).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('disk')));
  await act(async () => button('Retry save').props.onPress());
  expect(mockAdd.mock.calls[0][0].id).toBe(mockAdd.mock.calls[1][0].id);
});
