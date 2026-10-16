jest.mock('../LegacyMigrationGate', () => ({ __esModule: true, default: () => null }));
jest.mock('../../services/accountLifecycle', () => ({ removeAccount: jest.fn(), shareAccountExport: jest.fn() }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const { Button, TextInput, Alert } = require('react-native');
const AccountPrivacy = require('../AccountPrivacy').default;
const { removeAccount, shareAccountExport } = require('../../services/accountLifecycle');
let tree;
const button = title => tree.root.findAllByType(Button).find(b => b.props.title === title);
async function press(title) { await act(async () => { await button(title).props.onPress(); }); }
beforeEach(async () => { jest.clearAllMocks(); await act(async () => { tree = create(<AccountPrivacy />); }); await press('Account privacy: export or delete'); });
afterEach(async () => { await act(async () => tree.unmount()); });
it('requires password, exact typed confirmation and destructive alert confirmation', async () => {
  expect(button('Delete my account').props.disabled).toBe(true);
  await act(async () => { tree.root.findAllByType(TextInput)[0].props.onChangeText('password'); tree.root.findAllByType(TextInput)[1].props.onChangeText('DELETE'); });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await press('Delete my account'); expect(removeAccount).not.toHaveBeenCalled();
  const choices = alert.mock.calls[0][2]; expect(choices[0].style).toBe('cancel');
  await act(async () => { await choices[1].onPress(); }); expect(removeAccount).toHaveBeenCalledWith('password', 'DELETE'); alert.mockRestore();
});
it('reports export errors and clears the reauthentication password', async () => {
  await act(async () => tree.root.findAllByType(TextInput)[0].props.onChangeText('wrong'));
  shareAccountExport.mockRejectedValueOnce({ response: { data: { error: 'Current password is incorrect.' } } });
  await press('Export my data'); expect(JSON.stringify(tree.toJSON())).toContain('Current password is incorrect');
  expect(tree.root.findAllByType(TextInput)[0].props.value).toBe('');
});
