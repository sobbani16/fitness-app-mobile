import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Action, Card, Copy } from '../design/components';
import { getProgressOpportunities, getStreak, ProgressOpportunity, StreakInfo } from '../api/dailyProgress';
import { RootStackParamList } from '../navigation/RootNavigator';

// LogExercise/MindHome live inside MainTabs — nested navigate resolves them.
const NEXT_ROUTE: Record<string, string> = {
  LogMeal: 'FoodEntry', LogExercise: 'LogExercise', MindHome: 'MindHome',
  Dashboard: 'Main', DailyProgressDetail: 'DailyProgressDetail',
};

// Compact coach card: real opportunities only — projected points come from the
// backend's component recomputation, never optimistic client increments.
export default function ProgressCoachCard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [top, setTop] = useState<ProgressOpportunity[]>([]);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  useEffect(() => {
    getProgressOpportunities().then(r => setTop(r.top)).catch(() => setTop([]));
    getStreak().then(setStreak).catch(() => setStreak(null));
  }, []);

  if (!top.length && !streak) return null;
  const first = top[0];
  return <Card>
    {streak != null && <Copy size="caption" tone="muted">
      {streak.todayQualified ? 'Today’s consistency goal is met' : streak.explanation}
      {streak.current > 0 ? ` · ${streak.current}-day run` : ''}
    </Copy>}
    {first && <>
      <Copy>{first.title}</Copy>
      <Copy size="caption" tone="muted">Up to +{first.projectedPoints} progress points · {first.explanation}</Copy>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Action label={first.actionType === 'LOG_WATER' ? 'Log water' : first.actionType === 'COMPLETE_WORKOUT' ? 'Start workout' : first.actionType === 'LOG_MEAL' ? 'Log food' : 'Open'}
          onPress={() => navigation.navigate((NEXT_ROUTE[first.suggestedNext] || 'DailyProgressDetail') as never)} />
        <Action secondary label="Details" onPress={() => navigation.navigate('DailyProgressDetail')} />
      </View>
      {top.length > 1 && <Action secondary label="See more ways to progress" onPress={() => navigation.navigate('DailyProgressDetail')} />}
    </>}
    {!first && streak != null && <Copy size="caption" tone="muted">Everything applicable today is done.</Copy>}
  </Card>;
}
