import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { getCurrentPlan, unconfirmDay, WeeklyPlan } from '../api/weeklyPlan';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type ScreenRouteProp = RouteProp<RootStackParamList, 'ClientMealPlan'>;

export default function ClientMealPlanScreen() {
  const route = useRoute<ScreenRouteProp>();
  const { colors } = useTheme();
  const { clientId } = route.params;

  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [unconfirming, setUnconfirming] = useState<number | null>(null);

  const loadPlan = async () => {
    try {
      const data = await getCurrentPlan(clientId);
      setPlan(data);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlan(); }, [clientId]);

  const handleUnconfirm = async (day: number) => {
    if (!plan) return;
    setUnconfirming(day);
    try {
      await unconfirmDay(plan.id, day);
      await loadPlan();
    } catch (e: any) {
      Alert.alert('Could not unlock day', e.response?.data?.error || e.message);
    } finally {
      setUnconfirming(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading client meal plan" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 }}>
        <EmptyState title="No meal plan" description="This client has no meal plan for the current week." />
      </View>
    );
  }

  const dayMeals = plan.meals.filter((m) => m.dayOfWeek === selectedDay);
  const dayConfirmed = dayMeals.length > 0 && dayMeals.every((m) => m.confirmedByUser);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Client Meal Plan</Copy>
      <Copy size="caption" tone="muted">Client: {clientId}</Copy>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DAYS.map((d, i) => {
            const confirmed = plan.meals.filter((m) => m.dayOfWeek === i).every((m) => m.confirmedByUser);
            return (
              <Chip key={i} label={`${d}${confirmed ? ' ✓' : ''}`} selected={selectedDay === i}
                accessibilityLabel={`${d}${confirmed ? ', confirmed' : ''}`}
                onPress={() => setSelectedDay(i)} />
            );
          })}
        </View>
      </ScrollView>

      {dayMeals.length === 0 && <Copy tone="muted" style={{ textAlign: 'center' }}>No meals planned for this day.</Copy>}
      {dayMeals.map((m) => (
        <Card key={m.id} style={{ padding: 14, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Copy size="caption" tone="muted" style={{ fontWeight: '700', textTransform: 'uppercase' }}>
              {m.mealType.charAt(0).toUpperCase() + m.mealType.slice(1)}
            </Copy>
            <Copy size="caption" style={{ color: colors.primary, fontWeight: '700' }}>{m.calories} kcal</Copy>
          </View>
          <Copy style={{ fontWeight: '600' }}>{m.foodName}</Copy>
          <Copy size="caption" tone="muted">{m.portionG}g · {m.proteinG}g P · {m.carbsG}g C · {m.fatG}g F</Copy>
        </Card>
      ))}

      {dayConfirmed ? (
        <Action label={unconfirming === selectedDay ? 'Unlocking…' : 'Unlock this day for client'}
          onPress={() => handleUnconfirm(selectedDay)} disabled={unconfirming === selectedDay} />
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Copy size="caption" style={{ color: colors.primary, flex: 1 }}>This day is not confirmed. Client can edit it.</Copy>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}
