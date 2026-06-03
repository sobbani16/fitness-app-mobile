# On-device pose detection — setup

This project is wired for **VisionCamera + a pose model** running fully on-device. The code paths are already here; this doc is what you (or a friend) run once to light them up.

## Status of the moving parts

| Piece | Status | Notes |
| --- | --- | --- |
| `react-native-vision-camera` | ✅ installed | Needs prebuild + dev-client build to actually render a camera |
| `react-native-worklets-core` | ✅ installed | JS↔worklet bridge for frame processors |
| `react-native-reanimated` | ✅ installed | Transitive requirement |
| Rep-counter FSM | ✅ implemented + tested | `src/detection/repCounter.ts` (11 unit tests) |
| Real detection engine | ✅ implemented | `src/detection/realEngine.ts` |
| `<PoseCameraView>` | ✅ implemented | `src/components/PoseCameraView.tsx` |
| Pose model backend | ⏳ not installed | Pick one below |

Until a pose backend is installed, `isUsingRealDetection()` returns false and the app stays on the **mock engine** so Expo Go keeps working.

## 1. Build a dev-client (one-time)

VisionCamera + worklets need native code. You must leave Expo Go.

```bash
cd /Users/sobbani/Desktop/fitness-app-mobile
npx expo prebuild                    # generates ios/ and android/
npx expo run:ios                     # or: npx expo run:android
```

After this completes once, `npm start` (or `npx expo start --dev-client`) launches into the new dev-client. Your friends can install the same build via EAS (`eas build --profile preview --platform android|ios`, see `DISTRIBUTION.md`).

## 2. Pick a pose backend

### Option A — Google ML Kit (recommended for accuracy)

```bash
npm i @infinitered/react-native-mlkit-pose-detection
npx expo prebuild --clean
npx expo run:ios      # or run:android
```

Then open `src/detection/pose/poseDetectorLoader.ts` and uncomment the skeleton at the top of the file (it's written for exactly this library). You'll need a tiny mapping function from MLKit's 33 landmark indices to our `KeypointName` type — names listed in `src/detection/pose/types.ts`.

### Option B — MoveNet Lightning via TFLite (faster, smaller)

```bash
npm i react-native-fast-tflite
```

Download `movenet_singlepose_lightning.tflite` from Kaggle / TF Hub and drop it in `assets/`. Implement `loadPoseDetector()` using `loadTensorflowModel()` from that package; MoveNet outputs 17 keypoints in a `[1, 1, 17, 3]` tensor — map index → `KeypointName`.

## 3. Flip the switch

Once the backend is wired:

1. `loadPoseDetector()` returns a non-null `PoseDetector`.
2. `isRealDetectionAvailable()` becomes `true` automatically.
3. `detectionService` picks the real engine on next app launch.
4. Tapping **Auto-count reps** on the Log Exercise screen opens `PoseCameraScreen`, streams frames through the detector, and reps are counted by the rep-counter FSM in `src/detection/repCounter.ts`.

No UI code has to change — the interface contract in `src/detection/types.ts` is what everything depends on.

## 4. Tuning the rep counter

Per-exercise thresholds live in `EXERCISE_CONFIGS` (`src/detection/repCounter.ts`). Each entry specifies:

```ts
{
  angleJoints: [a, b, c],    // the three keypoints forming the tracked angle
  downBelow: 85,             // degrees — the "down" position boundary
  upAbove:   155,            // degrees — the "up" position boundary
  minVisibility: 0.5,        // ignore low-confidence keypoints
  minRepDurationMs: 500,     // debounce: minimum ms between rep completions
}
```

To tune for a new exercise, log out `{ angleDeg, visibility, timestampMs }` samples from `realEngine.pushPoseFrame` in a debug build and eyeball the thresholds. The FSM is pure and covered by unit tests — add a new test per exercise in `src/detection/__tests__/repCounter.test.ts` to lock in the thresholds.

## 5. Weight estimation

Camera-only weight estimation (plate color / size classification) is intentionally NOT wired yet — it needs a dedicated model and a lot of tuning. The practical path:

1. Use the existing `buildPrefill()` prior (last weight used for this exercise) as the default.
2. Pair with the Bluetooth scale (already implemented in `src/ble/`) for dumbbells.
3. Only invest in a plate-classification model once you validate user demand.

When you're ready, add `{ type: 'weight-estimate', grams, confidence, ... }` emissions from `realEngine.pushPoseFrame` — the `useExerciseDetection` hook already handles that event type and prefills the weight stepper.
