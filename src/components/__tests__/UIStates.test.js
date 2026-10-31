jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View: props => <View {...props} /> },
    useSharedValue: v => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: v => v,
    withSpring: v => v,
    withRepeat: v => v,
    FadeIn: { duration: () => ({}) },
    FadeInDown: { duration: () => ({}) },
    ZoomIn: { springify: () => ({ damping: () => ({ stiffness: () => ({ delay: () => ({}) }) }) }) },
  };
});
const React = require('react');
const { act, create } = require('react-test-renderer');
const { Pressable, Text, TextInput } = require('react-native');
const states = require('../ui-states');
let tree;
const render = el => act(async () => { tree = create(el); });
const press = label => act(async () => tree.root.findAllByProps({ accessibilityLabel: label })[0].props.onPress());
const texts = () => tree.root.findAllByType(Text).map(t => t.props.children).flat().join(' ');
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; });

it('EmptyState shows why it is empty and fires its single CTA', async () => {
  const go = jest.fn();
  await render(<states.EmptyState title="No items in cart" description="Add products to start shopping" primaryCTA="Browse Products" onAction={go} />);
  expect(texts()).toContain('No items in cart');
  expect(texts()).toContain('Add products to start shopping');
  await press('Browse Products');
  expect(go).toHaveBeenCalled();
});

it('ErrorState defaults to a non-blamey message with a working retry', async () => {
  const retry = jest.fn();
  await render(<states.ErrorState onAction={retry} detail="HTTP 503" />);
  expect(texts()).toContain('Something went wrong');
  expect(texts()).toContain('HTTP 503');
  await press('Try again');
  expect(retry).toHaveBeenCalled();
});

it('NoInternetState keeps cached children mounted and lists offline coverage', async () => {
  const retry = jest.fn();
  await render(<states.NoInternetState availableOffline={["Today's diary"]} needsConnection={['Server sync']} onAction={retry}>
    <Text>cached-diary</Text>
  </states.NoInternetState>);
  const t = texts();
  expect(t).toContain("You're offline");
  expect(t).toContain("Today's diary");
  expect(t).toContain('cached-diary');
  await press('Retry connection');
  expect(retry).toHaveBeenCalled();
});

it('SlowNetworkState exposes determinate progress to assistive tech', async () => {
  await render(<states.SlowNetworkState progress={0.4} />);
  const bar = tree.root.findAllByProps({ accessibilityRole: 'progressbar' })[0];
  expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
  expect(texts()).toContain('Load lighter version');
});

it('NoSearchResultsState echoes the query and offers a suggestion and a browse path', async () => {
  const suggest = jest.fn(); const browse = jest.fn();
  await render(<states.NoSearchResultsState query="bred" suggestion="bread" onSuggestion={suggest} onSecondaryAction={browse} />);
  expect(texts()).toContain('No matches for “bred”');
  await press('Search for bread instead');
  expect(suggest).toHaveBeenCalled();
  await press('Browse categories');
  expect(browse).toHaveBeenCalled();
});

it('PermissionDeniedState names the permission benefit and routes to settings', async () => {
  const settings = jest.fn(); const skip = jest.fn();
  await render(<states.PermissionDeniedState permission="Camera" benefit="scanning nutrition labels" onAction={settings} onSecondaryAction={skip} />);
  const t = texts();
  expect(t).toContain('Camera access is off');
  expect(t).toContain('scanning nutrition labels');
  await press('Open Settings');
  expect(settings).toHaveBeenCalled();
  await press('Continue without');
  expect(skip).toHaveBeenCalled();
});

it('SessionExpiredState reassures that work was saved before login CTA', async () => {
  const login = jest.fn();
  await render(<states.SessionExpiredState savedNote="Your checkout form is saved" onAction={login} />);
  const t = texts();
  expect(t).toContain('signed out');
  expect(t).toContain('checkout form is saved');
  await press('Log back in');
  expect(login).toHaveBeenCalled();
});

it('ValidatedField flags the exact field with a live-region error and swaps back to the hint', async () => {
  await render(<states.ValidatedField label="Email" hint="We never share it." error="Enter a valid email address" />);
  const input = tree.root.findByType(TextInput);
  expect(input.props.style.borderColor ?? (input.props.style[0] || {}).borderColor).toBeDefined();
  expect(texts()).toContain('Enter a valid email address');
  expect(texts()).not.toContain('We never share it.');
});

it('LoadingState announces busy and shapes skeleton rows', async () => {
  await render(<states.LoadingState variant="list" rows={4} label="Loading your diary" />);
  const busy = tree.root.findAll(n => n.props.accessibilityState?.busy === true);
  expect(busy.length).toBeGreaterThan(0);
  expect(busy[0].props.accessibilityLabel).toBe('Loading your diary');
});

it('SuccessState confirms, states the next step, and fires the follow-up CTA', async () => {
  const track = jest.fn();
  await render(<states.SuccessState title="Order placed!" nextStep="You’ll get a confirmation email" primaryCTA="Track your order →" onAction={track} />);
  const t = texts();
  expect(t).toContain('Order placed!');
  expect(t).toContain('confirmation email');
  await press('Track your order →');
  expect(track).toHaveBeenCalled();
});
