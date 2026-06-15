import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { api } from '../api/client';
import { getDeviceId } from '../storage/device';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_COLORS: Record<string, string> = { breakfast: '#e8f5e9', lunch: '#e3f2fd', dinner: '#fce4ec', snack: '#fff8e1' };

interface WeeklyMeal {
  id: string;
  dayOfWeek: number;
  mealType: string;
  foodName: string;
  portionG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  prepNote?: string;
}

interface ShoppingItem {
  foodName: string;
  quantityDisplay: string;
  category?: string;
  inInventory: boolean;
}

interface PlanData {
  id: string;
  weekStartDate: string;
  caloriesTarget: number;
  proteinTarget: number;
  explanation?: string;
  meals: WeeklyMeal[];
  shoppingList?: { items: ShoppingItem[] };
}

export default function WeeklyPlanScreen() {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [tab, setTab] = useState<'meals' | 'shopping'>('meals');

  const loadPlan = async () => {
    try {
      const userId = await getDeviceId();
      const res = await api.get('/weekly-plan/current', { headers: { 'x-user-id': userId } });
      setPlan(res.data);
      setError(null);
    } catch (e: any) {
      if (e.response?.status === 404) {
        setPlan(null);
      } else {
        setError(e.response?.data?.error || e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlan(); }, []);

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const userId = await getDeviceId();
      const today = new Date();
      const day = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((day + 6) % 7));
      const weekStartDate = monday.toISOString().slice(0, 10);

      await api.post('/weekly-plan/generate', {
        weekStartDate,
        caloriesTarget: 2200,
        proteinTarget: 150,
        carbsTarget: 250,
        fatTarget: 70,
        fiberTarget: 30,
      }, { headers: { 'x-user-id': userId } });

      await loadPlan();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No meal plan yet</Text>
        <Text style={styles.emptyDesc}>Generate a personalized 7-day meal plan based on your goals, conditions, and preferences.</Text>
        <Pressable style={styles.generateBtn} onPress={generatePlan} disabled={generating}>
          <Text style={styles.generateBtnText}>{generating ? 'Generating...' : 'Generate Weekly Plan'}</Text>
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  const dayMeals = plan.meals.filter((m) => m.dayOfWeek === selectedDay);
  const dayCalories = dayMeals.reduce((s, m) => s + m.calories, 0);
  const dayProtein = dayMeals.reduce((s, m) => s + m.proteinG, 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {plan.explanation && (
        <View style={styles.explanationCard}>
          <Text style={styles.explanationText}>{plan.explanation}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable style={[styles.tabBtn, tab === 'meals' && styles.tabActive]} onPress={() => setTab('meals')}>
          <Text style={[styles.tabText, tab === 'meals' && styles.tabTextActive]}>Meals</Text>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === 'shopping' && styles.tabActive]} onPress={() => setTab('shopping')}>
          <Text style={[styles.tabText, tab === 'shopping' && styles.tabTextActive]}>Shopping List</Text>
        </Pressable>
      </View>

      {tab === 'meals' && (
        <>
          {/* Day selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={styles.dayRow}>
              {DAYS.map((d, i) => (
                <Pressable key={i} style={[styles.dayBtn, selectedDay === i && styles.dayBtnActive]} onPress={() => setSelectedDay(i)}>
                  <Text style={[styles.dayText, selectedDay === i && styles.dayTextActive]}>{d}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Day summary */}
          <View style={styles.daySummary}>
            <Text style={styles.daySummaryText}>{dayCalories} kcal · {dayProtein}g protein</Text>
          </View>

          {/* Meals for selected day */}
          {dayMeals.length === 0 && <Text style={styles.muted}>No meals planned for this day.</Text>}
          {dayMeals.map((m) => (
            <View key={m.id} style={[styles.mealCard, { backgroundColor: MEAL_COLORS[m.mealType] || '#f7f7f9' }]}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealType}>{m.mealType.charAt(0).toUpperCase() + m.mealType.slice(1)}</Text>
                <Text style={styles.mealCals}>{m.calories} kcal</Text>
              </View>
              <Text style={styles.mealName}>{m.foodName}</Text>
              <Text style={styles.mealMacros}>{m.portionG}g · {m.proteinG}g P · {m.carbsG}g C · {m.fatG}g F</Text>
              {m.prepNote && <Text style={styles.prepNote}>{m.prepNote}</Text>}
            </View>
          ))}
        </>
      )}

      {tab === 'shopping' && (
        <>
          {!plan.shoppingList || plan.shoppingList.items.length === 0 ? (
            <Text style={styles.muted}>No shopping list generated.</Text>
          ) : (
            plan.shoppingList.items.map((item, i) => (
              <View key={i} style={[styles.shopItem, item.inInventory && styles.shopItemOwned]}>
                <View>
                  <Text style={styles.shopName}>{item.foodName}</Text>
                  {item.category && <Text style={styles.shopCategory}>{item.category}</Text>}
                </View>
                <Text style={styles.shopQty}>{item.quantityDisplay}</Text>
              </View>
            ))
          )}
        </>
      )}

      {/* Regenerate */}
      <Pressable style={styles.regenBtn} onPress={generatePlan} disabled={generating}>
        <Text style={styles.regenText}>{generating ? 'Generating...' : 'Regenerate Plan'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  generateBtn: { backgroundColor: '#1e6fb8', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#c0392b', marginTop: 12, fontSize: 13 },
  muted: { color: '#888', textAlign: 'center', marginTop: 10 },
  explanationCard: { backgroundColor: '#eef4fb', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#c5ddf5' },
  explanationText: { fontSize: 13, color: '#1a4a7a', lineHeight: 19 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#e5e5ea', alignItems: 'center' },
  tabActive: { backgroundColor: '#1e6fb8' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  dayRow: { flexDirection: 'row', gap: 6 },
  dayBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e5ea' },
  dayBtnActive: { backgroundColor: '#1e6fb8' },
  dayText: { fontSize: 13, fontWeight: '600', color: '#666' },
  dayTextActive: { color: '#fff' },
  daySummary: { backgroundColor: '#f0f4f8', borderRadius: 8, padding: 8, alignItems: 'center', marginBottom: 4 },
  daySummaryText: { fontSize: 13, fontWeight: '600', color: '#444' },
  mealCard: { borderRadius: 10, padding: 12, gap: 2, borderWidth: 1, borderColor: '#e5e5ea' },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealType: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: '#888' },
  mealCals: { fontSize: 12, fontWeight: '700', color: '#1e6fb8' },
  mealName: { fontSize: 15, fontWeight: '600', color: '#222' },
  mealMacros: { fontSize: 12, color: '#666' },
  prepNote: { fontSize: 11, color: '#1a4a7a', fontStyle: 'italic', marginTop: 2 },
  shopItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5ea' },
  shopItemOwned: { opacity: 0.5 },
  shopName: { fontSize: 14, fontWeight: '600', color: '#222' },
  shopCategory: { fontSize: 11, color: '#888' },
  shopQty: { fontSize: 14, fontWeight: '700', color: '#1e6fb8' },
  regenBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#1e6fb8', alignItems: 'center' },
  regenText: { color: '#1e6fb8', fontWeight: '600', fontSize: 14 },
});
