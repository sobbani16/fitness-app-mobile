import { TurboModuleRegistry } from 'react-native';
// The native MediaPipe hook owns model initialization and release in PoseCameraView.
export function isPoseDetectorAvailable(): boolean {
  return TurboModuleRegistry.get('MediapipePosedetection') !== null;
}
