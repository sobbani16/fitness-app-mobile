// Versioned, deterministic daily assessment rules.
// Every colored calendar day derives from these rules — no opaque scoring.
// Core safety rules:
//   * Missing logs are never treated as zero intake.
//   * A very low logged day is never a green weight-loss day.
//   * Rest days (no workout) are valid; only a *streak* of inactivity is flagged.
//   * Same date can be green for workouts and red for nutrition.

import type { ProgressDay } from './progress';
import type { Goal } from '../storage/profile';
import { calorieTarget, proteinTargetG } from './energy';

export const ASSESSMENT_RULE_VERSION = 'day-assessment.v1';

export type CalendarView = 'nutrition' | 'workouts' | 'overall';
export type DayStatus = 'green' | 'yellow' | 'red' | 'gray';

export interface DayAssessment {
  status: DayStatus;
  reasons: string[];
  missing: string[];      // evidence not recorded
  nextStep: string;
  ruleVersion: string;
  provisional: boolean;   // true when evaluating today (data still accruing)
}

export interface AssessmentContext {
  goal: Goal;
  view: CalendarView;
  target: { low: number; high: number } | null;   // from calorieTarget(profile)
  proteinTarget: number | null;
  profile: Parameters<typeof calorieTarget>[0];
  isToday: boolean;
  consecutiveInactiveDays: number;   // days before this one with no workout
  /** Schedule context — nulls mean no plan configured (never penalized). */
  plannedWorkout?: boolean | null;
  plannedRest?: boolean | null;
}

const PROVISIONAL: Omit<DayAssessment, 'status' | 'reasons' | 'missing' | 'nextStep'> = { ruleVersion: ASSESSMENT_RULE_VERSION, provisional: false };

function nutritionReasons(ctx: AssessmentContext, d: ProgressDay): { score: DayStatus; reasons: string[]; missing: string[]; nextStep: string } {
  const reasons: string[] = [], missing: string[] = [];
  if (!d.mealCount) { missing.push('food log'); return { score: 'gray' as DayStatus, reasons: ['No food records for this day'], missing, nextStep: 'Log what you ate to get a nutrition assessment.' }; }
  if (d.calories == null) { missing.push('calories'); return { score: 'gray' as DayStatus, reasons: ['Meals logged without calorie data'], missing, nextStep: 'Add portions or pick measured entries for a reliable total.' }; }
  const t = ctx.target;
  if (!t) return { score: 'yellow' as DayStatus, reasons: ['Calories recorded; complete your profile for a target range'], missing, nextStep: 'Complete profile details to get a personalized target.' };

  const kcal = d.calories;
  const protein = d.protein;
  // Extreme restriction is never green — even for weight-loss goals.
  const bmrFloor = t.low * 0.75;
  if (kcal < bmrFloor) {
    return { score: 'red' as DayStatus, reasons: [`Logged ${Math.round(kcal)} kcal — well below a safe range for any goal`], missing, nextStep: 'This looks like under-eating or incomplete logging. Check entries and eat adequately.' };
  }
  const goal = ctx.goal;
  if ((goal === 'weight_loss' || goal === 'body_recomposition') && kcal <= t.high) {
    if (kcal >= t.low) {
      const proteinOk = ctx.proteinTarget == null || protein == null || protein >= ctx.proteinTarget * 0.7;
      return { score: proteinOk ? 'green' : 'yellow', reasons: [`${Math.round(kcal)} kcal in your estimated deficit range (${t.low}–${t.high})`, proteinOk ? '' : 'Protein looks low for preserving muscle'].filter(Boolean) as string[], missing, nextStep: proteinOk ? 'Keep it up.' : 'Add a protein-rich meal.' };
    }
    return { score: 'yellow' as DayStatus, reasons: [`${Math.round(kcal)} kcal logged — below your estimated target range`], missing, nextStep: 'If you ate more, log it; sustained deficits below the range are not the goal.' };
  }
  if (goal === 'muscle_gain' || goal === 'maintain' || goal === 'weight_gain' as Goal) {
    if (kcal >= t.low && kcal <= t.high) return { score: 'green' as DayStatus, reasons: [`${Math.round(kcal)} kcal within your ${goal === 'muscle_gain' ? 'gain' : 'maintenance'} range (${t.low}–${t.high})`], missing, nextStep: 'On track.' };
    const off = kcal > t.high ? 'above' : 'below';
    const severe = kcal > t.high * 1.3 || kcal < t.low * 0.8;
    return { score: severe ? 'red' : 'yellow', reasons: [`${Math.round(kcal)} kcal ${off} your target range (${t.low}–${t.high})`], missing, nextStep: goal === 'muscle_gain' ? 'Adjust portions toward your surplus range.' : 'Aim closer to your maintenance range over the week.' };
  }
  if (goal === 'weight_loss' && kcal > t.high) {
    const severe = kcal > t.high * 1.25;
    return { score: severe ? 'red' : 'yellow', reasons: [`${Math.round(kcal)} kcal above your estimated deficit range`], missing, nextStep: 'One day is fine — check portions and keep logging.' };
  }
  return { score: 'yellow' as DayStatus, reasons: [`${Math.round(kcal)} kcal recorded; outside typical range for your goal`], missing, nextStep: 'Keep logging — trends matter more than single days.' };
}

