// Apple Vision handles iOS OCR. Linking ML Kit there conflicts with the
// Google support libraries already bundled inside MediaPipeTasksCommon.
module.exports = {
  dependencies: {
    '@react-native-ml-kit/text-recognition': { platforms: { ios: null } },
  },
};
