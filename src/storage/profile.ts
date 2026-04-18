import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fitness.profile.v1';

export type Sex = 'male' | 'female' | 'other';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  createdAt: string;
}

export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Profile;
  } catch {
    return null;
  }
}

export async function saveProfile(p: Profile): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}

export async function clearProfile(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
