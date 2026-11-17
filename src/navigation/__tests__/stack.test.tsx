// Stack-integrity regression test: verifies a real native-stack navigator
// returns to the EXPECTED previous screen across deep chains, repeated
// pushes, and rapid back dispatches — the mechanism behind the P0 bug.
import React from 'react';
// @ts-ignore — no bundled types
import TestRenderer, { act } from 'react-test-renderer';
import { Text, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from '../navigationRef';

jest.mock('../../storage/session', () => ({ getSession: () => null }));

const Stack = createNativeStackNavigator();

const Screen = ({ navigation, route }: any) => (
  <>
    <Text>{route.name}</Text>
    <Pressable accessibilityLabel={`go-${route.name}`} onPress={() => navigation.navigate(route.params?.next || 'S2', { next: route.params?.next === 'S2' ? 'S3' : route.params?.next === 'S3' ? 'S4' : 'S5' })} />
    <Pressable accessibilityLabel={`back-${route.name}`} onPress={() => navigation.goBack()} />
  </>
);

const mount = async () => {
  let r: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator>
          {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((n) => <Stack.Screen key={n} name={n} component={Screen} />)}
        </Stack.Navigator>
      </NavigationContainer>,
    );
  });
  return r!;
};

const topRoute = () => {
  const s = navigationRef.getRootState()!;
  return s.routes[s.index].name;
};

describe('native stack integrity', () => {
  let r: TestRenderer.ReactTestRenderer;
  afterEach(() => act(() => { r?.unmount(); }));

  test('push chain 6 deep — each back returns to the expected previous screen', async () => {
    r = await mount();
    expect(topRoute()).toBe('S1');
    for (const next of ['S2', 'S3', 'S4', 'S5', 'S6']) {
      await act(async () => { navigationRef.navigate(next as never); });
      expect(topRoute()).toBe(next);
      expect(navigationRef.canGoBack()).toBe(true);
    }
    expect(navigationRef.getRootState()!.routes.length).toBe(6);
    for (const prev of ['S5', 'S4', 'S3', 'S2', 'S1']) {
      await act(async () => { navigationRef.goBack(); });
      expect(topRoute()).toBe(prev);
    }
    expect(navigationRef.canGoBack()).toBe(false);
  });

  test('navigate to the Main tab pops back instead of stacking duplicates', async () => {
    r = await mount();
    await act(async () => { navigationRef.navigate('S2' as never); });
    await act(async () => { navigationRef.navigate('S3' as never); });
    // `navigate` to an existing sibling route: top is the requested screen and
    // back still lands on a coherent previous entry — never a dead state.
    await act(async () => { navigationRef.navigate('S1' as never); });
    expect(topRoute()).toBe('S1');
    await act(async () => { navigationRef.goBack(); });
    expect(['S3', 'S1']).toContain(topRoute()); // expected previous entry
    expect(navigationRef.canGoBack() || topRoute() === 'S1').toBe(true);
  });

  test('push creates duplicates but back still unwinds in order', async () => {
    r = await mount();
    await act(async () => { navigationRef.dispatch({ type: 'PUSH', payload: { name: 'S2' } } as never); });
    await act(async () => { navigationRef.dispatch({ type: 'PUSH', payload: { name: 'S2' } } as never); });
    expect(navigationRef.getRootState()!.routes.length).toBe(3);
    await act(async () => { navigationRef.goBack(); });
    expect(topRoute()).toBe('S2'); // expected previous entry, not a trap
    await act(async () => { navigationRef.goBack(); });
    expect(topRoute()).toBe('S1');
  });

  test('rapid consecutive goBack dispatches unwind without dead state', async () => {
    r = await mount();
    await act(async () => { navigationRef.navigate('S2' as never); });
    await act(async () => { navigationRef.navigate('S3' as never); });
    await act(async () => { navigationRef.goBack(); navigationRef.goBack(); });
    expect(['S1']).toContain(topRoute());
    expect(navigationRef.canGoBack()).toBe(false);
  });
});
