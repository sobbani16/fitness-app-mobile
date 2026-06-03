// Public contract for any exercise-detection engine (ML / CV / IMU-based).
// UI + hooks depend ONLY on this file.
//
// The engine produces a stream of typed events. Consumers subscribe and
// map events into app state (e.g. auto-increment reps, prefill weight).

import type { PostureAssessment } from './posture';

export type DetectionStatus =
  | 'idle'
  | 'loading'       // model or native module is initializing
  | 'running'
  | 'stopped'
  | 'error';

export type DetectionEvent =
  | {
      type: 'rep';
      exerciseType: string;
      totalReps: number;       // running count for the current set
      confidence: number;      // 0..1
      timestamp: string;
    }
  | {
      type: 'weight-estimate';
      exerciseType: string;
      grams: number;
      confidence: number;      // 0..1
      timestamp: string;
    }
  | {
      type: 'exercise-change';
      exerciseType: string;    // model swapped its classification
      confidence: number;
      timestamp: string;
    }
  | {
      type: 'posture';
      exerciseType: string;
      assessment: PostureAssessment;
      timestamp: string;
    };

export interface DetectionEngine {
  /** True when this engine uses a real model / camera / sensor. */
  isReal(): boolean;

  /** One-shot init (model load, permissions, etc.). Safe to call many times. */
  init(): Promise<void>;

  /** Begin producing events for a given exerciseType hint. */
  start(exerciseType: string): Promise<void>;

  /** Stop producing events and release any transient resources. */
  stop(): Promise<void>;

  /** Subscribe to detection events. Returns unsubscribe. */
  subscribe(listener: (event: DetectionEvent) => void): () => void;
}
