import React from 'react';
// @ts-ignore — react-test-renderer ships no bundled types
import TestRenderer, { act } from 'react-test-renderer';
import { AppState } from 'react-native';

jest.useFakeTimers();

const mockGetFeatureConfig = jest.fn();
jest.mock('../../api/config', () => ({ getFeatureConfig: () => mockGetFeatureConfig() }));
const mockLoadFeatureConfig = jest.fn(async () => null), mockSaveFeatureConfig = jest.fn(async () => {});
jest.mock('../../storage/featureConfig', () => ({
  loadFeatureConfig: () => mockLoadFeatureConfig(),
  saveFeatureConfig: () => mockSaveFeatureConfig(),
}));
const sessionListenersRef: { v: (() => void)[] } = { v: [] };
let sessionListeners: (() => void)[] = [];
jest.mock('../../storage/session', () => ({
  subscribeSession: (fn: () => void) => { sessionListenersRef.v.push(fn); return () => { sessionListenersRef.v = sessionListenersRef.v.filter((l) => l !== fn); }; },
}));

const { FeatureFlagsProvider } = require('../FeatureFlagsContext');

const cfg = (features: Record<string, boolean> = {}, secs = 60) => ({ configVersion: 'v1', refreshAfterSeconds: secs, features });

const flush = async () => { await act(async () => { await Promise.resolve(); }); };

const renderers: TestRenderer.ReactTestRenderer[] = [];
const mount = async () => {
  let r: TestRenderer.ReactTestRenderer;
  await act(async () => { r = TestRenderer.create(<FeatureFlagsProvider><React.Fragment /></FeatureFlagsProvider>); });
  renderers.push(r!);
  return r!;
};

describe('FeatureFlagsProvider request discipline', () => {
  let appStateCb: ((s: string) => void) | null = null;
  afterEach(() => {
    while (renderers.length) { const r = renderers.pop()!; act(() => { r.unmount(); }); }
  });
  beforeEach(() => {
    jest.clearAllMocks();
    sessionListenersRef.v = [];
    appStateCb = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_t: any, cb: any) => {
      appStateCb = cb; return { remove: jest.fn() } as any;
    }) as any);
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
    mockGetFeatureConfig.mockResolvedValue(cfg());
  });

  test('mount triggers exactly one request; success does not immediately re-request', async () => {
    await mount();
    await flush();
    expect(mockGetFeatureConfig).toHaveBeenCalledTimes(1);
    // A resolved refresh used to recreate `refresh` (dep on `flags`) which
    // re-ran the effect and fired another request — the 429 storm.
    await act(async () => { jest.advanceTimersByTime(30_000); });
    expect(mockGetFeatureConfig).toHaveBeenCalledTimes(1);
  });

  test('flag value changes do not recreate the polling loop', async () => {
    await mount(); await flush();
    mockGetFeatureConfig.mockResolvedValue(cfg({ someFlag: true }));
    await act(async () => { jest.advanceTimersByTime(80_000); }); // poll fires → new values (60s + up to 20% jitter)
    expect(mockGetFeatureConfig).toHaveBeenCalledTimes(2);
    await act(async () => { jest.advanceTimersByTime(30_000); });
    expect(mockGetFeatureConfig).toHaveBeenCalledTimes(2); // no storm after setFlags
  });

  test('foreground transitions dedupe against in-flight and min-interval', async () => {
    await mount(); await flush();
    mockGetFeatureConfig.mockClear();
    appStateCb!('background'); appStateCb!('active'); appStateCb!('active');
    await flush();
    // min-interval gate: the burst collapses to at most one extra request
    expect(mockGetFeatureConfig.mock.calls.length).toBeLessThanOrEqual(1);
  });

  test('429 honors Retry-After and backs off', async () => {
    mockGetFeatureConfig.mockRejectedValue({ response: { status: 429, headers: { 'retry-after': '120' } } });
    await mount(); await flush();
    expect(mockGetFeatureConfig).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(90_000); });
    expect(mockGetFeatureConfig).toHaveBeenCalledTimes(1); // still cooling down
    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(mockGetFeatureConfig.mock.calls.length).toBeGreaterThanOrEqual(2); // resumes after Retry-After
  });

  test('network failure backs off exponentially instead of tight-retrying', async () => {
    mockGetFeatureConfig.mockRejectedValue(new Error('offline'));
    await mount(); await flush();
    expect(mockGetFeatureConfig).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(61_000); });
    const after = mockGetFeatureConfig.mock.calls.length;
    expect(after).toBeLessThanOrEqual(2); // backoff 2x + jitter, no rapid loop
    await act(async () => { jest.advanceTimersByTime(30_000); });
    expect(mockGetFeatureConfig.mock.calls.length).toBe(after); // next tick is ~120s out
  });

  test('session change resets flags and fetches once for the new account', async () => {
    await mount(); await flush();
    mockGetFeatureConfig.mockClear();
    act(() => { sessionListenersRef.v.forEach((l) => l()); });
    await flush();
    expect(mockGetFeatureConfig).toHaveBeenCalledTimes(1); // one fetch for new account, no duplicates
  });

  test('unmount cancels the timer — no post-unmount requests', async () => {
    const r = await mount(); await flush();
    await act(async () => { r.unmount(); });
    await act(async () => { jest.advanceTimersByTime(300_000); });
    expect(mockGetFeatureConfig).toHaveBeenCalledTimes(1);
  });

  test('sustained use stays within expected budget: ≤ 2 requests/min', async () => {
    await mount(); await flush();
    await act(async () => { jest.advanceTimersByTime(5 * 60_000); }); // 5 min uptime
    expect(mockGetFeatureConfig.mock.calls.length).toBeLessThanOrEqual(6); // 1 + ~5 polls @ 60s
  });
});
