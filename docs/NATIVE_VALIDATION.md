# Native validation

Date: 2026-10-09. Native projects were generated in `/private/tmp/fitness-native-check` to preserve the repository's existing generated native directories. Dependency installation and builds used the same mobile `node_modules` via a symlink. No signing, store submission or deployment occurred.

## Issues found and addressed

1. Default iOS 15.1 deployment target conflicted with OCR requirements. Added `expo-build-properties` configuration for iOS 15.5.
2. Simulator linking reported 221 duplicate Google support symbols from MediaPipeTasksCommon and ML Kit dependencies. Added the local `modules/fitness-ocr` Expo module using Apple Vision for iOS, excluded ML Kit from iOS autolinking, and retained ML Kit on Android. No binary stripping or duplicate-symbol suppression is used.
3. Rebuilt CocoaPods graph: 103 total pods installed, including FitnessOcr. The conflicting ML Kit support pods were removed.

## Verification scope

- TypeScript and iOS/Android Hermes exports validate JavaScript only.
- Native prebuild verifies configuration and model asset generation.
- CocoaPods installation verifies dependency resolution, not final linking or camera behavior.
- Simulator and Android ARM64 debug builds passed; details below.
- Real-device tests remain required for camera orientation and permissions, OCR recognition accuracy, pose visibility/confidence and rep/form accuracy, foreground/background transitions, Bluetooth and actual scale compatibility.
- The current 2D pose rules need device calibration across aspect ratios, distances and camera views. Do not interpret successful compilation as accurate or clinically validated coaching.

## References

- [Expo local native modules](https://docs.expo.dev/modules/get-started/)
- [Expo autolinking](https://docs.expo.dev/modules/autolinking/)
- [Apple Vision text recognition](https://developer.apple.com/documentation/vision/vnrecognizetextrequest)
- [MediaPipe iOS setup](https://developers.google.com/edge/mediapipe/solutions/setup_ios)

Build logs are local temporary artifacts: `/private/tmp/fitness-xcodebuild-final.log` and `/private/tmp/fitness-android-build.log`. They are not checked in.

## iOS result

**PASS:** Xcode simulator Debug build completed with `BUILD SUCCEEDED` and signing disabled. Includes the MediaPipe native integration and the new Apple Vision OCR module. The generated app is a build artifact, not a store-ready signed release. Device execution and recognition accuracy remain unverified.

## Android result

**PASS:** `:app:assembleDebug` for `arm64-v8a` completed with `BUILD SUCCESSFUL` (540 tasks). The first attempt found an incomplete local NDK installation lacking `source.properties`; SDK Manager completed NDK 27.1, and Gradle installed its additional required SDK components. This was an environment repair, not a source-level compiler workaround.

Artifact: `/private/tmp/fitness-native-check/android/app/build/outputs/apk/debug/app-debug.apk`. This is a temporary debug artifact, not a production release or a physical-device acceptance result. Native dependency deprecation warnings remain in the build log.

Reproduction: generate native projects with `npx expo prebuild --no-install`, install iOS pods, then use Xcode simulator Debug build with `CODE_SIGNING_ALLOWED=NO`, or run `./gradlew :app:assembleDebug --no-daemon -PreactNativeArchitectures=arm64-v8a` in the generated Android directory with the Android SDK configured. Keep the app configuration, local OCR module and model assets together.
