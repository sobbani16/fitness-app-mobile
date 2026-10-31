// Deterministic, explainable daily insight. Rules only describe logged data —
// never inferred intake, health, or what the user "should have" done.

export interface TodayInsightInput {
  mealsLogged: number;
  mealsWithMissingNutrition: boolean;
  caloriesLogged: number | null;
  proteinLogged: number | null;
  waterMl: number | null;
  waterMlTarget: number | null;
  proteinTarget: number | null;
  now?: Date;
}

export interface TodayInsight {
  finding: string;
  evidence: string;
  reason: string;
  actionLabel: string;
  action: 'meal' | 'water' | 'diary' | 'none';
}

export function todayInsight(input: TodayInsightInput): TodayInsight {
  const { mealsLogged, mealsWithMissingNutrition, proteinLogged, waterMl, waterMlTarget, proteinTarget } = input;
  const hour = (input.now ?? new Date()).getHours();

  if (mealsLogged === 0) {
    return {
      finding: 'Your diary is empty so far',
      evidence: 'No meals or drinks logged today',
      reason: 'Logged food is what makes the targets and insights on this screen meaningful.',
      actionLabel: 'Log a meal',
      action: 'meal',
    };
  }
  if (waterMl != null && waterMlTarget != null && hour >= 12 && waterMl < waterMlTarget / 2) {
    return {
      finding: 'Water is behind your usual pace',
      evidence: `${waterMl.toLocaleString()} of ${waterMlTarget.toLocaleString()} ml logged after midday`,
      reason: 'This reflects your own target and logs — it is not a hydration measurement.',
      actionLabel: '+250 ml water',
      action: 'water',
    };
  }
  if (proteinLogged != null && proteinTarget != null && hour >= 15 && proteinLogged < proteinTarget * 0.4) {
    return {
      finding: 'Logged protein is low for this point in the day',
      evidence: `${Math.round(proteinLogged)} g logged of a ${Math.round(proteinTarget)} g target`,
      reason: 'Only logged meals count here — unlogged food does not appear.',
      actionLabel: 'Review your diary',
      action: 'diary',
    };
  }
  if (mealsWithMissingNutrition) {
    return {
      finding: 'Some meals are missing nutrition values',
      evidence: `${mealsLogged} meal${mealsLogged === 1 ? '' : 's'} logged, at least one without complete nutrients`,
      reason: 'Totals on this screen only reflect meals with recorded values.',
      actionLabel: 'Review your diary',
      action: 'diary',
    };
  }
  return {
    finding: 'Logging is underway',
    evidence: `${mealsLogged} meal${mealsLogged === 1 ? '' : 's'} logged today`,
    reason: 'Based on your logged meals — not an AI or medical assessment.',
    actionLabel: 'Open food diary',
    action: 'diary',
  };
}
