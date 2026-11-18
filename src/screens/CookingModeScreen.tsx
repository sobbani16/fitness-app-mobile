import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../design/theme';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { useMeals } from '../context/MealsContext';
import {
  RecipeDetail, RecipeLine, getRecipeDetail, setRecipeEngagement,
  addGroceryItems, customizeRecipe, CustomizeResponse,
} from '../api/cooking';

// Guided cooking: ingredient checklist → step-by-step → confirm portion → log.
// Logging goes through useMeals().add — the same offline-capable path as
// manual entry — so the recipe's nutrition snapshot rides the diary entry.
export default function CookingModeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { recipeId, missing = [], quantityAssumed = false } = route.params || {};
  const { isEnabled } = useFeatureFlags();
  const { add } = useMeals();

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [servings, setServings] = useState(1);
  const [custom, setCustom] = useState<CustomizeResponse | null>(null);
  const [customReq, setCustomReq] = useState('');
  const [customizing, setCustomizing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [favorite, setFavorite] = useState(false);

  const missingSet = useMemo(() => new Set(missing.map((m: string) => m.toLowerCase())), [missing]);

  useEffect(() => {
    let live = true;
    getRecipeDetail(recipeId)
      .then((r) => { if (live) { setRecipe(r); setServings(r.servings || 1); setFavorite(!!r.engagement?.favorite); } })
      .catch((e) => { if (live) setError(e?.response?.data?.error ?? e?.message ?? 'Could not load recipe'); });
    return () => { live = false; };
  }, [recipeId]);

  const servingsScale = recipe && recipe.servings > 0 ? servings / recipe.servings : 1;
  const lines: RecipeLine[] = custom?.proposedLines?.length
    ? custom.proposedLines.map((l) => ({ ingredientId: l.ingredientId, ingredientName: l.ingredientName, amountG: l.amountG, optional: l.optional }))
    : (recipe?.ingredients ?? []);
  const perServing = custom?.perServing ?? (recipe ? {
    calories: recipe.calories ?? 0, proteinG: recipe.proteinG ?? 0, carbsG: recipe.carbsG ?? 0,
    fatG: recipe.fatG ?? 0, fiberG: recipe.fiberG ?? null,
  } : null);
  const steps = recipe?.instructions ?? [];
  const step = steps[stepIndex];

  const askCustomize = async () => {
    if (!recipe || !customReq.trim()) return;
    setCustomizing(true);
    setError(null);
    try {
      const out = await customizeRecipe(recipe.id, { request: customReq.trim() });
      setCustom(out);
      if (out.rejected.length) Alert.alert('Some changes were not applied', out.rejected.map((r) => r.reason).join('\n'));
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.error ?? e?.message ?? 'Customization unavailable');
    } finally {
      setCustomizing(false);
    }
  };

  const sendMissingToList = async () => {
    if (!recipe) return;
    try {
      const missingLines = lines.filter((l) => missingSet.has(l.ingredientName.toLowerCase()));
      await addGroceryItems(missingLines.map((l) => ({ name: l.ingredientName, amountG: l.amountG, sourceRecipeId: recipe.id })));
      Alert.alert('Added', `${missingLines.length} item${missingLines.length === 1 ? '' : 's'} added to your grocery list.`);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Could not add to grocery list');
    }
  };

  const toggleFavorite = async () => {
    if (!recipe) return;
    const next = !favorite;
    setFavorite(next);
    try { await setRecipeEngagement(recipe.id, { favorite: next }); }
    catch { setFavorite(!next); }
  };

  const finishAndLog = useCallback(async () => {
    if (!recipe || !perServing) return;
    setLogging(true);
    try {
      const grams = recipe.portionG && recipe.portionG > 0 ? recipe.portionG * servingsScale : 100;
      await add({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        name: custom ? `${recipe.recipeName} (customized)` : recipe.recipeName,
        calories: Math.round((perServing.calories ?? 0) * servingsScale),
        macros: {
          protein_g: Math.round((perServing.proteinG ?? 0) * servingsScale * 10) / 10,
          carbs_g: Math.round((perServing.carbsG ?? 0) * servingsScale * 10) / 10,
          fat_g: Math.round((perServing.fatG ?? 0) * servingsScale * 10) / 10,
          ...(perServing.fiberG != null ? { fiber_g: Math.round(perServing.fiberG * servingsScale * 10) / 10 } : {}),
        },
        mealType: (recipe.mealType as any) || 'lunch',
        source: `recipe:${recipe.id}${custom ? ' · ai-customized' : ''}`,
        feedback: recipe.reviewStatus,
        quantityG: Math.round(grams * 10) / 10,
        nutritionSnapshot: { recipeId: recipe.id, servings, reviewStatus: recipe.reviewStatus, customized: !!custom },
      } as any);
      Alert.alert('Logged', `${recipe.recipeName} added to today's meals.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      setError(e?.message ?? 'Could not log meal');
    } finally {
      setLogging(false);
    }
  }, [recipe, perServing, servingsScale, servings, custom, add, navigation]);

  if (error && !recipe) return (
    <View style={[styles.screen, styles.center]}>
      <Text style={styles.errorText}>{error}</Text>
      <Pressable style={styles.primaryBtn} onPress={() => navigation.goBack()}><Text style={styles.primaryBtnText}>Go back</Text></Pressable>
    </View>
  );
  if (!recipe) return <View style={[styles.screen, styles.center]}><ActivityIndicator /></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{recipe.recipeName}</Text>
          <Text style={styles.muted}>
            {[recipe.cuisine, recipe.region, recipe.prepMinutes ? `~${recipe.prepMinutes} min` : null].filter(Boolean).join(' · ')}
          </Text>
          {recipe.reviewStatus !== 'VERIFIED' && <Text style={styles.badge}>Nutrition estimated</Text>}
          {!!recipe.allergens?.length && <Text style={styles.warn}>Allergens: {recipe.allergens.join(', ')}</Text>}
        </View>
        <Pressable onPress={toggleFavorite} accessibilityRole="button" accessibilityLabel={favorite ? 'Remove from favorites' : 'Save to favorites'}>
          <Text style={{ fontSize: 26 }}>{favorite ? '★' : '☆'}</Text>
        </Pressable>
      </View>

      {/* Servings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Servings</Text>
        <View style={styles.row}>
          <Pressable style={styles.stepBtn} onPress={() => setServings((s) => Math.max(1, s - 1))}><Text style={styles.stepBtnText}>−</Text></Pressable>
          <Text style={styles.servingsText}>{servings}</Text>
          <Pressable style={styles.stepBtn} onPress={() => setServings((s) => Math.min(20, s + 1))}><Text style={styles.stepBtnText}>+</Text></Pressable>
          {perServing && (
            <Text style={styles.mutedRight}>
              {Math.round((perServing.calories ?? 0) * servingsScale)} kcal · {Math.round((perServing.proteinG ?? 0) * servingsScale)}g protein
            </Text>
          )}
        </View>
        {quantityAssumed && <Text style={styles.hint}>Amounts below are recipe targets — adjust to what you actually have.</Text>}
      </View>

      {/* Ingredients */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ingredients</Text>
        {lines.map((l, i) => {
          const isMissing = missingSet.has(l.ingredientName.toLowerCase());
          return (
            <View key={`${l.ingredientName}-${i}`} style={styles.lineRow}>
              <Text style={[styles.lineText, isMissing && styles.lineMissing]}>
                {Math.round(l.amountG * servingsScale * 10) / 10} g {l.ingredientName}{l.optional ? ' (optional)' : ''}
              </Text>
              {isMissing && <Text style={styles.missTag}>missing</Text>}
            </View>
          );
        })}
        {missing.length > 0 && (
          <Pressable style={styles.secondaryBtn} onPress={sendMissingToList}>
            <Text style={styles.secondaryBtnText}>Add {missing.length} missing to grocery list</Text>
          </Pressable>
        )}
      </View>

      {/* AI customize — opt-in, flag gated */}
      {isEnabled('recipeCustomizationAi') && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customize with Leo</Text>
          <Text style={styles.hint}>e.g. "make it higher protein", "only 2 eggs", "serve 2"</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={customReq}
              onChangeText={setCustomReq}
              placeholder="Describe your change"
              returnKeyType="done"
              onSubmitEditing={askCustomize}
            />
            <Pressable style={[styles.stepBtn, customizing && { opacity: 0.5 }]} onPress={askCustomize} disabled={customizing || !customReq.trim()}>
              {customizing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.stepBtnText}>Go</Text>}
            </Pressable>
          </View>
          {custom && (
            <View style={{ marginTop: 8 }}>
              {custom.changesApplied.map((c, i) => <Text key={i} style={styles.hint}>• {c}</Text>)}
              {!!custom.notes && <Text style={styles.hint}>{custom.notes}</Text>}
              {custom.warnings.map((w, i) => <Text key={i} style={styles.warn}>{w}</Text>)}
              <Pressable onPress={() => setCustom(null)}><Text style={styles.link}>Revert to original recipe</Text></Pressable>
            </View>
          )}
        </View>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step {stepIndex + 1} of {steps.length}{step?.minutes ? ` · ~${step.minutes} min` : ''}</Text>
          {step && <Text style={styles.stepText}>{step.text}</Text>}
          {!!step?.safetyNote && <Text style={styles.warn}>⚠ {step.safetyNote}</Text>}
          <View style={[styles.row, { marginTop: 14 }]}>
            <Pressable style={[styles.navBtn, stepIndex === 0 && { opacity: 0.4 }]} disabled={stepIndex === 0} onPress={() => setStepIndex((i) => i - 1)}>
              <Text style={styles.navBtnText}>← Back</Text>
            </Pressable>
            <Pressable
              style={styles.navBtn}
              onPress={() => (stepIndex < steps.length - 1 ? setStepIndex((i) => i + 1) : finishAndLog())}
              disabled={logging}
            >
              {logging ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.navBtnText}>{stepIndex < steps.length - 1 ? 'Next →' : 'Finish & log'}</Text>}
            </Pressable>
          </View>
          {!!recipe.safetyNotes?.length && stepIndex === steps.length - 1 && (
            <View style={{ marginTop: 10 }}>
              {recipe.safetyNotes.map((s, i) => <Text key={i} style={styles.warn}>⚠ {s}</Text>)}
            </View>
          )}
        </View>
      )}

      {steps.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.hint}>Step-by-step instructions aren't available for this recipe yet.</Text>
          {perServing && (
            <Pressable style={styles.primaryBtn} onPress={finishAndLog} disabled={logging}>
              {logging ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Log this meal</Text>}
            </Pressable>
          )}
        </View>
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </ScrollView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1c1c1e' },
  muted: { fontSize: 13, color: '#777', marginTop: 2 },
  mutedRight: { marginLeft: 'auto', fontSize: 13, color: '#777' },
  badge: { fontSize: 11, color: '#8a6d1f', marginTop: 4 },
  warn: { fontSize: 12, color: '#9c5a00', marginTop: 4 },
  hint: { fontSize: 12, color: '#888', marginTop: 4 },
  link: { fontSize: 13, color: '#137C63', marginTop: 8 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { backgroundColor: '#137C63', borderRadius: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  servingsText: { fontSize: 18, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  lineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  lineText: { fontSize: 14, color: '#333', flex: 1 },
  lineMissing: { color: '#9c5a00' },
  missTag: { fontSize: 10, fontWeight: '700', color: '#9c5a00', backgroundColor: '#fdf3d8', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  stepText: { fontSize: 16, color: '#1c1c1e', lineHeight: 24 },
  navBtn: { flex: 1, backgroundColor: '#137C63', borderRadius: 10, height: 52, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  primaryBtn: { backgroundColor: '#137C63', borderRadius: 10, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { borderWidth: 1, borderColor: '#d0d0d5', borderRadius: 10, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryBtnText: { color: '#444', fontSize: 14, fontWeight: '600' },
  input: { flex: 1, borderWidth: 1, borderColor: '#d0d0d5', borderRadius: 8, paddingHorizontal: 10, height: 44, fontSize: 14, backgroundColor: '#fff' },
  errorText: { color: '#c0392b', fontSize: 13, textAlign: 'center', margin: 16 },
});
