import { startEntryTimer } from '../analytics/events';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Button as NativeButton,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from '../design/components';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import RecipeSearch from '../components/RecipeSearch';
import RecipeByIngredients from '../components/RecipeByIngredients';
import IngredientSearch from '../components/IngredientSearch';
import { RecipeNutrition } from '../api/recipes';
import { IngredientResult, verificationLabel } from '../api/ingredients';
import { analyzeMeal, detectFood, FoodDetection } from '../api/meals';
import { useMeals } from '../context/MealsContext';
import { MealType, LoggedMeal, Macros } from '../storage/meals';
import ScaleConnectCard from '../components/ScaleConnectCard';
import { useScale } from '../hooks/useScale';
import { caloriesForPortion, macrosForPortion } from '../services/foodCalories';
import { getSession } from '../storage/session';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';

import { useTheme } from '../design/theme';
import { FoodIntelligenceReview } from '../components/FoodIntelligence';

function Button(props: React.ComponentProps<typeof NativeButton>) {
  const { colors } = useTheme();
  return <View style={{ minHeight: 48, justifyContent: 'center' }}><NativeButton color={Platform.OS === 'android' ? '#137C63' : colors.primary} {...props} /></View>;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Editable form state for the preview card.
interface PreviewForm {
  recipeId?: string;
  ingredientId?: string;
  selectedServing?: string;
  servingUnitId?: string;  // 'g' | 'oz' | a serving id from the catalog
  servingQty?: string;     // controlled text: number of units (e.g. 2 slices)
  servings?: IngredientResult['servings'];
  nutritionSnapshot?: Record<string, unknown>;
  verification?: string;
  name: string;
  portionGrams: string;   // string so the field is fully controlled
  calories: string;
  // Editable macro grams for the current portion (controlled fields).
  protein: string;
  carbs: string;
  fat: string;
  fiber?: string;
  caloriesPer100g: number;
  macrosPer100g: Macros;
  source: string;
  needsReview?: boolean;
  uncertainty?: string;
  lowConfidence?: boolean;
}

// Macro grams (as strings for controlled inputs) for a given portion.
function macroStringsForPortion(per100: Macros, grams: number) {
  const m = macrosForPortion(per100, grams);
  return {
    protein: Number.isFinite(per100.protein_g) && per100.protein_g >= 0 ? String(m.protein_g) : '',
    carbs: Number.isFinite(per100.carbs_g) && per100.carbs_g >= 0 ? String(m.carbs_g) : '',
    fat: Number.isFinite(per100.fat_g) && per100.fat_g >= 0 ? String(m.fat_g) : '',
    fiber: m.fiber_g == null ? '' : String(m.fiber_g),
  };
}

const OZ_G = 28.3495;
const WEIGHT_UNITS = [
  { id: 'g', label: 'Grams', grams: 1 },
  { id: 'oz', label: 'Ounces', grams: OZ_G },
];
interface ServingUnit { id: string; label: string; grams: number; estimated?: boolean }
// Household units (e.g. "1 slice") first, then plain weight — like MyFitnessPal.
function servingUnits(p: PreviewForm): ServingUnit[] {
  return [...(p.servings ?? []).map(s => ({ id: s.id, label: s.label, grams: s.grams, estimated: s.estimated })), ...WEIGHT_UNITS];
}
const activeUnit = (p: PreviewForm): ServingUnit =>
  servingUnits(p).find(u => u.id === p.servingUnitId) ?? WEIGHT_UNITS[0];

export default function FoodEntryScreen() {
  const { isEnabled } = useFeatureFlags();
  const [entryCompleted] = useState(() => startEntryTimer('food_entry_saved'));
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mode = route.params?.mode || 'photo';
  const repeated = route.params?.meal as LoggedMeal | undefined;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const savingLock = useRef(false);
  const [saving, setSaving] = useState(false);
  const pendingMeal = useRef<LoggedMeal | null>(null);
  const { meals, totalCalories, add, remove } = useMeals();
  const scale = useScale();

  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [preview, setPreview] = useState<PreviewForm | null>(() => {
    if (repeated) {
      const grams = repeated.quantityG || 100;
      return { name: repeated.name, portionGrams: repeated.quantityG ? String(grams) : '', calories: String(repeated.calories),
        protein: String(repeated.macros.protein_g), carbs: String(repeated.macros.carbs_g), fat: String(repeated.macros.fat_g), fiber: repeated.macros.fiber_g == null ? '' : String(repeated.macros.fiber_g),
        caloriesPer100g: repeated.calories * 100 / grams, macrosPer100g: { protein_g: repeated.macros.protein_g * 100 / grams, carbs_g: repeated.macros.carbs_g * 100 / grams, fat_g: repeated.macros.fat_g * 100 / grams,
          ...(repeated.macros.fiber_g == null ? {} : { fiber_g: repeated.macros.fiber_g * 100 / grams }) }, source: repeated.quantityG ? 'Repeated meal' : 'Manual entry', needsReview: true };
    }
    return mode === 'manual' ? { name: '', portionGrams: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', caloriesPer100g: 0, macrosPer100g: { protein_g: 0, carbs_g: 0, fat_g: 0 }, source: 'Manual entry' } : null;
  });
  const request = useRef(0);
  const [reviewed, setReviewed] = useState(false);
  const invalidate = () => { request.current++; setPreview(null); setReviewed(false); setDetecting(false); };
  useEffect(() => () => { request.current++; }, []);
  const [error, setError] = useState<string | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [unitSheetOpen, setUnitSheetOpen] = useState(false);
  usePreventRemove(Boolean(preview || description || photoUri || pendingMeal.current), ({ data }) => {
    if (saving) return;
    Alert.alert('Leave this entry?', pendingMeal.current ? 'A save may already be pending. Check your diary before logging this meal again.' : 'Your unsaved entry will be discarded.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  // Recompute calories/macros whenever the portion changes. `grams` is the
  // canonical amount; `patch` carries the serving-unit UI state alongside it.
  const applyPortion = (grams: number | null, patch: Partial<PreviewForm> = {}) => {
    if (!preview) return;
    const next: PreviewForm = { ...preview, ...patch, portionGrams: grams == null ? '' : String(Math.round(grams * 10) / 10) };
    if (preview.source !== 'Manual entry' && grams != null && Number.isFinite(grams) && grams > 0) {
      next.calories = String(caloriesForPortion(preview.caloriesPer100g, grams));
      Object.assign(next, macroStringsForPortion(preview.macrosPer100g, grams));
    }
    setPreview(next);
  };

  // When the scale locks a stable weight, autofill the portion field and
  // recompute calories based on caloriesPer100g.
  const onWeightLocked = (grams: number) => {
    setReviewed(false);
    if (!preview) return;
    const unit = activeUnit(preview);
    const qty = unit.grams === 1 ? String(grams) : String(Math.round((grams / unit.grams) * 100) / 100);
    applyPortion(grams, { servingQty: qty });
  };

  // The scale card may be closed inside its sheet — autofill still applies
  // because the lock watcher lives here, not in the card.
  useEffect(() => {
    if (scale.stableGrams !== null) onWeightLocked(scale.stableGrams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale.stableGrams]);

  // Recompute calories automatically whenever the user edits portion.
  // Does not force-overwrite a manually-edited calorie value — if the user
  // edits calories directly, we respect that until portion changes.
  const onServingQtyChange = (t: string) => {
    setReviewed(false);
    if (!preview) return;
    const qty = Number(t);
    const grams = t.trim() && Number.isFinite(qty) && qty > 0 ? qty * activeUnit(preview).grams : null;
    applyPortion(grams, { servingQty: t });
  };

  const onUnitPicked = (unit: ServingUnit) => {
    setReviewed(false);
    if (!preview) return;
    // Convert the quantity so the actual portion weight is preserved —
    // 56 g becomes "2" when switching to a 28 g serving, and back again.
    const grams = Number(preview.portionGrams);
    const count = Number.isFinite(grams) && grams > 0 ? Math.round((grams / unit.grams) * 100) / 100 : 1;
    applyPortion(count * unit.grams, {
      servingUnitId: unit.id,
      servingQty: String(count),
      selectedServing: unit.id === 'g' || unit.id === 'oz' ? undefined : unit.label,
    });
    setUnitSheetOpen(false);
  };

  const editNutrient = (field: 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber', value: string) => {
    if (!preview) return;
    setReviewed(false);
    const next = { ...preview, [field]: value, ...(preview.ingredientId ? { verification: 'User-adjusted nutrition', nutritionSnapshot: { ...preview.nutritionSnapshot, userEdited: true } } : {}), macrosPer100g: { ...preview.macrosPer100g } };
    const grams = Number(preview.portionGrams), number = Number(value);
    if (grams > 0 && value.trim() && Number.isFinite(number) && number >= 0) {
      if (field === 'calories') next.caloriesPer100g = number * 100 / grams;
      else next.macrosPer100g[({ protein: 'protein_g', carbs: 'carbs_g', fat: 'fat_g', fiber: 'fiber_g' } as const)[field]] = number * 100 / grams;
    } else if (field === 'fiber') delete next.macrosPer100g.fiber_g;
    setPreview(next);
  };

  const choosePhoto = async (camera: boolean) => {
    invalidate();
    const generation = request.current;
    const userId = getSession()?.user.id;
    const current = () => generation === request.current && userId === getSession()?.user.id;
    setError(null);
    try {
      const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!current()) return;
      if (!perm.granted) { setError('Photo permission is required. You can still describe or search for food.'); return; }
      const options = { allowsEditing: true, quality: 0.5, base64: true };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync({ ...options, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (!current() || result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.base64 || !asset.uri) throw new Error('Photo data is unavailable. Choose another photo.');
      // Expo ImagePicker documents base64 as JPEG data on both native platforms.
      if (asset.base64.length > Math.ceil(5 * 1024 * 1024 / 3) * 4) throw new Error('Choose a smaller photo (up to 5 MB).');
      setPhotoUri(asset.uri);
      setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
    } catch (e: any) { if (current()) setError(e?.message || 'Could not open photo. Please retry.'); }
  };
  const pickFromLibrary = () => choosePhoto(false);
  const takePhoto = () => choosePhoto(true);
  const clearPhoto = () => { invalidate(); setPhotoUri(null); setPhotoBase64(null); };

  const onDetect = async () => {
    if (!isEnabled('foodPhotoScanning')) return;
    const generation = ++request.current;
    const userId = getSession()?.user.id;
    const current = () => generation === request.current && userId === getSession()?.user.id;
    setError(null);
    setPreview(null);
    setReviewed(false);
    setDetecting(true);
    try {
      const result: FoodDetection = await (photoUri ? detectFood : analyzeMeal)({
        description: description.trim() || undefined,
        mealType,
        hasPhoto: Boolean(photoUri),
        imageDataUrl: photoBase64 || undefined,
      });
      if (!current()) return;
      setPreview({
        needsReview: true, uncertainty: result.uncertainty, lowConfidence: result.lowConfidence,
        name: result.foodName,
        portionGrams: String(result.suggestedPortionGrams),
        calories: String(result.estimatedCalories),
        ...macroStringsForPortion(result.macrosPer100g, result.suggestedPortionGrams),
        caloriesPer100g: result.caloriesPer100g,
        macrosPer100g: result.macrosPer100g,
        source: result.source,
      });
    } catch (e: any) {
      if (current()) setError(e?.response?.data?.error ?? e?.message ?? 'Detection failed');
    } finally {
      if (current()) setDetecting(false);
    }
  };

  // Fill the preview card from a selected USDA ingredient (per-100g nutrition).
  // Defaults to the food's own serving (e.g. "1 slice") when known, else 100 g.
  const onIngredientSelected = (ing: IngredientResult) => {
    invalidate();
    setError(null);
    const first = ing.servings?.find(s => s.grams > 0);
    const grams = first?.grams ?? 100;
    setPreview({
      name: ing.name,
      ingredientId: ing.id, servings: ing.servings, verification: verificationLabel(ing),
      nutritionSnapshot: { source: ing.source, verificationLevel: ing.verificationLevel, provenance: ing.provenance, catalogId: ing.catalogId, revision: ing.revision },
      needsReview: true,
      uncertainty: [ing.provenance?.verification_explanation, ing.provenance?.estimate_warning, ing.provenance?.total_carb_estimation, ing.provenance?.basis?.includes('mL') ? 'Source basis may be per 100 mL. This is an estimated profile; weigh your portion and check its label.' : ''].filter(Boolean).join(' '),
      portionGrams: String(grams),
      servingUnitId: first?.id,
      servingQty: first ? '1' : undefined,
      selectedServing: first?.label,
      calories: Number.isFinite(ing.caloriesPer100g) && ing.caloriesPer100g >= 0 ? String(caloriesForPortion(ing.caloriesPer100g, grams)) : '',
      ...macroStringsForPortion(ing.macrosPer100g, grams),
      caloriesPer100g: ing.caloriesPer100g,
      macrosPer100g: ing.macrosPer100g,
      source: ing.provenance?.source ? `ingredient: ${ing.provenance.source} · ${ing.preparation || 'per 100 g'}${ing.provenance.carb_definition?.includes('EXCLUDES fibre') ? ' · carbs include fiber' : ''}` : `ingredient: ${ing.source}`,
    });
  };

  // Fill the preview card from a selected recipe's nutrition.
  const onRecipeSelected = (n: RecipeNutrition) => {
    invalidate();
    setError(null);
    const grams = n.servingWeightGrams > 0 ? n.servingWeightGrams : 100;
    setPreview({
      recipeId: n.id,
      name: n.name,
      portionGrams: String(grams),
      calories: Number.isFinite(n.caloriesPer100g) && n.caloriesPer100g >= 0 ? String(caloriesForPortion(n.caloriesPer100g, grams)) : '',
      ...macroStringsForPortion(n.macrosPer100g, grams),
      caloriesPer100g: n.caloriesPer100g,
      macrosPer100g: n.macrosPer100g,
      source: `recipe: ${n.source}`,
    });
  };

  const onSave = async () => {
    if (savingLock.current || !preview || (preview.needsReview && !reviewed)) return;
    if (![preview.calories, preview.protein, preview.carbs, preview.fat].every(value => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100000)) {
      Alert.alert('Check nutrition', 'Enter calories, protein, carbs and fat. Use 0 only when known to be zero.'); return;
    }
    if (preview.fiber?.trim() && (!Number.isFinite(Number(preview.fiber)) || Number(preview.fiber) < 0 || Number(preview.fiber) > 100000)) {
      Alert.alert('Check fiber', 'Enter a non-negative value or leave fiber blank if unknown.'); return;
    }
    const grams = Number(preview.portionGrams);
    if (!Number.isFinite(grams) || grams <= 0 || grams > 10000) {
      Alert.alert('Invalid portion', 'Enter a portion between 0 and 10,000 grams.'); return;
    }
    const kcal = Number(preview.calories);
    if (!Number.isFinite(kcal) || kcal < 0) {
      Alert.alert('Invalid calories', 'Calories must be a non-negative number.');
      return;
    }
    // Use the (possibly user-edited) macro fields; fall back to portion-scaled
    // values when a field isn't a valid number.
    const scaled = Number.isFinite(grams) && grams > 0
      ? macrosForPortion(preview.macrosPer100g, grams)
      : { protein_g: 0, carbs_g: 0, fat_g: 0 };
    const macroField = (s: string, fallback: number) => {
      const n = Number(s);
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : fallback;
    };
    const macros: Macros = {
      protein_g: macroField(preview.protein, scaled.protein_g),
      carbs_g: macroField(preview.carbs, scaled.carbs_g),
      fat_g: macroField(preview.fat, scaled.fat_g),
      ...(preview.fiber?.trim() ? { fiber_g: Number(preview.fiber) } : {}),
    };

    const meal: LoggedMeal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      name: preview.name.trim() || 'Meal',
      calories: Math.round(kcal),
      macros,
      description: description.trim() || undefined,
      mealType,
      feedback: preview.source,
      source: preview.source,
      quantityG: Number(preview.portionGrams),
      ingredientId: preview.ingredientId, selectedServing: preview.selectedServing, nutritionSnapshot: preview.nutritionSnapshot,
      photoUri: photoUri ?? undefined,
    };
    savingLock.current = true; setSaving(true);
    pendingMeal.current ??= meal;
    try {
      await add(pendingMeal.current); entryCompleted();
      pendingMeal.current = null;
      setDescription('');
      setPreview(null);
      clearPhoto();
      scale.reset();
      Alert.alert('Saved on this device', `${meal.name} · ${meal.calories} kcal. Server sync runs when connected.`);
    } catch {
      Alert.alert('Could not save', 'Retry saves the same entry without creating another meal.');
    } finally { savingLock.current = false; setSaving(false); }
  };

  const onRemove = (id: string) =>
    Alert.alert('Remove meal?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(id) },
    ]);

  if (pendingMeal.current) return <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
    <Text style={styles.title}>Finish saving your meal</Text><Text style={styles.muted}>{pendingMeal.current.name} · {pendingMeal.current.calories} kcal</Text>
    <Text style={styles.muted}>Your reviewed values are kept. Retry sends the same entry, without creating another meal.</Text>
    <Button title={saving ? 'Saving…' : 'Retry save'} disabled={saving} onPress={onSave} />
  </KeyboardAwareScrollView>;

  return (
    <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        <Text style={styles.title}>{mode === 'recipes' ? 'Discover recipes' : 'Log a meal'}</Text>
        {mode !== 'recipes' && <Text style={styles.muted}>
          Today: {meals.length} meal{meals.length === 1 ? '' : 's'} · {totalCalories} kcal
        </Text>}

        {mode !== 'recipes' && <Pressable
          style={styles.scanLabelBtn}
          onPress={() => navigation.navigate('LabelScanner', { mealType })}
        >
          <Text style={styles.scanLabelBtnText}>📷 Scan Nutrition Label</Text>
        </Pressable>}

        {mode === 'photo' && <>
        <Text style={styles.label}>Photo (optional)</Text>
        <Text style={styles.muted}>Analysis sends your description and selected photo to our AI provider for an estimate. Review the food and portion before saving.</Text>
        {photoUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            <View style={styles.photoActions}>
              <Pressable onPress={pickFromLibrary} style={styles.photoBtn}>
                <Text style={styles.photoBtnText}>Replace</Text>
              </Pressable>
              <Pressable onPress={clearPhoto} style={[styles.photoBtn, styles.photoBtnDanger]}>
                <Text style={[styles.photoBtnText, styles.photoBtnDangerText]}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.photoRow}>
            <Pressable onPress={takePhoto} style={styles.photoBtn}>
              <Text style={styles.photoBtnText}>Take photo</Text>
            </Pressable>
            <Pressable onPress={pickFromLibrary} style={styles.photoBtn}>
              <Text style={styles.photoBtnText}>Pick from library</Text>
            </Pressable>
          </View>
        )}

        </>}
        {mode === 'search' && <>
        <Text style={styles.label}>Search an ingredient</Text>
        <IngredientSearch onSelect={onIngredientSelected} />
        <Text style={styles.muted}>Humai catalog first, USDA fallback. Check preparation, source and estimated values.</Text>

        </>}
        {mode === 'recipes' && <>
        <Text style={styles.label}>Search a recipe</Text>
        <RecipeSearch onSelect={onRecipeSelected} />
        <Text style={styles.muted}>Pick a recipe to auto-fill calories and macros, then review the serving before saving.</Text>

        <RecipeByIngredients onSelect={onRecipeSelected} />

        </>}
        {mode === 'photo' && <>
        <Text style={styles.label}>Description</Text>
        <TextInput placeholderTextColor={colors.muted}
          style={styles.input}
          value={description}
          onChangeText={text => { invalidate(); setDescription(text); }}
          placeholder="e.g. 150g grilled chicken with 200g cooked rice"
          maxLength={4000}
          autoCapitalize="sentences"
        />

        </>}
        <Text style={styles.label}>Meal type</Text>
        <View style={styles.segmented}>
          {MEAL_TYPES.map((t) => {
            const active = t === mealType;
            return (
              <Pressable
                key={t}
                accessibilityRole="button" accessibilityLabel={t} accessibilityState={{ selected: active }}
                onPress={() => { setReviewed(false); setMealType(t); }}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 8 }} />
        {isEnabled('foodPhotoScanning') && mode === 'photo' && <Button
          title={detecting ? 'Analyzing…' : photoUri ? 'Detect food' : 'Analyze description'}
          onPress={onDetect}
          disabled={detecting}
        />}

        {!preview && <Button title="Enter nutrition manually" onPress={() => {
          invalidate(); setError(null);
          setPreview({ name: description.trim() || 'Meal', portionGrams:'', calories:'', protein:'', carbs:'', fat:'', caloriesPer100g:0, macrosPer100g:{protein_g:0,carbs_g:0,fat_g:0}, source:'Manual entry' });
        }} />}
        {!isEnabled('foodPhotoScanning') && <Text style={styles.muted}>AI estimates are unavailable. Use food search, label scanning or manual entry.</Text>}
        {detecting && <ActivityIndicator style={{ marginTop: 10 }} />}
        {error && <Text style={styles.err}>Error: {error}</Text>}

        {preview && (
          <>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.cardTitle}>Estimated nutrition — edit before saving</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Bluetooth scale" accessibilityHint="Connect a Bluetooth kitchen scale"
                  onPress={() => setScaleOpen(true)} hitSlop={8} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.6 : 1 })}>
                  <Ionicons name="bluetooth" size={20} color={scale.status === 'connected' ? colors.primary : '#2563eb'} />
                </Pressable>
              </View>
              {preview.source === 'Manual entry' && <Text style={styles.muted}>Enter values for your whole portion. Changing its weight does not change manually entered nutrition.</Text>}
              <Text style={styles.muted}>{preview.source.startsWith('ingredient:') ? 'Food database nutrition — review preparation and portion' : preview.source.startsWith('recipe:') ? 'Recipe nutrition — review the serving and ingredients' : preview.source === 'Manual entry' ? 'Your entered nutrition' : preview.source === 'Repeated meal' ? 'Copied from a saved meal — review before logging' : 'AI estimate — not measured nutrition'}</Text>
              {preview.verification && <Text style={styles.muted}>{preview.verification}</Text>}
              {preview.lowConfidence && <Text style={styles.err}>Uncertain estimate — check the food and portion carefully.</Text>}
              {!!preview.uncertainty && <Text style={styles.muted}>{preview.uncertainty}</Text>}

              <Text style={styles.label}>Food name</Text>
              <TextInput placeholderTextColor={colors.muted}
                style={styles.input}
                accessibilityLabel="Food name" value={preview.name}
                onChangeText={(t) => { setReviewed(false); setPreview({ ...preview, name: t }); }}
              />

              <Text style={styles.label}>Serving size</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Serving size: ${activeUnit(preview).label}`} accessibilityHint="Choose the unit for this portion"
                onPress={() => setUnitSheetOpen(true)}
                style={({ pressed }) => [styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.7 : 1 }]}>
                <Text style={{ color: colors.text, fontSize: 16 }}>{activeUnit(preview).label}{activeUnit(preview).id === 'oz' ? ` (${OZ_G} g)` : activeUnit(preview).id !== 'g' ? ` (${activeUnit(preview).grams} g)` : ''}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.muted} />
              </Pressable>

              <Text style={styles.label}>{activeUnit(preview).id === 'g' ? 'Portion (grams)' : activeUnit(preview).id === 'oz' ? 'Portion (ounces)' : 'Number of servings'}</Text>
              <TextInput placeholderTextColor={colors.muted}
                style={styles.input}
                accessibilityLabel={activeUnit(preview).id === 'g' ? 'Portion grams' : activeUnit(preview).id === 'oz' ? 'Portion ounces' : 'Number of servings'} value={preview.servingQty ?? preview.portionGrams}
                onChangeText={onServingQtyChange}
                keyboardType="decimal-pad"
                placeholder={activeUnit(preview).id === 'g' ? 'e.g. 250' : 'e.g. 1.5'}
              />
              {activeUnit(preview).id !== 'g' && !!preview.portionGrams && <Text style={styles.muted}>= {preview.portionGrams} g total</Text>}

              <Text style={styles.label}>Calories</Text>
              <TextInput placeholderTextColor={colors.muted}
                style={styles.input}
                accessibilityLabel="Calories" value={preview.calories}
                onChangeText={(t) => editNutrient('calories', t)}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Fiber (grams, optional)</Text>
              <TextInput accessibilityLabel="Fiber grams" style={styles.input} value={preview.fiber || ''} onChangeText={t => editNutrient('fiber', t)} keyboardType="decimal-pad" placeholder="Unknown if blank" />
              <Text style={styles.label}>Macros (grams)</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroField}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <TextInput placeholderTextColor={colors.muted}
                    style={styles.input}
                    accessibilityLabel="Protein grams" value={preview.protein}
                    onChangeText={(t) => editNutrient('protein', t)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <TextInput placeholderTextColor={colors.muted}
                    style={styles.input}
                    accessibilityLabel="Carbs grams" value={preview.carbs}
                    onChangeText={(t) => editNutrient('carbs', t)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <TextInput placeholderTextColor={colors.muted}
                    style={styles.input}
                    accessibilityLabel="Fat grams" value={preview.fat}
                    onChangeText={(t) => editNutrient('fat', t)}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {preview.source !== 'Manual entry' && <Text style={styles.muted}>
                {preview.caloriesPer100g} kcal / 100g · per 100g: P{preview.macrosPer100g.protein_g}{' '}
                C{preview.macrosPer100g.carbs_g} F{preview.macrosPer100g.fat_g}
              </Text>}

              <View style={{ height: 6 }} />
              <FoodIntelligenceReview key={preview.ingredientId||preview.recipeId||'manual'} ingredientId={preview.ingredientId} recipeId={preview.recipeId} grams={Number(preview.portionGrams)} onProfile={id=>setPreview(current=>current?{...current,nutritionSnapshot:{...current.nutritionSnapshot,nutritionProfileId:id}}:current)} />
              <>{preview.needsReview && <Button title={reviewed ? "Estimate reviewed ✓" : "I reviewed the food, portion and nutrition"} onPress={() => setReviewed(true)} />}
              <Button title={saving ? "Saving…" : "Save meal"} onPress={onSave} disabled={saving || (!!preview.needsReview && !reviewed)} /></>
            </View>

            <View style={{ height: 10 }} />
            {scaleOpen && <Sheet visible title="Bluetooth scale" onClose={() => setScaleOpen(false)}>
              <Text style={styles.muted}>Connect your scale, place the food on it — the stable weight fills the portion field automatically.</Text>
              <ScaleConnectCard scale={scale} />
            </Sheet>}
            {unitSheetOpen && <Sheet visible title="Serving size" onClose={() => setUnitSheetOpen(false)}>
              <Text style={styles.muted}>How do you measure this food? Household servings are estimated weights.</Text>
              {servingUnits(preview).map(unit => {
                const active = unit.id === activeUnit(preview).id;
                return <Pressable key={unit.id} accessibilityRole="button" accessibilityLabel={`${unit.label}${unit.id === 'g' || unit.id === 'oz' ? '' : `, ${unit.grams} grams`}`} accessibilityState={{ selected: active }}
                  onPress={() => onUnitPicked(unit)}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 14, borderRadius: 12,
                    borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.accent : 'transparent', opacity: pressed ? 0.7 : 1 })}>
                  <Text style={{ fontWeight: active ? '700' : '500', color: active ? colors.primary : colors.text }}>
                    {unit.label}{unit.id === 'g' || unit.id === 'oz' ? '' : ` · ${unit.grams} g`}{unit.estimated ? ' · estimated' : ''}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>;
              })}
            </Sheet>}
          </>
        )}

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Today&apos;s meals</Text>
        {meals.length === 0 && <Text style={styles.muted}>No meals logged yet.</Text>}
        {meals.map((m) => (
          <View key={m.id}>
            <Pressable
              onPress={() => setExpandedMeal(expandedMeal === m.id ? null : m.id)}
              onLongPress={() => onRemove(m.id)}
              style={styles.mealRow}
              accessibilityRole="button"
              accessibilityLabel={`${m.name}, ${m.calories} kcal. Tap for nutrition details.`}
              accessibilityState={{ expanded: expandedMeal === m.id }}
            >
              {m.photoUri ? (
                <Image source={{ uri: m.photoUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.mealName}>{m.name}</Text>
                <Text style={styles.muted}>
                  {m.mealType ?? '—'} ·{' '}
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={styles.mealKcal}>{m.calories} kcal</Text>
            </Pressable>
            {expandedMeal === m.id && (
              <View style={styles.mealDetail}>
                {m.quantityG != null && <Text style={styles.muted}>Portion: {m.quantityG} g</Text>}
                <Text style={styles.macroDetail}>
                  Protein {m.macros.protein_g} g · Carbs {m.macros.carbs_g} g · Fat {m.macros.fat_g} g
                  {m.macros.fiber_g != null ? ` · Fiber ${m.macros.fiber_g} g` : ''}
                </Text>
                {!!m.description && <Text style={styles.muted}>{m.description}</Text>}
                {!!m.source && <Text style={styles.muted}>Source: {m.source}</Text>}
              </View>
            )}
          </View>
        ))}
        {meals.length > 0 && (
          <Text style={styles.muted}>Tap a meal for nutrition details. Long-press to remove.</Text>
        )}
        <View style={{ height: 24 }} />
    </KeyboardAwareScrollView>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { padding: 20, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  muted: { color: colors.muted },
  err: { color: colors.danger, marginTop: 8 },
  label: { fontSize: 13, color: colors.text, fontWeight: '600', marginTop: 8 },
  input: {
    minHeight: 48, color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: {
    minHeight: 48, justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.text, fontSize: 14 },
  segmentTextActive: { color: colors.onPrimary, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  mealName: { fontSize: 16, fontWeight: '600', color: colors.text },
  mealKcal: { fontSize: 15, fontWeight: '700', color: colors.primary },
  mealDetail: {
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 56,
    gap: 4,
  },
  macroDetail: { fontSize: 14, fontWeight: '600', color: colors.text },
  photoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  photoWrap: { gap: 8 },
  photo: { width: '100%', height: 200, borderRadius: 10, backgroundColor: colors.accent },
  photoActions: { flexDirection: 'row', gap: 8 },
  photoBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  photoBtnText: { color: colors.text, fontWeight: '600' },
  photoBtnDanger: { borderColor: colors.danger },
  photoBtnDangerText: { color: colors.danger },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: colors.accent,
  },
  thumbPlaceholder: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macroField: { flexGrow: 1, flexBasis: 120, gap: 4 },
  macroLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  scanLabelBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  scanLabelBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
});
