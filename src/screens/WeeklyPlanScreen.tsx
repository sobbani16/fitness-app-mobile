import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import WeeklyPreferences, { Chip } from '../components/WeeklyPreferences';
import { Ionicons } from '@expo/vector-icons';
import { Action, Card, Copy, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
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

function isDayConfirmed(meals: WeeklyMeal[], day: number) {
  const dayMeals = meals.filter((m) => m.dayOfWeek === day);
  return dayMeals.length > 0 && dayMeals.every((m) => m.confirmedByUser);
}

export default function WeeklyPlanScreen() {
  const { colors } = useTheme();
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
      const weekStartDate = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
      await apiGeneratePlan({ weekStartDate });

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

  if (loading) return <View style={styles.center}><Skeleton label="Loading weekly plan" /></View>;

  if (!plan) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <WeeklyPreferences disabled={generating} />
        <Card>
          <Copy accessibilityRole="header" size="title" style={{ fontWeight: '600' }}>No meal plan yet</Copy>
          <Copy tone="muted">Generate a 7-day plan from sourced ingredients using your saved nutrition targets and preferences.</Copy>
          <Action label={generating ? 'Generating…' : 'Generate weekly plan'} onPress={generatePlan} disabled={generating} />
          {!!error && <Copy tone="danger" size="caption">{error}</Copy>}
        </Card>
      </ScrollView>
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
  const aiPlan = plan.generationDetails?.source === 'ai_generated';
  const aiIngredientsFor = (m: WeeklyMeal) => plan.generationDetails?.ai?.ingredients
    .find(x => x.dayOfWeek === m.dayOfWeek && x.mealType === m.mealType)?.ingredients ?? [];
  const aiWarningsFor = (m: WeeklyMeal) => plan.generationDetails?.conditions?.mealWarnings
    .find(x => x.dayOfWeek === m.dayOfWeek && x.mealType === m.mealType)?.warnings ?? [];
  const dayWarnings = (d?: { warnings: string[]; deviations: Record<string, number> }) =>
    (d?.warnings ?? []).map(k => d!.deviations[k] !== undefined ? `${k}: ${d!.deviations[k]}%` : k).join(', ');

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <WeeklyPreferences disabled={generating} />
        {!!error && <Copy tone="danger" size="caption">{error}</Copy>}
        {!!plan.explanation && (
          <Card><Copy size="caption" tone="muted">{plan.explanation}</Copy></Card>
        )}

        <View style={styles.tabRow}>
          <View style={{ flex: 1 }}><Action secondary selected={tab === 'meals'} label="Meals" onPress={() => setTab('meals')} /></View>
          <View style={{ flex: 1 }}><Action secondary selected={tab === 'shopping'} label="Shopping list" onPress={() => setTab('shopping')} /></View>
        </View>

        {tab === 'meals' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={styles.dayRow}>
                {DAYS.map((d, i) => {
                  const confirmed = isDayConfirmed(plan.meals, i);
                  return <Chip key={i} label={`${d}${confirmed ? ' ✓' : ''}`} selected={selectedDay === i}
                    onPress={() => setSelectedDay(i)} />;
                })}
              </View>
            </ScrollView>

            <Card>
              <Copy style={{ fontWeight: '600' }}>{Math.round(dayCalories)} / {plan.caloriesTarget} kcal · {Math.round(dayProtein)} / {plan.proteinTarget}g protein</Copy>
              <Copy size="caption" tone="muted">Estimated totals per person</Copy>
              {!!plan.generationDetails?.days[selectedDay]?.warnings.length && <Copy tone="danger" size="caption">Review: {dayWarnings(plan.generationDetails.days[selectedDay])}</Copy>}
              {(plan.generationDetails?.conditions?.unverified ?? []).map((n, i) => <Copy key={i} size="caption" style={{ color: colors.warning }}>{n}</Copy>)}
            </Card>

            {dayMeals.length === 0 && <Copy tone="muted" style={{ textAlign: 'center' }}>No meals planned for this day.</Copy>}
            {dayMeals.map((m) => (
              <Pressable key={m.id} onPress={() => openSwapSheet(m)} accessibilityRole="button"
                accessibilityLabel={`${m.mealType}: ${m.foodName}. Tap for alternatives.`}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : dayConfirmed ? 0.85 : 1 })}>
                <Card>
                  <View style={styles.mealHeader}>
                    <Copy size="caption" tone="muted" style={{ fontWeight: '700', textTransform: 'uppercase' }}>{m.mealType}</Copy>
                    <Copy size="caption" style={{ fontWeight: '700', color: colors.primary }}>{m.calories} kcal</Copy>
                  </View>
                  <View style={styles.mealHeader}>
                    <Copy style={{ fontWeight: '600', flex: 1 }}>{m.foodName}</Copy>
                    {!dayConfirmed && <Ionicons name="swap-horizontal" size={16} color={colors.primary} />}
                  </View>
                  <Copy size="caption" tone="muted">{m.portionG}g · {m.proteinG}g P · {m.carbsG}g C · {m.fatG}g F</Copy>
                  {!!m.prepNote && <Copy size="caption" style={{ color: colors.primary }}>{m.prepNote}</Copy>}
                  {aiIngredientsFor(m).length > 0 && <Copy size="caption" tone="muted">{aiIngredientsFor(m).map(i => `${i.name} ${i.grams}g`).join(' · ')}</Copy>}
                  {aiWarningsFor(m).map((w, i) => <Copy key={i} size="caption" style={{ color: colors.warning }}>{w}</Copy>)}
                  <Copy size="caption" tone="muted">{m.recipe?.nutritionSource ? 'Nutrition calculated from USDA ingredients' : aiPlan ? 'AI estimate — not verified nutrition data' : 'Estimate — source not verified'}</Copy>
                  {m.recipe?.nutritionSource?.ingredients.map(ingredient => (
                    <Copy key={ingredient.fdcId} accessibilityRole="link" size="caption" style={{ color: colors.primary, fontWeight: '500' }} onPress={() => Linking.openURL(`https://fdc.nal.usda.gov/food-details/${ingredient.fdcId}/nutrients`).catch(() => Alert.alert('Could not open source'))}>{ingredient.description} · USDA {ingredient.fdcId}</Copy>
                  ))}
                </Card>
              </Pressable>
            ))}

            {dayConfirmed ? (
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="lock-closed" size={16} color={colors.primary} />
                  <Copy size="caption" style={{ color: colors.primary, flex: 1 }}>This day is confirmed. Contact your trainer to make changes.</Copy>
                </View>
              </Card>
            ) : (
              <Action label={confirmingDay === selectedDay ? 'Confirming…' : 'Good with this day'} onPress={() => handleConfirmDay(selectedDay)} disabled={confirmingDay === selectedDay} />
            )}
          </>
        )}

        {tab === 'shopping' && (
          <>
            {(!plan.shoppingList || plan.shoppingList.items.length === 0) && (
              <Card>
                <Copy tone="muted">No shopping list generated.</Copy>
                {allDaysConfirmed
                  ? <Action label={generatingList ? 'Generating…' : 'Generate shopping list'} onPress={handleGenerateShoppingList} disabled={generatingList} />
                  : <Copy size="caption" tone="muted">Confirm all 7 days to generate the list.</Copy>}
              </Card>
            )}

            {sortedItems.map((item) => (
              <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.foodName}
                accessibilityState={{ checked: item.checked, disabled: togglingItem === item.id }}
                style={({ pressed }) => [styles.shopItem, { borderBottomColor: colors.border }, (item.checked || pressed) && { opacity: 0.6 }]}
                onPress={() => handleToggleItem(item)} disabled={togglingItem === item.id}>
                <Ionicons name={item.checked ? 'checkbox' : 'square-outline'} size={22} color={item.checked ? colors.primary : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Copy style={{ fontWeight: '600', textDecorationLine: item.checked ? 'line-through' : 'none' }}>{item.foodName}</Copy>
                  {!!item.category && <Copy size="caption" tone="muted">{item.category}</Copy>}
                </View>
                <Copy style={{ fontWeight: '700', color: colors.primary }}>{item.quantityDisplay}</Copy>
              </Pressable>
            ))}
          </>
        )}

        <Action secondary label={generating ? 'Generating…' : 'Regenerate plan'} onPress={generatePlan} disabled={generating} />
      </ScrollView>

      <Sheet visible={swapVisible} title={`Swap ${selectedMeal?.mealType || 'meal'}`} onClose={() => setSwapVisible(false)}>
        <Copy size="caption" tone="muted">Pick an alternative with a similar calorie target</Copy>
        {swapOptions.length === 0 ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          swapOptions.map((recipe) => (
            <Pressable key={recipe.id} accessibilityRole="button" accessibilityLabel={`Swap to ${recipe.recipeName}`}
              style={({ pressed }) => [styles.swapOption, { borderBottomColor: colors.border }, pressed && { opacity: 0.6 }]}
              onPress={() => handleSwap(recipe)} disabled={swapping}>
              <View style={{ flex: 1 }}>
                <Copy style={{ fontWeight: '600' }}>{recipe.recipeName}</Copy>
                <Copy size="caption" tone="muted">{recipe.calories} kcal · {recipe.proteinG}g P · {recipe.carbsG}g C · {recipe.fatG}g F</Copy>
                {!!recipe.ingredients?.length && (
                  <Copy size="caption" tone="muted" numberOfLines={1}>
                    {recipe.ingredients.map((i) => i.ingredientName).join(', ')}
                  </Copy>
                )}
              </View>
              {swapping ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.primary} />}
            </Pressable>
          ))
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  tabRow: { flexDirection: 'row', gap: 8 },
  dayRow: { flexDirection: 'row', gap: 6 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  shopItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  swapOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
