jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: callback => require('react').useEffect(callback, [callback]) }));
jest.mock('../../storage/session', () => ({ getSession: () => ({ user: { id: 'alice' } }) }));
jest.mock('../../api/healthScore', () => ({ getHealthScore: jest.fn(), getHealthTrend: jest.fn(async () => []), getActions: jest.fn() }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const { Text } = require('react-native');
const api = require('../../api/healthScore');
const Screen = require('../HealthScoreDetailScreen').default;
it('explains provisional data, does not render invalid scores or unreviewed advice', async () => {
  api.getHealthScore.mockResolvedValue({ score: -50, components: {}, insights: [{ message: 'Burn off your meal' }], allContributors: [{ reason: 'Forbidden food' }] });
  let tree; await act(async () => { tree = create(<Screen />); });
  const text = tree.root.findAllByType(Text).map(n => n.props.children).flat(Infinity).join(' ');
  expect(text).toContain('Data completeness is unknown'); expect(text).toContain('outside the supported range');
  expect(text).not.toContain('-50'); expect(text).not.toContain('Burn off your meal'); expect(text).not.toContain('Forbidden food');
  expect(api.getActions).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
});
