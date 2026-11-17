import { backOrFallback, fallbackTab, handleRootHardwareBack, _resetBackGuard } from '../back';

jest.useFakeTimers();

const nav = (canBack = true, routeNames = ['Main', 'MuscleExplorer']) => ({
  canGoBack: jest.fn(() => canBack),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  getState: jest.fn(() => ({ routeNames })),
});

describe('backOrFallback', () => {
  beforeEach(() => { _resetBackGuard(); jest.clearAllMocks(); });

  test('goes back when history exists', () => {
    const n = nav(true);
    backOrFallback(n as never, 'Summary');
    expect(n.goBack).toHaveBeenCalledTimes(1);
    expect(n.dispatch).not.toHaveBeenCalled();
  });

  test('resets to a Main tab when no history', () => {
    const n = nav(false);
    backOrFallback(n as never, 'Summary');
    expect(n.goBack).not.toHaveBeenCalled();
    expect(n.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RESET', payload: { index: 0, routes: [{ name: 'Main', params: { screen: 'Summary' } }] } }),
    );
  });

  test('resets to Onboarding when the root stack contains it', () => {
    const n = nav(false, ['Onboarding', 'EditProfile']);
    backOrFallback(n as never, 'Summary');
    expect(n.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { index: 0, routes: [{ name: 'Onboarding' }] } }),
    );
  });

  test('dedupes rapid presses — second call within 450ms is ignored', () => {
    const n = nav(true);
    backOrFallback(n as never, 'Summary');
    backOrFallback(n as never, 'Summary');
    backOrFallback(n as never, 'Summary');
    expect(n.goBack).toHaveBeenCalledTimes(1); // no double-pop races
    jest.advanceTimersByTime(500);
    backOrFallback(n as never, 'Summary');
    expect(n.goBack).toHaveBeenCalledTimes(2);
  });

  test('dedupe applies across the fallback path too', () => {
    const n = nav(false);
    backOrFallback(n as never, 'Summary');
    backOrFallback(n as never, 'Dashboard');
    expect(n.dispatch).toHaveBeenCalledTimes(1);
  });
});

describe('fallbackTab', () => {
  test('routes to sensible tabs, defaulting to Summary', () => {
    expect(fallbackTab('FoodEntry')).toBe('LogMeal');
    expect(fallbackTab('LabelScanner')).toBe('LogMeal');
    expect(fallbackTab('WorkoutPlan')).toBe('LogExercise');
    expect(fallbackTab('VideoCompare')).toBe('VideoSearch');
    expect(fallbackTab('MindHome')).toBe('Summary');
  });
});

describe('handleRootHardwareBack', () => {
  beforeEach(() => { _resetBackGuard(); jest.clearAllMocks(); });

  test('does nothing on Main/Onboarding or when history exists', () => {
    const n = nav(true);
    expect(handleRootHardwareBack(n as never, 'Main')).toBe(false);
    expect(handleRootHardwareBack(n as never, 'MuscleExplorer')).toBe(false);
    expect(n.goBack).not.toHaveBeenCalled();
  });

  test('direct-entry detail screen falls back to its tab', () => {
    const n = nav(false, ['Main', 'LabelScanner']);
    expect(handleRootHardwareBack(n as never, 'LabelScanner')).toBe(true);
    expect(n.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { index: 0, routes: [{ name: 'Main', params: { screen: 'LogMeal' } }] } }),
    );
  });
});
