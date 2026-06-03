// Public facade over whatever detection engine is active.
// Mirrors the pattern used by /ble/bleService.ts.

import type { DetectionEngine, DetectionEvent } from './types';
import { createMockDetectionEngine } from './mockEngine';
import {
  createRealDetectionEngine,
  isRealDetectionAvailable,
} from './realEngine';

let engine: DetectionEngine | null = null;

function getEngine(): DetectionEngine {
  if (!engine) {
    engine = isRealDetectionAvailable()
      ? createRealDetectionEngine()
      : createMockDetectionEngine();
  }
  return engine;
}

/** Test hook — inject a custom engine. */
export function __setDetectionEngineForTests(e: DetectionEngine | null) {
  engine = e;
}

export function isUsingRealDetection(): boolean {
  return getEngine().isReal();
}

export function initDetection(): Promise<void> {
  return getEngine().init();
}

export function startDetection(exerciseType: string): Promise<void> {
  return getEngine().start(exerciseType);
}

export function stopDetection(): Promise<void> {
  return getEngine().stop();
}

export function subscribeDetection(
  listener: (e: DetectionEvent) => void,
): () => void {
  return getEngine().subscribe(listener);
}
