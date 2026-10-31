jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
let mockAccount = 'alice';
jest.mock('../../storage/session', () => ({ getSession: () => mockAccount ? { user: { id: mockAccount } } : null }));
const React = require('react');
const { create, act } = require('react-test-renderer');
const { Alert, TextInput, View } = require('react-native');
const { BaseNavigationContainer, createNavigatorFactory, useNavigationBuilder, StackRouter, TabRouter } = require('@react-navigation/native');
const { useConfirmLeave } = require('../useConfirmLeave');
const { backOrFallback, handleRootHardwareBack } = require('../../navigation/back');
const { navigationRef, navigateToTab, flushPendingNavigation, clearPendingNavigation } = require('../../navigation/navigationRef');

// Actual React Navigation state/actions/removal events; only native rendering is omitted.
function RouterView({ router, ...props }) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder(router, props);
  return <NavigationContent>{state.routes.map(route => <View key={route.key}>{descriptors[route.key].render()}</View>)}</NavigationContent>;
}
function TestStack(props) { return <RouterView {...props} router={StackRouter} />; }
function TestTabs(props) { return <RouterView {...props} router={TabRouter} />; }
const Stack = createNavigatorFactory(TestStack)(), Tabs = createNavigatorFactory(TestTabs)();
function Empty() { return null; }
let tree, controls, mainNavigation, tabNavigation;
function Main() {
  return <Tabs.Navigator backBehavior="history">
    {['Dashboard', 'LogMeal', 'LogExercise', 'History', 'Summary'].map(name => <Tabs.Screen key={name} name={name}>
      {({ navigation }) => { tabNavigation = navigation; return null; }}
    </Tabs.Screen>)}
  </Tabs.Navigator>;
}
function Draft({ navigation, route }) {
  const [value, setValue] = React.useState(route.params?.value || '');
  useConfirmLeave(!!value, !!route.params?.busy);
  controls = { navigation, setValue, value };
  return <TextInput accessibilityLabel="Draft" value={value} onChangeText={setValue} />;
}
function Home({ navigation }) { mainNavigation = navigation; return <Main />; }
async function mount(initialRouteName = 'Main', params) {
  await act(async () => {
    tree = create(<BaseNavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRouteName}>
        <Stack.Screen name="Main" component={Home} />
        <Stack.Screen name="Draft" component={Draft} initialParams={params} />
        <Stack.Screen name="VideoSearch" component={Empty} />
      </Stack.Navigator>
    </BaseNavigationContainer>);
  });
}
beforeEach(() => { mockAccount = 'alice'; clearPendingNavigation(); jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(async () => { if (tree) await act(async () => tree.unmount()); clearPendingNavigation(); jest.restoreAllMocks(); });
const active = () => navigationRef.getRootState().routes.at(-1).name;

it('keeps unsaved values on Back, then removes exactly one route after discard', async () => {
  await mount();
  await act(async () => mainNavigation.navigate('Draft'));
  await act(async () => controls.setValue('40 grams'));
  await act(async () => backOrFallback(controls.navigation, 'LogMeal'));
  expect(active()).toBe('Draft');
  expect(controls.value).toBe('40 grams');
  await act(async () => Alert.alert.mock.calls.at(-1)[2][0].onPress());
  expect(active()).toBe('Draft');
  await act(async () => controls.navigation.goBack());
  await act(async () => Alert.alert.mock.calls.at(-1)[2][1].onPress());
  expect(navigationRef.getRootState().routes.map(route => route.name)).toEqual(['Main']);
});

it('uses a deliberate fallback with no history and still honors the dirty guard', async () => {
  await mount('Draft', { value: 'unsaved' });
  expect(controls.navigation.canGoBack()).toBe(false);
  await act(async () => backOrFallback(controls.navigation, 'VideoSearch'));
  expect(active()).toBe('Draft');
  await act(async () => Alert.alert.mock.calls.at(-1)[2][1].onPress());
  expect(navigationRef.getRootState().routes.map(route => route.name)).toEqual(['VideoSearch']);
});

it('explains a blocked exit while a write is pending', async () => {
  await mount('Draft', { value: 'pending', busy: true });
  await act(async () => backOrFallback(controls.navigation, 'LogMeal'));
  expect(active()).toBe('Draft');
  expect(Alert.alert).toHaveBeenCalledWith('Please wait', expect.stringContaining('in progress'));
});

it('handles system Back for a direct detail entry but leaves primary-tab exit to the OS', async () => {
  await mount('Draft');
  await act(async () => expect(handleRootHardwareBack(controls.navigation, 'LabelScanner')).toBe(true));
  expect(active()).toBe('Main');
  const state = navigationRef.getRootState().routes[0].state;
  expect(state.routes[state.index].name).toBe('LogMeal');
  expect(handleRootHardwareBack(mainNavigation, 'Main')).toBe(false);
});

it('returns to the previously visited tab with history back behavior', async () => {
  await mount();
  await act(async () => tabNavigation.navigate('LogMeal'));
  await act(async () => tabNavigation.navigate('History'));
  await act(async () => tabNavigation.goBack());
  const state = navigationRef.getRootState().routes[0].state;
  expect(state.routes[state.index].name).toBe('LogMeal');
});

it('queues an allowed notification until the navigator is ready', async () => {
  navigateToTab('LogExercise');
  await mount();
  await act(async () => flushPendingNavigation());
  const state = navigationRef.getRootState().routes[0].state;
  expect(state.routes[state.index].name).toBe('LogExercise');
  await act(async () => flushPendingNavigation());
  expect(navigationRef.getRootState().routes).toHaveLength(1);
});

it('rejects unknown destinations and a queued request belonging to a different account', async () => {
  navigateToTab('LogExercise');
  mockAccount = 'bob';
  await mount();
  await act(async () => { flushPendingNavigation(); navigateToTab('ClientProgress'); navigateToTab('../admin'); });
  const state = navigationRef.getRootState().routes[0].state;
  expect(state.routes[state.index].name).toBe('Dashboard');
});

it('waits through onboarding without navigating to an unregistered Main screen', async () => {
  navigateToTab('LogMeal');
  await act(async () => {
    tree = create(<BaseNavigationContainer ref={navigationRef}><Stack.Navigator><Stack.Screen name="Onboarding" component={Empty} /></Stack.Navigator></BaseNavigationContainer>);
  });
  await act(async () => flushPendingNavigation());
  expect(active()).toBe('Onboarding');
  await act(async () => tree.unmount());
  await mount();
  await act(async () => flushPendingNavigation());
  const state = navigationRef.getRootState().routes[0].state;
  expect(state.routes[state.index].name).toBe('LogMeal');
});
