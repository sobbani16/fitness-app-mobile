import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fitness.deviceId.v1';

function generate(): string {
  return 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const id = generate();
  await AsyncStorage.setItem(KEY, id);
  cached = id;
  return id;
}
