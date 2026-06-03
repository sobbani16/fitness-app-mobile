import {
  EXERCISE_CONFIGS,
  angleBetween,
  createRepCounter,
} from '../repCounter';
import type { PoseFrame } from '../pose/types';

const squatCfg = EXERCISE_CONFIGS['squat'];
const pullUpCfg = EXERCISE_CONFIGS['pull-up'];

function feed(
  counter: ReturnType<typeof createRepCounter>,
  samples: [number, number, number][],   // [angleDeg, visibility, timestampMs]
) {
  const events = [];
  for (const [angleDeg, visibility, timestampMs] of samples) {
    const e = counter.push({ angleDeg, visibility, timestampMs });
    if (e) events.push(e);
  }
  return events;
}

describe('createRepCounter — standard orientation (squat: down=small angle)', () => {
  it('counts a clean rep', () => {
    const c = createRepCounter(squatCfg);
    const events = feed(c, [
      [170, 0.9, 0],      // up
      [90,  0.9, 500],    // down
      [170, 0.9, 1500],   // up → rep completes
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].count).toBe(1);
    expect(c.count).toBe(1);
    expect(c.phase).toBe('up');
  });

  it('counts multiple reps', () => {
    const c = createRepCounter(squatCfg);
    let t = 0;
    const samples: [number, number, number][] = [];
    // Each rep: up → down (800ms) → up (800ms) → safe gap
    for (let i = 0; i < 5; i++) {
      samples.push([170, 0.9, t]); t += 400;
      samples.push([90,  0.9, t]); t += 900;
      samples.push([170, 0.9, t]); t += 500;
    }
    const events = feed(c, samples);
    expect(events).toHaveLength(5);
    expect(c.count).toBe(5);
  });

  it('ignores low-visibility samples', () => {
    const c = createRepCounter(squatCfg);
    const events = feed(c, [
      [170, 0.9, 0],
      [90,  0.2, 500],   // low-vis: ignored
      [170, 0.9, 1500],  // still "unknown → up"; no rep
    ]);
    expect(events).toHaveLength(0);
    expect(c.count).toBe(0);
  });

  it('debounces reps that fire too quickly', () => {
    const c = createRepCounter(squatCfg);
    const events = feed(c, [
      [170, 0.9, 0],
      [90,  0.9, 100],
      [170, 0.9, 300],   // total rep duration 300ms < 700ms minimum
    ]);
    expect(events).toHaveLength(0);
    expect(c.count).toBe(0);
  });

  it('reports rangeOfMotion and confidence', () => {
    const c = createRepCounter(squatCfg);
    const events = feed(c, [
      [170, 0.9, 0],
      [95,  0.9, 500],
      [85,  0.9, 800],
      [170, 0.9, 1500],
    ]);
    expect(events[0].rangeOfMotion).toBeGreaterThan(70);
    expect(events[0].confidence).toBeGreaterThan(0.8);
    expect(events[0].durationMs).toBe(1000);
  });

  it('reset() clears state', () => {
    const c = createRepCounter(squatCfg);
    feed(c, [[170, 0.9, 0], [90, 0.9, 500], [170, 0.9, 1500]]);
    expect(c.count).toBe(1);
    c.reset();
    expect(c.count).toBe(0);
    expect(c.phase).toBe('unknown');
  });
});

describe('createRepCounter — inverted orientation (pull-up: down=large angle)', () => {
  it('counts a pull-up rep (arms extended → flexed)', () => {
    const c = createRepCounter(pullUpCfg);
    // pull-up config: inverted — "down" = extended (angle ≥ 150),
    // "up" = flexed (angle ≤ 80). Rep completes on down→up.
    const events = feed(c, [
      [160, 0.9, 0],      // extended → down phase
      [70,  0.9, 800],    // flexed  → up phase (duration 800 > 600 debounce)
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].count).toBe(1);
  });
});

describe('angleBetween', () => {
  const pose: PoseFrame = {
    rightShoulder: { x: 0, y: 0, confidence: 0.9 },
    rightElbow:    { x: 1, y: 0, confidence: 0.9 },
    rightWrist:    { x: 1, y: 1, confidence: 0.9 },
  };

  it('computes a 90 degree angle', () => {
    const { angleDeg, visibility } = angleBetween(pose, [
      'rightShoulder', 'rightElbow', 'rightWrist',
    ]);
    expect(angleDeg).toBeCloseTo(90, 3);
    expect(visibility).toBeCloseTo(0.9, 5);
  });

  it('computes a 180 degree (straight) angle', () => {
    const straight: PoseFrame = {
      rightShoulder: { x: 0, y: 0, confidence: 0.9 },
      rightElbow:    { x: 1, y: 0, confidence: 0.9 },
      rightWrist:    { x: 2, y: 0, confidence: 0.9 },
    };
    const { angleDeg } = angleBetween(straight, [
      'rightShoulder', 'rightElbow', 'rightWrist',
    ]);
    expect(angleDeg).toBeCloseTo(180, 3);
  });

  it('returns NaN when keypoint missing', () => {
    const { angleDeg } = angleBetween({}, [
      'rightShoulder', 'rightElbow', 'rightWrist',
    ]);
    expect(Number.isNaN(angleDeg)).toBe(true);
  });

  it('returns NaN when visibility below threshold', () => {
    const lowVis: PoseFrame = {
      rightShoulder: { x: 0, y: 0, confidence: 0.1 },
      rightElbow:    { x: 1, y: 0, confidence: 0.1 },
      rightWrist:    { x: 1, y: 1, confidence: 0.1 },
    };
    const { angleDeg } = angleBetween(
      lowVis,
      ['rightShoulder', 'rightElbow', 'rightWrist'],
      0.3,
    );
    expect(Number.isNaN(angleDeg)).toBe(true);
  });
});
