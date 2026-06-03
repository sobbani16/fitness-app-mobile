// Mock BLE adapter — simulates a scale for Expo Go and unit tests.
// Behaviour: after "connect", emits a slightly-noisy weight every 300ms
// that converges to a stable target in ~1.5s, then stops.

import type { BleAdapter, BleDevice, ScaleReading } from './types';

interface MockOptions {
  targetGrams?: number;
  tickMs?: number;
  convergeAfter?: number; // number of ticks before stable
}

export function createMockAdapter(opts: MockOptions = {}): BleAdapter {
  const targetGrams = opts.targetGrams ?? 185;
  const tickMs = opts.tickMs ?? 300;
  const convergeAfter = opts.convergeAfter ?? 4;

  let listeners = new Set<(r: ScaleReading) => void>();
  let timer: ReturnType<typeof setInterval> | null = null;
  let tick = 0;

  function stopEmitting() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    isReal() { return false; },

    async scan(timeoutMs = 1500) {
      // Simulate a short discovery delay so UI can show a spinner.
      await delay(Math.min(timeoutMs, 400));
      const device: BleDevice = { id: 'mock-scale-01', name: 'Mock Kitchen Scale' };
      return device;
    },

    async connect(_device: BleDevice) {
      await delay(200);
    },

    subscribe(listener) {
      listeners.add(listener);
      if (!timer) {
        tick = 0;
        timer = setInterval(() => {
          tick += 1;
          const stable = tick >= convergeAfter;
          // Converging noise: early ticks wobble, later ticks lock in.
          const noise = stable ? 0 : (Math.sin(tick) * 6);
          const grams = Math.max(0, Math.round(targetGrams + noise));
          const reading: ScaleReading = {
            grams,
            stable,
            timestamp: new Date().toISOString(),
          };
          listeners.forEach((l) => l(reading));
          if (stable) stopEmitting();
        }, tickMs);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stopEmitting();
      };
    },

    async disconnect() {
      stopEmitting();
      listeners.clear();
    },
  };
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
