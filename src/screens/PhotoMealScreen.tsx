import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../design/theme';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { useMeals } from '../context/MealsContext';
import { getSession } from '../storage/session';
import {
  DetectedFood, IngredientSource, detectFood, ingredientNutrition,
} from '../api/meals';
import { MealType } from '../storage/meals';

// Photo-to-recipe flow: capture → structured detection (single AI call) →
// deterministic recipe matching → ingredient review → nutrition recalc → log.
// Ingredient lines carry provenance; nutrition is always recomputed from
// per-100g ingredient profiles, never from AI-supplied totals.

type Stage = 'capture' | 'recognition' | 'review' | 'confirm';

interface ReviewLine {
  key: string;
  ingredientId?: string;
  name: string;
  amountG: string;
  source: IngredientSource;
  optional?: boolean;
}

interface Component {
  food: DetectedFood;
  selectedRecipeId: string | null;
  lines: ReviewLine[];
}

let lineSeq = 0;
const nextKey = () => `rl-${++lineSeq}`;

function linesForComponent(food: DetectedFood, recipeId: string | null): ReviewLine[] {
  const match = food.recipeMatches?.find((m) => m.recipeId === recipeId);
  const visuallyConfirmed = new Set((match?.visuallyConfirmedIngredients ?? []).map((s) => s.toLowerCase()));
  const lines: ReviewLine[] = [];
  if (match) {
    for (const ing of match.ingredients) {
      lines.push({
        key: nextKey(), ingredientId: ing.ingredientId ?? undefined, name: ing.name,
        amountG: String(Math.round(ing.amountG)), optional: ing.optional,
        source: visuallyConfirmed.has(ing.name.toLowerCase()) ? 'VISUALLY_SUGGESTED' : 'RECIPE_INFERRED',
      });
    }
  }
  for (const v of food.visibleIngredients) {
    if (!lines.some((l) => l.name.toLowerCase().includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(l.name.toLowerCase()))) {
      lines.push({ key: nextKey(), name: v.name, amountG: '', source: 'VISUALLY_SUGGESTED' });
    }
  }
  for (const h of food.possibleHiddenIngredients) {
    if (!lines.some((l) => l.name.toLowerCase().includes(h.toLowerCase()))) {
      lines.push({ key: nextKey(), name: h, amountG: '', source: 'RECIPE_INFERRED', optional: true });
    }
  }
  return lines;
}

