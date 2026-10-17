jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockNavigate = jest.fn();
const mockParams = { extracted: { productName: 'Oats', servingSizeG: 100, calories: 200, proteinG: 10, carbsG: 30, fatG: 4, fiberG: null, sugarG: 0 }, mealType: 'lunch' };
jest.mock('@react-navigation/native', () => ({ usePreventRemove: jest.fn(), useNavigation: () => ({ navigate: mockNavigate }), useRoute: () => ({ params: mockParams }) }));
jest.mock('../../components/KeyboardAwareScrollView', () => ({ children }) => children);
const mockAdd = jest.fn();
jest.mock('../../context/MealsContext', () => ({ useMeals: () => ({ add: mockAdd }) }));
jest.mock('../../storage/session', () => ({ getSession: () => ({ user: { id: 'alice' } }) }));
jest.mock('../../api/labelScanner', () => ({ saveLabelAndLog: jest.fn() }));
const { saveLabelAndLog } = require('../../api/labelScanner');
const React = require('react');
const { create, act } = require('react-test-renderer');
const Screen = require('../PortionAdjustScreen').default;
let tree;
const field = label => tree.root.findAllByProps({ accessibilityLabel: label })[0];
const press = label => field(label).props.onPress();
beforeEach(() => { jest.clearAllMocks(); mockAdd.mockResolvedValue(); saveLabelAndLog.mockResolvedValue({ foodLog: { id: 'server-id', foodName: 'Oats', quantityG: 150, calories: 300, proteinG: 15, carbsG: 45, fatG: 6, fiberG: null }, adjusted: {} }); });
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
async function ready() {
  await act(async () => { tree = create(<Screen />); });
  await act(async () => field('Your portion (g)').props.onChangeText('150'));
  await act(async () => press('I checked the label, units and portion'));
}
it('saves reviewed mass and missing fiber without inventing zero', async () => {
  await ready(); await act(async () => press('Save reviewed meal'));
  expect(saveLabelAndLog).toHaveBeenCalledWith(expect.objectContaining({ servingSizeG: 100, actualPortionG: 150, labelFiberG: null, labelSugarG: 0, id: expect.any(String) }));
  expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'server-id', calories: 300, macros: { protein_g: 15, carbs_g: 45, fat_g: 6 } }));
});
it('retries failed upstream delivery with the same id and blocks repeated taps', async () => {
  let reject;
  saveLabelAndLog.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
  await ready(); const save = field('Save reviewed meal').props.onPress;
  await act(async () => { save(); save(); });
  expect(saveLabelAndLog).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('network')));
  await act(async () => press('Retry save'));
  expect(saveLabelAndLog.mock.calls[0][0].id).toBe(saveLabelAndLog.mock.calls[1][0].id);
  expect(mockAdd).toHaveBeenCalledTimes(1);
});
it('does not create another server log when local saving needs retry', async () => {
  mockAdd.mockRejectedValueOnce(new Error('disk'));
  await ready(); await act(async () => press('Save reviewed meal'));
  await act(async () => press('Retry save'));
  expect(saveLabelAndLog).toHaveBeenCalledTimes(1);
  expect(mockAdd).toHaveBeenCalledTimes(2);
  expect(mockAdd.mock.calls[0][0].id).toBe(mockAdd.mock.calls[1][0].id);
});
it('requires another review after editing and rejects missing mass for volume', async () => {
  await ready();
  await act(async () => press('ml'));
  expect(field('Save reviewed meal').props.disabled).toBe(true);
  await act(async () => field('Your portion (ml)').props.onChangeText('150'));
  await act(async () => press('I checked the label, units and portion'));
  await act(async () => press('Save reviewed meal'));
  expect(saveLabelAndLog).not.toHaveBeenCalled();
});
it('allows corrections after a server validation rejection rather than locking invalid values', async () => {
  saveLabelAndLog.mockRejectedValueOnce({ response: { status: 400 } });
  await ready(); await act(async () => press('Save reviewed meal'));
  expect(field('Food name').props.value).toBe('Oats');
  expect(field('Save reviewed meal').props.disabled).toBe(true);
  expect(mockAdd).not.toHaveBeenCalled();
});
