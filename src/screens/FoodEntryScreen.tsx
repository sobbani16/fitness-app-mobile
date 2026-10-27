import { startEntryTimer } from '../analytics/events';
import { betaFeatures } from '../config/betaFeatures';
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

export default function FoodEntryScreen() {
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
  usePreventRemove(Boolean(preview || description || photoUri || pendingMeal.current), ({ data }) => {
    if (saving) return;
    Alert.alert('Leave this entry?', pendingMeal.current ? 'A save may already be pending. Check your diary before logging this meal again.' : 'Your unsaved entry will be discarded.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  // When the scale locks a stable weight, autofill the portion field and
  // recompute calories based on caloriesPer100g.
  const onWeightLocked = (grams: number) => {
    setReviewed(false);
    if (!preview) return;
    if (preview.source === 'Manual entry') { setPreview({ ...preview, portionGrams: String(grams) }); return; }
    const portionStr = String(grams);
    const kcal = caloriesForPortion(preview.caloriesPer100g, grams);
    setPreview({
      ...preview,
      portionGrams: portionStr,
      calories: String(kcal),
      ...macroStringsForPortion(preview.macrosPer100g, grams),
    });
  };

  // Recompute calories automatically whenever the user edits portion.
  // Does not force-overwrite a manually-edited calorie value — if the user
  // edits calories directly, we respect that until portion changes.
  const onPortionChange = (t: string) => {
    setReviewed(false);
    if (!preview) return;
    const grams = Number(t);
    const next: PreviewForm = { ...preview, portionGrams: t, selectedServing: undefined };
    if (preview.source !== 'Manual entry' && Number.isFinite(grams) && grams > 0) {
      next.calories = String(caloriesForPortion(preview.caloriesPer100g, grams));
      Object.assign(next, macroStringsForPortion(preview.macrosPer100g, grams));
    }
    setPreview(next);
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
    if (!betaFeatures.ai) return;
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
  // Defaults the portion to 100g; the user can adjust portion/macros below.
  const onIngredientSelected = (ing: IngredientResult) => {
    invalidate();
    setError(null);
    const grams = 100;
    setPreview({
      name: ing.name,
      ingredientId: ing.id, servings: ing.servings, verification: verificationLabel(ing),
      nutritionSnapshot: { source: ing.source, verificationLevel: ing.verificationLevel, provenance: ing.provenance, catalogId: ing.catalogId, revision: ing.revision },
      needsReview: true,
      uncertainty: [ing.provenance?.verification_explanation, ing.provenance?.estimate_warning, ing.provenance?.total_carb_estimation, ing.provenance?.basis?.includes('mL') ? 'Source basis may be per 100 mL. This is an estimated profile; weigh your portion and check its label.' : ''].filter(Boolean).join(' '),
      portionGrams: String(grams),
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
        <Text style={styles.title}>Log a meal</Text>
        <Text style={styles.muted}>
          Today: {meals.length} meal{meals.length === 1 ? '' : 's'} · {totalCalories} kcal
        </Text>

        <Pressable
          style={styles.scanLabelBtn}
          onPress={() => navigation.navigate('LabelScanner', { mealType })}
        >
          <Text style={styles.scanLabelBtnText}>📷 Scan Nutrition Label</Text>
        </Pressable>

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
        <Text style={styles.muted}>Pick a recipe to auto-fill calories and macros, or describe it below.</Text>

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
        {betaFeatures.ai && mode === 'photo' && <Button
          title={detecting ? 'Analyzing…' : photoUri ? 'Detect food' : 'Analyze description'}
          onPress={onDetect}
          disabled={detecting}
        />}

        {!preview && <Button title="Enter nutrition manually" onPress={() => {
          invalidate(); setError(null);
          setPreview({ name: description.trim() || 'Meal', portionGrams:'', calories:'', protein:'', carbs:'', fat:'', caloriesPer100g:0, macrosPer100g:{protein_g:0,carbs_g:0,fat_g:0}, source:'Manual entry' });
        }} />}
        {!betaFeatures.ai && <Text style={styles.muted}>AI estimates are unavailable in this beta. Use food search, label scanning or manual entry.</Text>}
        {detecting && <ActivityIndicator style={{ marginTop: 10 }} />}
        {error && <Text style={styles.err}>Error: {error}</Text>}

        {preview && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Estimated nutrition — edit before saving</Text>
              {preview.source === 'Manual entry' && <Text style={styles.muted}>Enter values for your whole portion. Changing its weight does not change manually entered nutrition.</Text>}
              <Text style={styles.muted}>{preview.source.startsWith('ingredient:') ? 'Food database nutrition — review preparation and portion' : preview.source.startsWith('recipe:') ? 'Recipe nutrition — review the serving and ingredients' : preview.source === 'Manual entry' ? 'Your entered nutrition' : preview.source === 'Repeated meal' ? 'Copied from a saved meal — review before logging' : 'AI estimate — not measured nutrition'}</Text>
              {preview.verification && <Text style={styles.muted}>{preview.verification}</Text>}
              {preview.servings?.map(serving => <Button key={serving.id} title={`${serving.label} · ${serving.grams} g${serving.estimated ? ' · estimated serving' : ''}`} onPress={() => { onPortionChange(String(serving.grams)); setPreview(current => current ? { ...current, selectedServing: serving.label } : current); }} />)}
              {preview.lowConfidence && <Text style={styles.err}>Uncertain estimate — check the food and portion carefully.</Text>}
              {!!preview.uncertainty && <Text style={styles.muted}>{preview.uncertainty}</Text>}

              <Text style={styles.label}>Food name</Text>
              <TextInput placeholderTextColor={colors.muted}
                style={styles.input}
                accessibilityLabel="Food name" value={preview.name}
                onChangeText={(t) => { setReviewed(false); setPreview({ ...preview, name: t }); }}
              />

              <Text style={styles.label}>Portion (grams)</Text>
              <TextInput placeholderTextColor={colors.muted}
                style={styles.input}
                accessibilityLabel="Portion grams" value={preview.portionGrams}
                onChangeText={onPortionChange}
                keyboardType="number-pad"
                placeholder="e.g. 250"
              />

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
            <ScaleConnectCard scale={scale} onWeightLocked={onWeightLocked} />
          </>
        )}

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Today&apos;s meals</Text>
        {meals.length === 0 && <Text style={styles.muted}>No meals logged yet.</Text>}
        {meals.map((m) => (
          <Pressable key={m.id} onLongPress={() => onRemove(m.id)} style={styles.mealRow}>
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
        ))}
        {meals.length > 0 && (
          <Text style={styles.muted}>Long-press a meal to remove.</Text>
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