function workoutReasons(ctx: AssessmentContext, d: ProgressDay): { score: DayStatus; reasons: string[]; missing: string[]; nextStep: string } {
  const done = (d.workouts ?? 0) > 0;
  if (done) return { score: 'green' as DayStatus, reasons: [`${d.workouts} workout session${d.workouts! > 1 ? 's' : ''} recorded`], missing: [] as string[], nextStep: 'Logged — remember to rest and recover.' };
  if (ctx.plannedRest) return { score: 'green' as DayStatus, reasons: ['Planned rest day — recovery is part of the plan'], missing: [], nextStep: 'Rest well.' };
  if (ctx.isToday) return { score: 'gray' as DayStatus, reasons: ['No workout logged yet today'], missing: ['workout'], nextStep: 'Planned session? Log it when done — or take a rest day.' };
  if (ctx.plannedWorkout) return { score: 'yellow' as DayStatus, reasons: ['A workout was scheduled but none is recorded — it may have been skipped, moved, or unlogged'], missing: [], nextStep: 'Log the session if you trained, or adjust your plan.' };
  if (ctx.plannedWorkout === false) return { score: 'gray' as DayStatus, reasons: ['Not a scheduled training day'], missing: [], nextStep: 'Optional rest or activity.' };
  if (ctx.consecutiveInactiveDays >= 3) return { score: 'red' as DayStatus, reasons: [`${ctx.consecutiveInactiveDays + 1} consecutive days without a recorded workout`], missing: [] as string[], nextStep: 'Consider a short session or confirm these are planned rest days.' };
  if (ctx.consecutiveInactiveDays >= 1) return { score: 'yellow' as DayStatus, reasons: ['No workout recorded — could be a planned rest day'], missing: ['workout'], nextStep: 'Rest is part of training; log a session when you train.' };
  return { score: 'gray' as DayStatus, reasons: ['No workout recorded'], missing: ['workout'], nextStep: 'Rest day or unlogged session.' };
}

export function assessDay(d: ProgressDay, ctx: AssessmentContext): DayAssessment {
  let result: { score: DayStatus; reasons: string[]; missing: string[]; nextStep: string };
  if (ctx.view === 'nutrition') result = nutritionReasons(ctx, d);
  else if (ctx.view === 'workouts') result = workoutReasons(ctx, d);
  else {
    // Overall: both lenses must pass; worst status wins, but missing
    // nutrition data never downgrades a completed workout day to red.
    const n = nutritionReasons(ctx, d), w = workoutReasons(ctx, d);
    if (n.score === 'gray' && w.score === 'gray') result = { score: 'gray' as DayStatus, reasons: ['No food or workout records'], missing: [...n.missing, ...w.missing], nextStep: 'Log your day to see an assessment.' };
    else if (n.score === 'gray') result = { ...w, missing: [...w.missing, ...n.missing] };
    else if (w.score === 'gray') result = { ...n, missing: [...n.missing, ...w.missing] };
    else {
      const order: DayStatus[] = ['green', 'yellow', 'red'];
      const worst: DayStatus = order[Math.max(order.indexOf(n.score), order.indexOf(w.score))];
      result = { score: worst, reasons: [...w.reasons, ...n.reasons], missing: [...n.missing, ...w.missing], nextStep: worst === 'green' ? 'On track across food and activity.' : (n.score !== 'green' ? n.nextStep : w.nextStep) };
    }
  }
  return { ...PROVISIONAL, status: result.score, reasons: result.reasons, missing: result.missing, nextStep: result.nextStep, provisional: ctx.isToday };
}
