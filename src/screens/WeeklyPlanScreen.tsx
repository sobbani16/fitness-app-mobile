import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCurrentPlan,
  generatePlan as apiGeneratePlan,
  confirmDay,
  getMealAlternatives,
  swapMeal,
  generateShoppingList,
  getShoppingList,
  toggleShoppingItem,
  WeeklyMeal,
  WeeklyPlan,
  Recipe,
  ShoppingItem,
} from '../api/weeklyPlan';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_COLORS: Record<string, string> = { breakfast: '#e8f5e9', lunch: '#e3f2fd', dinner: '#fce4ec', snack: '#fff8e1' };

function isDayConfirmed(meals: WeeklyMeal[], day: number) {
  const dayMeals = meals.filter((m) => m.dayOfWeek === day);
  return dayMeals.length > 0 && dayMeals.every((m) => m.confirmedByUser);
}

export default function WeeklyPlanScreen() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [tab, setTab] = useState<'meals' | 'shopping'>('meals');
  const [confirmingDay, setConfirmingDay] = useState<number | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<WeeklyMeal | null>(null);
  const [swapOptions, setSwapOptions] = useState<Recipe[]>([]);
  const [swapVisible, setSwapVisible] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [generatingList, setGeneratingList] = useState(false);
  const [togglingItem, setTogglingItem] = useState<string | null>(null);

  const loadPlan = async () => {
    try {
      const data = await getCurrentPlan();
      setPlan(data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlan(); }, []);

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const today = new Date();
      const day = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((day + 6) % 7));
      const weekStartDate = monday.toISOString().slice(0, 10);

      await apiGeneratePlan({
        weekStartDate,
        caloriesTarget: 2200,
        proteinTarget: 150,
        carbsTarget: 250,
        fatTarget: 70,
        fiberTarget: 30,
      });

      await loadPlan();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not generate plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmDay = async (day: number) => {
    if (!plan) return;
    setConfirmingDay(day);
    try {
      await confirmDay(plan.id, day);
      await loadPlan();
    } catch (e: any) {
      Alert.alert('Could not confirm day', e?.response?.data?.error || e?.message || 'Unknown error');
    } finally {
      setConfirmingDay(null);
    }
  };

  const openSwapSheet = async (meal: WeeklyMeal) => {
    if (!plan) return;
    if (isDayConfirmed(plan.meals, meal.dayOfWeek)) {
      Alert.alert('Day confirmed', 'This day is confirmed. Contact your trainer to make changes.');
      return;
    }
    setSelectedMeal(meal);
    setSwapVisible(true);
    try {
      const alternatives = await getMealAlternatives(meal.id);
      setSwapOptions(alternatives);
    } catch (e: any) {
      Alert.alert('Could not load alternatives', e?.response?.data?.error || e?.message || 'Unknown error');
      setSwapVisible(false);
    }
  };

  const handleSwap = async (recipe: Recipe) => {
    if (!selectedMeal) return;
    setSwapping(true);
    try {
      await swapMeal(selectedMeal.id, recipe.id);
      await loadPlan();
      setSwapVisible(false);
      setSelectedMeal(null);
      setSwapOptions([]);
    } catch (e: any) {
      Alert.alert('Could not swap meal', e?.response?.data?.error || e?.message || 'Unknown error');
    } finally {
      setSwapping(false);
    }
  };

  const handleGenerateShoppingList = async () => {
    if (!plan) return;
    setGeneratingList(true);
    try {
      await generateShoppingList(plan.id);
      const list = await getShoppingList(plan.id);
      setPlan({ ...plan, shoppingList: list });
    } catch (e: any) {
      Alert.alert('Could not generate shopping list', e?.response?.data?.error || e?.message || 'Unknown error');
    } finally {
      setGeneratingList(false);
    }
  };

  const handleToggleItem = async (item: ShoppingItem) => {
    setTogglingItem(item.id);
    try {
      await toggleShoppingItem(item.id, !item.checked);
      if (!plan) return;
      const list = await getShoppingList(plan.id);
      setPlan({ ...plan, shoppingList: list });
    } catch (e: any) {
      Alert.alert('Could not update item', e?.response?.data?.error || e?.message || 'Unknown error');
    } finally {
      setTogglingItem(null);
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
  const dayConfirmed = isDayConfirmed(plan.meals, selectedDay);
  const allDaysConfirmed = plan.meals.length > 0 && DAYS.every((_, i) => isDayConfirmed(plan.meals, i));

  const sortedItems = plan.shoppingList
    ? [...plan.shoppingList.items].sort((a, b) => (a.checked === b.checked ? a.foodName.localeCompare(b.foodName) : a.checked ? 1 : -1))
    : [];

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        {plan.explanation && (
          <View style={styles.explanationCard}>
            <Text style={styles.explanationText}>{plan.explanation}</Text>
          </View>
        )}

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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={styles.dayRow}>
                {DAYS.map((d, i) => {
                  const confirmed = isDayConfirmed(plan.meals, i);
                  return (
                    <Pressable key={i} style={[styles.dayBtn, selectedDay === i && styles.dayBtnActive, confirmed && styles.dayBtnConfirmed]} onPress={() => setSelectedDay(i)}>
                      {confirmed && <Ionicons name="checkmark-circle" size={14} color="#2e7d32" style={{ marginRight: 2 }} />}
                      <Text style={[styles.dayText, selectedDay === i && styles.dayTextActive]}>{d}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.daySummary}>
              <Text style={styles.daySummaryText}>{dayCalories} kcal · {dayProtein}g protein</Text>
            </View>

            {dayMeals.length === 0 && <Text style={styles.muted}>No meals planned for this day.</Text>}
            {dayMeals.map((m) => (
              <Pressable key={m.id} onPress={() => openSwapSheet(m)} style={[styles.mealCard, { backgroundColor: MEAL_COLORS[m.mealType] || '#f7f7f9' }, dayConfirmed && styles.mealCardLocked]}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealType}>{m.mealType.charAt(0).toUpperCase() + m.mealType.slice(1)}</Text>
                  <Text style={styles.mealCals}>{m.calories} kcal</Text>
                </View>
                <Text style={styles.mealName}>{m.foodName}</Text>
                <Text style={styles.mealMacros}>{m.portionG}g · {m.proteinG}g P · {m.carbsG}g C · {m.fatG}g F</Text>
                {m.prepNote && <Text style={styles.prepNote}>{m.prepNote}</Text>}
                <Text style={styles.swapHint}>Tap to swap</Text>
              </Pressable>
            ))}

            {dayConfirmed ? (
              <View style={styles.lockedBanner}>
                <Ionicons name="lock-closed" size={16} color="#2e7d32" />
                <Text style={styles.lockedText}>This day is confirmed. Contact your trainer to make changes.</Text>
              </View>
            ) : (
              <Pressable style={styles.confirmBtn} onPress={() => handleConfirmDay(selectedDay)} disabled={confirmingDay === selectedDay}>
                <Text style={styles.confirmBtnText}>{confirmingDay === selectedDay ? 'Confirming...' : 'Good with this day'}</Text>
              </Pressable>
            )}
          </>
        )}

        {tab === 'shopping' && (
          <>
            {(!plan.shoppingList || plan.shoppingList.items.length === 0) && (
              <View style={styles.emptyList}>
                <Text style={styles.muted}>No shopping list generated.</Text>
                {allDaysConfirmed ? (
                  <Pressable style={styles.generateListBtn} onPress={handleGenerateShoppingList} disabled={generatingList}>
                    <Text style={styles.generateListText}>{generatingList ? 'Generating...' : 'Generate Shopping List'}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.muted}>Confirm all 7 days to generate the list.</Text>
                )}
              </View>
            )}

            {sortedItems.map((item) => (
              <TouchableOpacity key={item.id} style={[styles.shopItem, item.checked && styles.shopItemChecked]} onPress={() => handleToggleItem(item)} disabled={togglingItem === item.id}>
                <Ionicons name={item.checked ? 'checkbox' : 'square-outline'} size={22} color={item.checked ? '#2e7d32' : '#888'} />
                <View style={styles.shopItemBody}>
                  <Text style={[styles.shopName, item.checked && styles.shopNameChecked]}>{item.foodName}</Text>
                  {item.category && <Text style={styles.shopCategory}>{item.category}</Text>}
                </View>
                <Text style={styles.shopQty}>{item.quantityDisplay}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <Pressable style={styles.regenBtn} onPress={generatePlan} disabled={generating}>
          <Text style={styles.regenText}>{generating ? 'Generating...' : 'Regenerate Plan'}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={swapVisible} animationType="slide" transparent onRequestClose={() => setSwapVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Swap {selectedMeal?.mealType}</Text>
              <Pressable onPress={() => setSwapVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            <Text style={styles.modalSub}>Pick an alternative with a similar calorie target</Text>

            {swapOptions.length === 0 ? (
              <ActivityIndicator style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {swapOptions.map((recipe) => (
                  <Pressable key={recipe.id} style={styles.swapOption} onPress={() => handleSwap(recipe)} disabled={swapping}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.swapOptionName}>{recipe.recipeName}</Text>
                      <Text style={styles.swapOptionMacros}>{recipe.calories} kcal · {recipe.proteinG}g P · {recipe.carbsG}g C · {recipe.fatG}g F</Text>
                      {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <Text style={styles.swapOptionIngredients} numberOfLines={1}>
                          {recipe.ingredients.map((i) => i.ingredientName).join(', ')}
                        </Text>
                      )}
                    </View>
                    {swapping ? <ActivityIndicator size="small" /> : <Ionicons name="chevron-forward" size={18} color="#1e6fb8" />}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
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
  shopName: { fontSize: 14, fontWeight: '600', color: '#222' },
  shopCategory: { fontSize: 11, color: '#888' },
  shopQty: { fontSize: 14, fontWeight: '700', color: '#1e6fb8' },
  regenBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#1e6fb8', alignItems: 'center' },
  regenText: { color: '#1e6fb8', fontWeight: '600', fontSize: 14 },
  dayBtnConfirmed: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#2e7d32', flexDirection: 'row', alignItems: 'center' },
  mealCardLocked: { opacity: 0.85 },
  swapHint: { fontSize: 11, color: '#1e6fb8', marginTop: 4, fontWeight: '500' },
  lockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e8f5e9', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#2e7d32' },
  lockedText: { fontSize: 13, color: '#2e7d32', flex: 1 },
  confirmBtn: { backgroundColor: '#2e7d32', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyList: { alignItems: 'center', gap: 10, marginVertical: 20 },
  generateListBtn: { backgroundColor: '#1e6fb8', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  generateListText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  shopItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5ea' },
  shopItemChecked: { opacity: 0.6 },
  shopItemBody: { flex: 1 },
  shopNameChecked: { textDecorationLine: 'line-through', color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSub: { fontSize: 13, color: '#666', marginBottom: 12 },
  swapOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5ea' },
  swapOptionName: { fontSize: 15, fontWeight: '600', color: '#222' },
  swapOptionMacros: { fontSize: 12, color: '#666', marginTop: 2 },
  swapOptionIngredients: { fontSize: 11, color: '#888', marginTop: 2 },
});
