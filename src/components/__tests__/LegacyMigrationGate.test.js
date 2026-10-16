jest.mock('../../services/legacyMigration', () => ({ legacyDeviceId: jest.fn(), finishLegacyUpgrade: jest.fn(), migrateLegacyAccount: jest.fn() }));
jest.mock('../../storage/session', () => ({ getSession: () => ({ user: { id: 'verified-target' } }) }));
const React = require('react');
const { act, create } = require('react-test-renderer');
const { Button, Text, TextInput } = require('react-native');
const Gate = require('../LegacyMigrationGate').default;
const service = require('../../services/legacyMigration');
let tree;
const button = title => tree.root.findAllByType(Button).find(b => b.props.title === title);
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
it('blocks onboarding until the owner chooses migration or explicitly skips', async () => {
  service.legacyDeviceId.mockResolvedValue('dev-old-install');
  await act(async () => { tree = create(<Gate><Text>Onboarding</Text></Gate>); });
  expect(JSON.stringify(tree.toJSON())).not.toContain('Onboarding');
  await act(async () => { button('Continue without migration').props.onPress(); });
  expect(JSON.stringify(tree.toJSON())).toContain('Onboarding');
  expect(service.migrateLegacyAccount).not.toHaveBeenCalled();
});
it('manual restoration is available without the old device and shows proof errors', async () => {
  service.legacyDeviceId.mockResolvedValue(null);
  service.migrateLegacyAccount.mockRejectedValueOnce({ response: { data: { error: 'Invalid migration code' } } });
  await act(async () => { tree = create(<Gate manual>{null}</Gate>); });
  await act(async () => { tree.root.findAllByType(TextInput)[0].props.onChangeText('code'); tree.root.findAllByType(TextInput)[1].props.onChangeText('password'); });
  await act(async () => { await button('Migrate approved account').props.onPress(); });
  expect(JSON.stringify(tree.toJSON())).toContain('Invalid migration code');
  expect(tree.root.findAllByType(TextInput)[1].props.value).toBe('');
});
