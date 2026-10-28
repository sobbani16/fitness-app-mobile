jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import { assessDay, ASSESSMENT_RULE_VERSION, AssessmentContext } from '../dayAssessment';
import { estimateBMR, estimateTDEE, calorieTarget } from '../energy';
import type { ProgressDay } from '../progress';

const profile: any = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activityLevel: 'moderate', goal: 'weight_loss', units: 'metric' };
const day = (over: Partial<ProgressDay> = {}): ProgressDay => ({ date: '2026-10-20', mealCount: 0, calories: null, protein: null, carbs: null, fat: null, fiber: null, weightKg: null, waterMl: null, steps: null, workouts: null, ...over });
const ctx = (over: Partial<AssessmentContext> = {}): AssessmentContext => ({ goal: 'weight_loss', view: 'overall', target: calorieTarget(profile), proteinTarget: 128, profile, isToday: false, consecutiveInactiveDays: 0, ...over });

test('BMR Mifflin-St Jeor + TDEE multiplier', () => {
  expect(estimateBMR(profile)).toBe(1780);          // 10*80 + 6.25*180 - 5*30 + 5
  expect(estimateTDEE(profile)).toBe(2759);         // *1.55
  expect(estimateBMR(null)).toBeNull();
});

test('missing food log → gray nutrition, never zero', () => {
  const a = assessDay(day(), ctx({ view: 'nutrition' }));
  expect(a.status).toBe('gray'); expect(a.missing).toContain('food log');
});

test('same day differs across views: green workout + gray nutrition', () => {
  const d = day({ workouts: 1 });
  expect(assessDay(d, ctx({ view: 'workouts' })).status).toBe('green');
  expect(assessDay(d, ctx({ view: 'nutrition' })).status).toBe('gray');
  // Overall keeps the workout's green — missing food doesn't downgrade to red.
  expect(assessDay(d, ctx({ view: 'overall' })).status).toBe('green');
});

test('extreme restriction is never green for weight loss', () => {
  const a = assessDay(day({ mealCount: 1, calories: 400 }), ctx());
  expect(a.status).toBe('red');
  expect(a.reasons.join()).toMatch(/below a safe range/);
});

test('deficit-range day is green for weight loss', () => {
  const t = calorieTarget(profile)!; // ~2207–2537
  const a = assessDay(day({ mealCount: 3, calories: (t.low + t.high) / 2, protein: 150 }), ctx());
  expect(a.status).toBe('green');
});

test('rest days: 1-2 quiet days are yellow-ish, long streak red', () => {
  expect(assessDay(day(), ctx({ view: 'workouts', consecutiveInactiveDays: 1 })).status).toBe('yellow');
  expect(assessDay(day(), ctx({ view: 'workouts', consecutiveInactiveDays: 4 })).status).toBe('red');
});

test('provisional flag on today; rule version stamped', () => {
  const a = assessDay(day(), ctx({ isToday: true }));
  expect(a.provisional).toBe(true);
  expect(a.ruleVersion).toBe(ASSESSMENT_RULE_VERSION);
});

test('muscle-gain goal rewards adequate surplus, flags large overshoot', () => {
  const p: any = { ...profile, goal: 'muscle_gain' };
  const t = calorieTarget(p)!;
  expect(assessDay(day({ mealCount: 4, calories: (t.low + t.high) / 2 }), ctx({ goal: 'muscle_gain', target: t, profile: p })).status).toBe('green');
  expect(assessDay(day({ mealCount: 4, calories: t.high * 1.4 }), ctx({ goal: 'muscle_gain', target: t, profile: p })).status).toBe('red');
});

test('planned rest day is green; scheduled-but-missed is yellow not red', () => {
  expect(assessDay(day(), ctx({ view: 'workouts', plannedRest: true })).status).toBe('green');
  const a = assessDay(day(), ctx({ view: 'workouts', plannedWorkout: true }));
  expect(a.status).toBe('yellow'); expect(a.reasons.join()).toMatch(/scheduled/);
  expect(assessDay(day(), ctx({ view: 'workouts', plannedWorkout: false })).status).toBe('gray');
});

test('weight_gain target is a surplus band and normalizes', () => {
  const p: any = { ...profile, goal: 'weight_gain' };
  const t = calorieTarget(p)!;
  expect(t.low).toBeGreaterThan(estimateTDEE(p)!);
  const { normalizeGoal } = require('../../storage/profile');
  expect(normalizeGoal('weight_gain')).toBe('weight_gain');
  expect(normalizeGoal('unknown')).toBe('maintain');
});
