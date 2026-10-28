jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockNavigate = jest.fn(), mockPermission = jest.fn();
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true, useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }), useRoute: () => ({ params: { mealType: 'lunch' } }) }));
jest.mock('expo-camera', () => ({ CameraView: () => null, useCameraPermissions: () => [{ granted: false, canAskAgain: false }, mockPermission] }));
jest.mock('../../components/KeyboardAwareScrollView', () => ({ children }) => children);
jest.mock('../../storage/session', () => ({ getSession: () => ({ user: { id: 'alice' } }) }));
jest.mock('../../api/labelScanner', () => ({ extractFromOcrText: jest.fn(), extractMergedLabel: jest.fn().mockResolvedValue(null), classifyDocument: jest.fn() }));
jest.mock('../../services/ocr', () => ({ recognizeLabel: jest.fn() }));
const { extractFromOcrText } = require('../../api/labelScanner');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { Text } = require('react-native');
const Screen = require('../LabelScannerScreen').default;
let tree;
const control = label => tree.root.findAllByProps({ accessibilityLabel: label })[0];
beforeEach(() => jest.clearAllMocks());
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
it('keeps manual review available when camera permission is permanently denied', async () => {
  await act(async () => { tree = create(<Screen />); });
  await act(async () => control('Enter nutrition manually').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('PortionAdjust', expect.objectContaining({ extracted: null, mealType: 'lunch' }));
  expect(mockPermission).not.toHaveBeenCalled();
});
it('keeps corrected text after extraction fails and retries without another photo', async () => {
  extractFromOcrText.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ calories: 200 });
  await act(async () => { tree = create(<Screen />); });
  await act(async () => control('Type label text').props.onPress());
  await act(async () => control('Label text — review and correct').props.onChangeText('Calories 200'));
  await act(async () => control('Extract nutrition for review').props.onPress());
  expect(control('Label text — review and correct').props.value).toBe('Calories 200');
  expect(tree.root.findAllByType(Text).map(node => node.props.children).flat().join(' ')).toContain('extraction is unavailable');
  await act(async () => control('Extract nutrition for review').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('PortionAdjust', expect.objectContaining({ ocrRawText: 'Calories 200', extracted: { calories: 200 } }));
});

it('keeps photo-panel text separate and extracts nutrition from only its panel', async () => {
  extractFromOcrText.mockResolvedValueOnce({ calories: 200 });
  await act(async () => { tree = create(<Screen />); });
  await act(async () => control('Type label text').props.onPress());
  await act(async () => control('Label text — review and correct').props.onChangeText('Calories 200'));
  await act(async () => control('Panel: claims').props.onPress());
  await act(async () => control('Type label text').props.onPress());
  await act(async () => control('Label text — review and correct').props.onChangeText('Sugar free'));
  await act(async () => control('Extract nutrition for review').props.onPress());
  expect(extractFromOcrText).toHaveBeenCalledWith('Calories 200');
  expect(mockNavigate).toHaveBeenCalledWith('PortionAdjust', expect.objectContaining({claimText:'Sugar free',ocrRawText:'Calories 200'}));
});
