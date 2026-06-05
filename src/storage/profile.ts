import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fitness.profile.v1';

export type Sex = 'male' | 'female' | 'other';
export type Goal =
  | 'weight_loss'
  | 'muscle_gain'
  | 'body_recomposition'
  | 'maintain';

// Legacy goal values from older app versions, mapped to the new taxonomy.
const LEGACY_GOAL_MAP: Record<string, Goal> = {
  lose: 'weight_loss',
  gain: 'muscle_gain',
  maintain: 'maintain',
};

export function normalizeGoal(goal: unknown): Goal {
  if (typeof goal !== 'string') return 'maintain';
  if (goal in LEGACY_GOAL_MAP) return LEGACY_GOAL_MAP[goal];
  const valid: Goal[] = ['weight_loss', 'muscle_gain', 'body_recomposition', 'maintain'];
  return (valid as string[]).includes(goal) ? (goal as Goal) : 'maintain';
}
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type UnitSystem = 'metric' | 'imperial';

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;       // canonical
  weightKg: number;       // canonical
  goalWeightKg?: number;  // canonical target weight
  activityLevel: ActivityLevel;
  goal: Goal;
  units: UnitSystem;      // display preference
  createdAt: string;
}

export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    // Migrate legacy goal values (lose/gain) to the new taxonomy on read.
    return { ...parsed, goal: normalizeGoal(parsed.goal) } as Profile;
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
