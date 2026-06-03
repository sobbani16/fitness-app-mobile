// Runtime loader for a PoseDetector implementation.
//
// We keep pose-backend packages out of this repo's `dependencies` list so
// Expo Go keeps working. Once you install one of the options below and
// implement the tiny wrapper in `./poseBackends/`, `loadPoseDetector()`
// returns a real detector and `realEngine` / `detectionService` pick it up.
//
// Recommended options (pick ONE):
//
//   1. Google ML Kit via @infinitered/react-native-mlkit-pose-detection
//      npm i @infinitered/react-native-mlkit-pose-detection
//      Pros: most accurate, Google-supported. iOS + Android.
//      Cons: native deps → needs prebuild + dev-client build.
//
//   2. TFLite via react-native-fast-tflite + MoveNet Lightning
//      npm i react-native-fast-tflite
//      + place `assets/movenet_lightning.tflite` in your project
//      Pros: smaller model, great FPS on mid-range phones.
//      Cons: you implement keypoint parsing (17 points, different schema).
//
// Skeleton for option 1 (uncomment once installed):
//
//   import type { PoseDetector, PoseFrame } from './types';
//   export function loadPoseDetector(): PoseDetector | null {
//     try {
//       // eslint-disable-next-line @typescript-eslint/no-var-requires
//       const mlkit = require('@infinitered/react-native-mlkit-pose-detection');
//       return {
//         async init() { await mlkit.initialize(); },
//         async release() { /* no-op */ },
//         detect(frame: any): PoseFrame | null {
//           'worklet';
//           const result = mlkit.detectPose(frame); // frame-processor plugin
//           if (!result?.landmarks) return null;
//           return mapMLKitToPoseFrame(result.landmarks);
//         },
//       };
//     } catch {
//       return null;
//     }
//   }

import type { PoseDetector } from './types';

/** Returns a real PoseDetector when a backend is installed, else null. */
export function loadPoseDetector(): PoseDetector | null {
  // No backend wired yet — see comments above to enable.
  return null;
}

export function isPoseDetectorAvailable(): boolean {
  return loadPoseDetector() !== null;
}
