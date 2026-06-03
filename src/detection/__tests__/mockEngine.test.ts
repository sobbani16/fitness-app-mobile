import { createMockDetectionEngine } from '../mockEngine';
import type { DetectionEvent } from '../types';

jest.useFakeTimers();

describe('mockDetectionEngine', () => {
  it('emits rising rep counts at the configured interval', async () => {
    const engine = createMockDetectionEngine({
      repIntervalMs: 100,
      initialWeightDelayMs: 50,
    });
    const events: DetectionEvent[] = [];
    engine.subscribe((e) => events.push(e));

    await engine.start('bench-press');
    jest.advanceTimersByTime(350);
    await engine.stop();

    const repEvents = events.filter((e) => e.type === 'rep');
    const reps = repEvents.map((e: any) => e.totalReps);
    expect(reps).toEqual([1, 2, 3]);
  });

  it('emits a weight estimate shortly after start', async () => {
    const engine = createMockDetectionEngine({
      repIntervalMs: 10_000,
      initialWeightDelayMs: 50,
    });
    const events: DetectionEvent[] = [];
    engine.subscribe((e) => events.push(e));

    await engine.start('squat');
    jest.advanceTimersByTime(100);
    await engine.stop();

    const weight = events.find((e) => e.type === 'weight-estimate') as any;
    expect(weight).toBeDefined();
    expect(weight.grams).toBe(60000); // 60 kg default for squat
    expect(weight.confidence).toBeGreaterThan(0);
  });

  it('stop() halts further emissions', async () => {
    const engine = createMockDetectionEngine({
      repIntervalMs: 50,
      initialWeightDelayMs: 10,
    });
    const events: DetectionEvent[] = [];
    engine.subscribe((e) => events.push(e));

    await engine.start('push-up');
    jest.advanceTimersByTime(120);
    const before = events.length;
    await engine.stop();
    jest.advanceTimersByTime(500);
    expect(events.length).toBe(before);
  });

  it('unsubscribe stops delivering events to that listener', async () => {
    const engine = createMockDetectionEngine({
      repIntervalMs: 50,
      initialWeightDelayMs: 10,
    });
    const received: DetectionEvent[] = [];
    const unsub = engine.subscribe((e) => received.push(e));
    await engine.start('bench-press');
    jest.advanceTimersByTime(60);
    unsub();
    const mid = received.length;
    jest.advanceTimersByTime(200);
    await engine.stop();
    expect(received.length).toBe(mid);
  });

  it('reports isReal() === false', () => {
    expect(createMockDetectionEngine().isReal()).toBe(false);
  });
});
