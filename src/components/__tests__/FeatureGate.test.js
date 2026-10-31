jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const React = require('react');
const { create, act } = require('react-test-renderer');
const { FeatureGate, FeatureUnavailable, gateScreen } = require('../FeatureGate');
const { FeatureFlagsContext } = (() => { try { return require('../../context/FeatureFlagsContext'); } catch { return {}; } })();
const { DEFAULT_FLAGS, buildGateAllows } = require('../../config/featureKeys');
const { betaFeatures } = require('../../config/betaFeatures');
const { Notice } = require('../../design/components');
const { Text } = require('react-native');

// Build a flags context stub without mounting the real provider.
const flagsValue = (over = {}) => ({
  isEnabled: k => (over[k] ?? DEFAULT_FLAGS[k]) === true && buildGateAllows(k),
  isLoading: false,
  refresh: jest.fn(),
});

let mod;
jest.mock('../../context/FeatureFlagsContext', () => {
  const React = require('react');
  const Ctx = React.createContext(null);
  return { FeatureFlagsContext: Ctx, useFeatureFlags: () => React.useContext(Ctx) || { isEnabled: () => false, isLoading: false, refresh: jest.fn() } };
});

const withFlags = (ui, over) => {
  const { FeatureFlagsContext: Ctx } = require('../../context/FeatureFlagsContext');
  return <Ctx.Provider value={flagsValue(over)}>{ui}</Ctx.Provider>;
};

describe('DEFAULT_FLAGS', () => {
  it('fails closed for AI features and open for manual logging', () => {
    expect(DEFAULT_FLAGS.manualFoodLogging).toBe(true);
    expect(DEFAULT_FLAGS.manualExerciseLogging).toBe(true);
    for (const k of ['aiCoach', 'foodPhotoScanning', 'voiceFoodLogging', 'voiceExerciseLogging', 'aiWorkoutRecommendations']) expect(DEFAULT_FLAGS[k]).toBe(false);
    expect(DEFAULT_FLAGS.poseDetection).toBe(true); // on-device ML, not in AI group
  });
});

describe('build gate', () => {
  it('betaSafeMode forces AI keys off regardless of remote value', () => {
    expect(buildGateAllows('aiCoach')).toBe(betaFeatures.ai);
    expect(buildGateAllows('weeklyMealPlans')).toBe(betaFeatures.weeklyPlans);
    expect(buildGateAllows('manualFoodLogging')).toBe(true); // ungated
  });
});

describe('FeatureGate', () => {
  it('shows children when enabled, fallback otherwise', async () => {
    let tree;
    await act(async () => { tree = create(withFlags(<FeatureGate feature="aiCoach"><Text>coach</Text></FeatureGate>, { aiCoach: true })); });
    expect(tree.root.findAllByType(Text).map(n => n.props.children)).toContain('coach');
    await act(async () => { tree = create(withFlags(<FeatureGate feature="aiCoach" fallback={<Text>off</Text>}><Text>coach</Text></FeatureGate>, { aiCoach: false })); });
    const texts = tree.root.findAllByType(Text).map(n => n.props.children);
    expect(texts).toContain('off'); expect(texts).not.toContain('coach');
  });
});

describe('gateScreen', () => {
  const ScreenComp = () => <Text>screen body</Text>;
  it('renders the screen when any flag is enabled', async () => {
    const Gated = gateScreen(['appleHealthSync', 'androidHealthSync'], ScreenComp, 'Health');
    let tree;
    await act(async () => { tree = create(withFlags(<Gated />, { androidHealthSync: true })); });
    expect(tree.root.findAllByType(Text).map(n => n.props.children)).toContain('screen body');
  });
  it('renders FeatureUnavailable when all flags are off', async () => {
    const Gated = gateScreen('trainerDashboard', ScreenComp, 'Trainers');
    let tree;
    await act(async () => { tree = create(withFlags(<Gated />, { trainerDashboard: false })); });
    expect(tree.root.findAllByType(Notice).length).toBe(1);
    expect(tree.root.findAllByType(Text).map(n => n.props.children)).not.toContain('screen body');
  });
});