const SOURCE_LABEL: Record<IngredientSource, string> = {
  VISUALLY_SUGGESTED: 'Seen in photo',
  RECIPE_INFERRED: 'From typical recipe',
  USER_CONFIRMED: 'Confirmed by you',
  PACKAGE_LABEL: 'Package label',
};

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function PhotoMealScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { isEnabled } = useFeatureFlags();
  const { add } = useMeals();

  const [stage, setStage] = useState<Stage>('capture');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [clarifications, setClarifications] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [totals, setTotals] = useState<{ calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number | null } | null>(null);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [logging, setLogging] = useState(false);
  const generation = useRef(0);

  const invalidate = () => { generation.current += 1; };

  const choosePhoto = async (camera: boolean) => {
    invalidate();
    const gen = generation.current;
    const userId = getSession()?.user.id;
    const current = () => gen === generation.current && userId === getSession()?.user.id;
    setError(null);
    try {
      const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!current()) return;
      if (!perm.granted) { setError('Photo permission is required. You can still search for food manually.'); return; }
      const options = { allowsEditing: true, quality: 0.5, base64: true };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync({ ...options, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (!current() || result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.base64 || !asset.uri) throw new Error('Photo data is unavailable. Choose another photo.');
      if (asset.base64.length > Math.ceil(5 * 1024 * 1024 / 3) * 4) throw new Error('Choose a smaller photo (up to 5 MB).');
      // New photo invalidates any previous scan results.
      setPhotoUri(asset.uri);
      setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
      setComponents([]);
      setTotals(null);
    } catch (e: any) { if (current()) setError(e?.message || 'Could not open photo. Please retry.'); }
  };

  const onScan = async () => {
    if (!isEnabled('foodPhotoScanning')) { setError('Photo scanning is unavailable. Use food search instead.'); return; }
    const gen = ++generation.current;
    const userId = getSession()?.user.id;
    const current = () => gen === generation.current && userId === getSession()?.user.id;
    setError(null);
    setBusy(true);
    try {
      const result = await detectFood({
        description: description.trim() || undefined,
        hasPhoto: Boolean(photoUri),
        imageDataUrl: photoBase64 || undefined,
      });
      if (!current()) return;
      const foods = result.detectedFoods?.length
        ? result.detectedFoods
        : [{ foodName: result.foodName, foodCategory: '', cuisineCandidates: [], preparationCandidates: [], visibleIngredients: [], possibleHiddenIngredients: [], portionGrams: result.suggestedPortionGrams, portionNote: '', uncertainty: result.uncertainty } as DetectedFood];
      setComponents(foods.map((food) => {
        const top = food.recipeMatches?.[0]?.recipeId ?? null;
        return { food, selectedRecipeId: top, lines: linesForComponent(food, top) };
      }));
      setClarifications(result.needsClarification ?? []);
      setStage('recognition');
    } catch (e: any) {
      if (current()) setError(e?.response?.data?.error ?? e?.message ?? 'Could not analyze the photo. Try a clearer picture or search manually.');
    } finally {
      if (current()) setBusy(false);
    }
  };

  const selectRecipe = (idx: number, recipeId: string | null) => {
    setComponents((prev) => prev.map((c, i) => i === idx ? { ...c, selectedRecipeId: recipeId, lines: linesForComponent(c.food, recipeId) } : c));
    setTotals(null);
  };

  const setLine = (idx: number, key: string, patch: Partial<ReviewLine>) => {
    setComponents((prev) => prev.map((c, i) => i === idx ? { ...c, lines: c.lines.map((l) => l.key === key ? { ...l, ...patch, source: patch.amountG !== undefined || patch.name !== undefined ? 'USER_CONFIRMED' : l.source } : l) } : c));
    setTotals(null);
  };
  const removeLine = (idx: number, key: string) => {
    setComponents((prev) => prev.map((c, i) => i === idx ? { ...c, lines: c.lines.filter((l) => l.key !== key) } : c));
    setTotals(null);
  };
  const addLine = (idx: number) => {
    setComponents((prev) => prev.map((c, i) => i === idx ? { ...c, lines: [...c.lines, { key: nextKey(), name: '', amountG: '', source: 'USER_CONFIRMED' as const }] } : c));
    setTotals(null);
  };
  const removeComponent = (idx: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== idx));
    setTotals(null);
  };

  const recalc = useCallback(async () => {
    const items = components.flatMap((c) => c.lines)
      .filter((l) => l.name.trim() && Number(l.amountG) > 0)
      .map((l) => ({ ingredientId: l.ingredientId, name: l.name.trim(), amountG: Number(l.amountG) }));
    if (!items.length) { setError('Enter a quantity for at least one ingredient.'); return null; }
    setError(null);
    setBusy(true);
    try {
      const res = await ingredientNutrition(items);
      setTotals(res.totals);
      setUnresolved(res.unresolved.map((u) => u.name));
      return res;
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Could not calculate nutrition. Check the ingredient names.');
      return null;
    } finally { setBusy(false); }
  }, [components]);

  const toReview = () => { setStage('review'); setActiveIdx(0); };

  const toConfirm = async () => {
    const res = await recalc();
    if (res) setStage('confirm');
  };

  const onLog = async () => {
    if (!totals || logging) return;
    setLogging(true);
    try {
      const name = components.map((c) => c.food.foodName).join(' + ') || 'Scanned meal';
      await add({
        id: `scan-${Date.now()}`,
        createdAt: new Date().toISOString(),
        name,
        calories: totals.calories,
        macros: { protein_g: totals.protein_g, carbs_g: totals.carbs_g, fat_g: totals.fat_g, ...(totals.fiber_g != null ? { fiber_g: totals.fiber_g } : {}) },
        mealType,
        feedback: unresolved.length ? `Logged from photo scan. Unresolved ingredients: ${unresolved.join(', ')}.` : 'Logged from photo scan after ingredient review.',
        source: 'photo-scan',
        photoUri: photoUri ?? undefined,
        quantityG: components.flatMap((c) => c.lines).reduce((a, l) => a + (Number(l.amountG) || 0), 0),
        nutritionSnapshot: {
          detectionVersion: 2,
          calculationVersion: 'ingredient-lines-v1',
          provenance: 'photo-scan + user review + per-100g computation',
          unresolved,
          components: components.map((c) => ({
            foodName: c.food.foodName,
            recipeId: c.selectedRecipeId,
            uncertainty: c.food.uncertainty,
            ingredients: c.lines.filter((l) => l.name.trim()).map((l) => ({
              name: l.name.trim(), amountG: Number(l.amountG) || null, source: l.source,
            })),
          })),
          hiddenIngredientWarning: 'Ingredient lists from photos may be incomplete — verify with the preparer if you have allergies.',
        },
      });
      Alert.alert('Meal logged', 'Nutrition was calculated from your reviewed ingredients.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Your review is preserved — try again.');
    } finally { setLogging(false); }
  };

  const hasHidden = components.some((c) => c.food.possibleHiddenIngredients.length > 0 || c.lines.some((l) => l.source === 'RECIPE_INFERRED'));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {stage === 'capture' && (
        <View>
          <Text style={styles.title}>Scan a meal</Text>
          <Text style={styles.note}>Photos are analyzed to suggest foods and are not stored on our servers. Nutrition is calculated from ingredients you confirm — never from the photo alone.</Text>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} accessibilityLabel="Selected meal photo" />}
          <View style={styles.row}>
            <Pressable style={styles.button} onPress={() => choosePhoto(true)} accessibilityRole="button">
              <Text style={styles.buttonText}>Take photo</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => choosePhoto(false)} accessibilityRole="button">
              <Text style={styles.buttonText}>From library</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.input} placeholder="Optional: describe the dish (e.g. ‘chicken biryani, medium portion’)"
            placeholderTextColor={colors.muted} value={description} onChangeText={setDescription}
          />
          <Pressable style={[styles.primary, (busy || (!photoUri && !description.trim())) && styles.disabled]} disabled={busy || (!photoUri && !description.trim())} onPress={onScan} accessibilityRole="button">
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>Analyze</Text>}
          </Pressable>
        </View>
      )}

      {stage === 'recognition' && (
        <View>
          <Text style={styles.title}>What we found</Text>
          {clarifications.length > 0 && (
            <View style={styles.warnCard}>
              {clarifications.map((q, i) => <Text key={i} style={styles.warnText}>• {q}</Text>)}
            </View>
          )}
          {components.map((c, idx) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.cardTitle}>{c.food.foodName}</Text>
              {!!c.food.uncertainty && <Text style={styles.note}>⚠ {c.food.uncertainty}</Text>}
              {!!c.food.portionGrams && <Text style={styles.note}>~{c.food.portionGrams} g{c.food.portionNote ? ` — ${c.food.portionNote}` : ''}</Text>}
              <Text style={styles.sectionLabel}>Matching Humai recipes</Text>
              {(c.food.recipeMatches ?? []).map((m) => (
                <Pressable key={m.recipeId} style={[styles.choice, c.selectedRecipeId === m.recipeId && styles.choiceOn]} onPress={() => selectRecipe(idx, m.recipeId)}>
                  <Text style={styles.choiceText}>{m.name}{m.nutritionLevel === 'ESTIMATED' ? ' · estimated' : ''}</Text>
                  <Text style={styles.choiceSub}>{m.reasons.join(' · ')}</Text>
                </Pressable>
              ))}
              <Pressable style={[styles.choice, c.selectedRecipeId === null && styles.choiceOn]} onPress={() => selectRecipe(idx, null)}>
                <Text style={styles.choiceText}>No recipe — editable estimate</Text>
                <Text style={styles.choiceSub}>Review every ingredient yourself</Text>
              </Pressable>
              {components.length > 1 && (
                <Pressable onPress={() => removeComponent(idx)}><Text style={styles.removeText}>Not part of this meal — remove</Text></Pressable>
              )}
            </View>
          ))}
          <Pressable style={styles.primary} onPress={toReview} disabled={!components.length} accessibilityRole="button">
            <Text style={styles.primaryText}>Review ingredients</Text>
          </Pressable>
          <Pressable onPress={() => { invalidate(); setStage('capture'); setComponents([]); }}><Text style={styles.removeText}>Retake / start over</Text></Pressable>
        </View>
      )}

      {stage === 'review' && components.length > 0 && (
        <View>
          <Text style={styles.title}>Review ingredients</Text>
          {hasHidden && <Text style={styles.warnText}>Ingredient lists from photos may be incomplete. If you have allergies, confirm with the preparer before eating.</Text>}
          {components.length > 1 && (
            <View style={styles.row}>
              {components.map((c, i) => (
                <Pressable key={i} style={[styles.chip, i === activeIdx && styles.chipOn]} onPress={() => setActiveIdx(i)}>
                  <Text style={styles.chipText}>{c.food.foodName}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {(() => {
            const c = components[Math.min(activeIdx, components.length - 1)];
            const idx = components.indexOf(c);
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{c.food.foodName}</Text>
                {c.lines.map((l) => (
                  <View key={l.key} style={styles.lineRow}>
                    <View style={{ flex: 1 }}>
                      <TextInput style={styles.lineName} value={l.name} placeholder="ingredient" placeholderTextColor={colors.muted}
                        onChangeText={(v) => setLine(idx, l.key, { name: v })} />
                      <Text style={styles.src}>{SOURCE_LABEL[l.source]}{l.optional ? ' · optional' : ''}</Text>
                    </View>
                    <TextInput style={styles.grams} value={l.amountG} placeholder="g" keyboardType="numeric" placeholderTextColor={colors.muted}
                      onChangeText={(v) => setLine(idx, l.key, { amountG: v.replace(/[^0-9.]/g, '') })} accessibilityLabel={`grams of ${l.name || 'ingredient'}`} />
                    <Pressable onPress={() => removeLine(idx, l.key)} accessibilityLabel={`remove ${l.name}`}><Text style={styles.removeText}>✕</Text></Pressable>
                  </View>
                ))}
                <Pressable onPress={() => addLine(idx)}><Text style={styles.addText}>+ Add ingredient</Text></Pressable>
              </View>
            );
          })()}
          <Pressable style={[styles.primary, busy && styles.disabled]} disabled={busy} onPress={toConfirm} accessibilityRole="button">
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>Calculate nutrition</Text>}
          </Pressable>
        </View>
      )}

      {stage === 'confirm' && totals && (
        <View>
          <Text style={styles.title}>Confirm nutrition</Text>
          <View style={styles.card}>
            <Text style={styles.big}>{totals.calories} kcal</Text>
            <Text style={styles.note}>Protein {totals.protein_g} g · Carbs {totals.carbs_g} g · Fat {totals.fat_g} g{totals.fiber_g != null ? ` · Fiber ${totals.fiber_g} g` : ' · Fiber unknown'}</Text>
            <Text style={styles.src}>Calculated from reviewed ingredients (per-100 g profiles). Photo analysis was a suggestion only.</Text>
            {unresolved.length > 0 && <Text style={styles.warnText}>Not included (unresolved): {unresolved.join(', ')}</Text>}
          </View>
          <Text style={styles.sectionLabel}>Meal</Text>
          <View style={styles.row}>
            {MEAL_TYPES.map((t) => (
              <Pressable key={t} style={[styles.chip, mealType === t && styles.chipOn]} onPress={() => setMealType(t)}>
                <Text style={styles.chipText}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.primary, logging && styles.disabled]} disabled={logging} onPress={onLog} accessibilityRole="button">
            {logging ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>Log meal</Text>}
          </Pressable>
          <Pressable onPress={() => setStage('review')}><Text style={styles.addText}>Back to ingredients</Text></Pressable>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  note: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  photo: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  button: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  buttonText: { color: colors.text, fontWeight: '600' },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, marginBottom: 12 },
  primary: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 12 },
  primaryText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sectionLabel: { color: colors.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  choice: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, marginBottom: 6 },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.surface ?? colors.card },
  choiceText: { color: colors.text, fontWeight: '600' },
  choiceSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.surface ?? colors.card },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  lineName: { color: colors.text, fontSize: 15, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2 },
  grams: { width: 64, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 6, color: colors.text, textAlign: 'right' },
  src: { color: colors.muted, fontSize: 11 },
  addText: { color: colors.primary, fontWeight: '600', marginTop: 4 },
  removeText: { color: colors.danger ?? '#c0392b', fontWeight: '600', marginTop: 6 },
  warnCard: { backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: colors.warning ?? '#e67e22', padding: 10, borderRadius: 8, marginBottom: 10 },
  warnText: { color: colors.warning ?? '#e67e22', fontSize: 13, marginBottom: 6 },
  big: { color: colors.text, fontSize: 30, fontWeight: '800', marginBottom: 4 },
  error: { color: colors.danger ?? '#c0392b', marginTop: 8 },
});
