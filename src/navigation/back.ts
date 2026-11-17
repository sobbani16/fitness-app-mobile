import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native';

type BackNavigation = Pick<NavigationProp<ParamListBase>, 'canGoBack' | 'goBack' | 'dispatch'> & {
  getState: () => { routeNames: string[] } | undefined;
};

export function fallbackTab(route: string): string {
  if (route === 'VideoCompare') return 'VideoSearch';
  if (['FoodEntry', 'LabelScanner', 'MenuScan', 'PortionAdjust'].includes(route)) return 'LogMeal';
  if (['WorkoutPlan', 'VideoSearch'].includes(route)) return 'LogExercise';
  return 'Summary';
}

/** React Navigation handles history; only intercept a direct root detail entry. */
export function handleRootHardwareBack(navigation: BackNavigation, route: string | undefined) {
  if (!route || route === 'Main' || route === 'Onboarding' || navigation.canGoBack()) return false;
  backOrFallback(navigation, fallbackTab(route));
  return true;
}

let lastDispatchAt = 0;
export function _resetBackGuard() { lastDispatchAt = 0; } // test hook

/** A fallback still uses a navigation action, so removal guards can intercept it.
 * Dedupes rapid presses: two dispatches within 450ms can race a native
 * transition and leave the stack wedged (dead back button + dead swipe). */
export function backOrFallback(navigation: BackNavigation, screen = 'Dashboard') {
  const now = Date.now();
  if (now - lastDispatchAt < 450) return;
  lastDispatchAt = now;
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  if (navigation.getState()?.routeNames.includes('Onboarding')) {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Onboarding' }] }));
    return;
  }
  const destination = screen === 'VideoSearch'
    ? { name: 'VideoSearch', params: {} }
    : { name: 'Main', params: { screen } };
  // Replace the invalid entry rather than placing a fallback above it.
  navigation.dispatch(CommonActions.reset({ index: 0, routes: [destination] }));
}
