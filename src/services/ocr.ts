import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';

export async function recognizeLabel(uri: string): Promise<{ text: string }> {
  if (Platform.OS === 'ios') {
    const native = requireNativeModule<{ recognize(uri: string): Promise<string> }>('FitnessOcr');
    return { text: await native.recognize(uri) };
  }
  if (Platform.OS === 'android') {
    const { default: recognition } = require('@react-native-ml-kit/text-recognition') as typeof import('@react-native-ml-kit/text-recognition');
    return recognition.recognize(uri);
  }
  throw new Error('Label recognition requires the native app. Enter label text manually.');
}
