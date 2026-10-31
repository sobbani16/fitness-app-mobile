// Jest stub for expo-audio — the native module proxy is unavailable in tests.
export const RecordingPresets = { HIGH_QUALITY: {} };
export const AudioModule = { requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }) };
export const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);
export const useAudioRecorder = () => ({
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  record: jest.fn(), stop: jest.fn().mockResolvedValue(undefined), uri: null,
});
export const useAudioRecorderState = () => ({ isRecording: false, durationMillis: 0 });
