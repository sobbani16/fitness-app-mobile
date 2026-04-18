export type FitnessGoal = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  goal: FitnessGoal;
}

export interface Meal {
  id: string;
  userId: string;
  photoUri?: string;
  calories: number;
  createdAt: string;
}

export interface DailyTotals {
  caloriesIn: number;
  caloriesOut: number;
  net: number;
}
