import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { getDeviceId } from '../storage/device';
import { RootStackParamList } from '../navigation/RootNavigator';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_COLORS: Record<string, string> = { breakfast: '#e8f5e9', lunch: '#e3f2fd', dinner: '#fce4ec', snack: '#fff8e1' };

type ScreenRouteProp = RouteProp<RootStackParamList, 'ClientMealPlan'>;

export default function ClientMealPlanScreen() {
  const route = useRoute<ScreenRouteProp>();
  const { clientId } = route.params;

  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [unconfirming, setUnconfirming] = useState<number | null>(null);

  const loadPlan = async () => {
    try {
      const userId = await getDeviceId();
      const res = await api.get('/weekly-plan/current', { headers: { 'x-user-id': clientId } });
      setPlan(res.data);
    } catch (e: any) {
      if (e.response?.status === 404) {
        setPlan(null);
      } else {
        Alert.alert('Error', e.response?.data?.error || e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlan(); }, [clientId]);

  const handleUnconfirm = async (day: number) => {
    if (!plan) return;
    setUnconfirming(day);
    try {
      const userId = await getDeviceId();
      await api.post(`/weekly-plan/days/${day}/unconfirm`, { planId: plan.id }, { headers: { 'x-user-id': userId } });
      await loadPlan();
    } catch (e: any) {
      Alert.alert('Could not unlock day', e.response?.data?.error || e.message);
    } finally {
      setUnconfirming(null);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!plan) return <View style={styles.center}><Text style={styles.empty}>No meal plan for this client.</Text></View>;

  const dayMeals = plan.meals.filter((m: any) => m.dayOfWeek === selectedDay);
  const dayConfirmed = dayMeals.length > 0 && dayMeals.every((m: any) => m.confirmedByUser);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Client Meal Plan</Text>
      <Text style={styles.subtitle}>Client: {clientId}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={styles.dayRow}>
          {DAYS.map((d, i) => {
            const confirmed = plan.meals.filter((m: any) => m.dayOfWeek === i).every((m: any) => m.confirmedByUser);
            return (
              <Pressable key={i} style={[styles.dayBtn, selectedDay === i && styles.dayBtnActive, confirmed && styles.dayBtnConfirmed]} onPress={() => setSelectedDay(i)}>
                {confirmed && <Ionicons name="checkmark-circle" size={14} color="#2e7d32" style={{ marginRight: 2 }} />}
                <Text style={[styles.dayText, selectedDay === i && styles.dayTextActive]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {dayMeals.map((m: any) => (
        <View key={m.id} style={[styles.mealCard, { backgroundColor: MEAL_COLORS[m.mealType] || '#f7f7f9' }]}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealType}>{m.mealType.charAt(0).toUpperCase() + m.mealType.slice(1)}</Text>
            <Text style={styles.mealCals}>{m.calories} kcal</Text>
          </View>
          <Text style={styles.mealName}>{m.foodName}</Text>
          <Text style={styles.mealMacros}>{m.portionG}g · {m.proteinG}g P · {m.carbsG}g C · {m.fatG}g F</Text>
        </View>
      ))}

      {dayConfirmed ? (
        <Pressable style={styles.unconfirmBtn} onPress={() => handleUnconfirm(selectedDay)} disabled={unconfirming === selectedDay}>
          <Text style={styles.unconfirmText}>{unconfirming === selectedDay ? 'Unlocking...' : 'Unlock this day for client'}</Text>
        </Pressable>
      ) : (
        <View style={styles.unlockedBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#1e6fb8" />
          <Text style={styles.unlockedText}>This day is not confirmed. Client can edit it.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 10 },
  empty: { fontSize: 15, color: '#888', textAlign: 'center' },
  dayRow: { flexDirection: 'row', gap: 6 },
  dayBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e5ea' },
  dayBtnActive: { backgroundColor: '#1e6fb8' },
  dayBtnConfirmed: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#2e7d32', flexDirection: 'row', alignItems: 'center' },
  dayText: { fontSize: 13, fontWeight: '600', color: '#666' },
  dayTextActive: { color: '#fff' },
  mealCard: { borderRadius: 10, padding: 12, gap: 2, borderWidth: 1, borderColor: '#e5e5ea', marginBottom: 8 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealType: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: '#888' },
  mealCals: { fontSize: 12, fontWeight: '700', color: '#1e6fb8' },
  mealName: { fontSize: 15, fontWeight: '600', color: '#222' },
  mealMacros: { fontSize: 12, color: '#666' },
  unconfirmBtn: { backgroundColor: '#1e6fb8', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  unconfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  unlockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e8f0fb', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1e6fb8' },
  unlockedText: { fontSize: 13, color: '#1e6fb8', flex: 1 },
});
