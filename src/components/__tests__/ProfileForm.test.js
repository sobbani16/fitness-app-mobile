jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../KeyboardAwareScrollView', () => ({ children }) => children);
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn(), reverseGeocodeAsync: jest.fn(), Accuracy: { Low: 1 } }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const { TextInput, Text } = require('react-native');
const { Action } = require('../../design/components');
const Form = require('../ProfileForm').default;
const Location = require('expo-location');
const profile = { name: 'Alex', age: 30, sex: 'female', heightCm: 173.2, weightKg: 73.37, goalWeightKg: 70, units: 'metric', activityLevel: 'moderate', goal: 'maintain' };
let tree, submit;
const button = label => tree.root.findAllByType(Action).find(n => n.props.label === label);
const field = label => tree.root.findAllByType(TextInput).find(n => n.props.accessibilityLabel === label);
const output = () => tree.root.findAllByType(Text).map(n => n.props.children).flat(Infinity).join(' ');
beforeEach(() => { jest.clearAllMocks(); submit = jest.fn(async () => {}); });
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
it('does not request location on mount or invent age or measurements', async () => {
  await act(async () => { tree = create(<Form onSubmit={submit} />); });
  expect(field('Age (years)').props.value).toBe('');
  expect(field('Current weight (kg)').props.value).toBe('');
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  await act(async () => button('Save changes').props.onPress());
  expect(submit).not.toHaveBeenCalled();
});
it('preserves canonical measurements exactly through repeated unit switches', async () => {
  await act(async () => { tree = create(<Form initial={profile} onSubmit={submit} />); });
  for (let i = 0; i < 3; i++) { await act(async () => button('lb / inches').props.onPress()); await act(async () => button('kg / cm').props.onPress()); }
  await act(async () => button('Save changes').props.onPress());
  expect(submit).toHaveBeenCalledWith(profile);
});
it('rejects malformed optional target and fractional age, retains input on server failure', async () => {
  await act(async () => { tree = create(<Form initial={profile} onSubmit={submit} />); });
  await act(async () => field('Goal weight (kg, optional)').props.onChangeText('abc'));
  await act(async () => button('Save changes').props.onPress());
  expect(submit).not.toHaveBeenCalled();
  await act(async () => { field('Goal weight (kg, optional)').props.onChangeText(''); field('Age (years)').props.onChangeText('30.5'); });
  await act(async () => button('Save changes').props.onPress()); expect(submit).not.toHaveBeenCalled();
  await act(async () => field('Age (years)').props.onChangeText('30'));
  submit.mockRejectedValueOnce(new Error('offline'));
  await act(async () => button('Save changes').props.onPress());
  expect(output()).toContain('offline'); expect(field('Name').props.value).toBe('Alex');
});
it('guards rapid submit taps before React renders the saving state', async () => {
  let resolve;
  submit.mockImplementation(() => new Promise(r => { resolve = r; }));
  await act(async () => { tree = create(<Form initial={profile} onSubmit={submit} />); });
  await act(async () => { button('Save changes').props.onPress(); button('Save changes').props.onPress(); });
  expect(submit).toHaveBeenCalledTimes(1);
  await act(async () => resolve());
});
