import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Button,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import RecipeSearch from '../components/RecipeSearch';
import { RecipeNutrition } from '../api/recipes';
import { detectFood, FoodDetection } from '../api/meals';
import { useMeals } from '../context/MealsContext';
import { MealType, LoggedMeal, Macros } from '../storage/meals';
import ScaleConnectCard from '../components/ScaleConnectCard';
import { useScale } from '../hooks/useScale';
import { caloriesForPortion, macrosForPortion } from '../services/foodCalories';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Editable form state for the preview card.
interface PreviewForm {
  name: string;
  portionGrams: string;   // string so the field is fully controlled
  calories: string;
  caloriesPer100g: number;
  macrosPer100g: Macros;
  source: string;
}

export default function LogMealScreen() {
  const { meals, totalCalories, add, remove } = useMeals();
  const scale = useScale();

  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [preview, setPreview] = useState<PreviewForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  // When the scale locks a stable weight, autofill the portion field and
  // recompute calories based on caloriesPer100g.
  const onWeightLocked = (grams: number) => {
    if (!preview) return;
    const portionStr = String(grams);
    const kcal = caloriesForPortion(preview.caloriesPer100g, grams);
    setPreview({ ...preview, portionGrams: portionStr, calories: String(kcal) });
  };

  // Recompute calories automatically whenever the user edits portion.
  // Does not force-overwrite a manually-edited calorie value — if the user
  // edits calories directly, we respect that until portion changes.
  const onPortionChange = (t: string) => {
    if (!preview) return;
    const grams = Number(t);
    const next: PreviewForm = { ...preview, portionGrams: t };
    if (Number.isFinite(grams) && grams > 0) {
      next.calories = String(caloriesForPortion(preview.caloriesPer100g, grams));
    }
    setPreview(next);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Photo library access is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Camera access is needed.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const clearPhoto = () => setPhotoUri(null);

  const onDetect = async () => {
    setError(null);
    setDetecting(true);
    try {
      const result: FoodDetection = await detectFood({
        description: description.trim() || undefined,
        mealType,
        hasPhoto: Boolean(photoUri),
      });
      setPreview({
        name: result.foodName,
        portionGrams: String(result.suggestedPortionGrams),
        calories: String(result.estimatedCalories),
        caloriesPer100g: result.caloriesPer100g,
        macrosPer100g: result.macrosPer100g,
        source: result.source,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Detection failed');
    } finally {
      setDetecting(false);
    }
  };

  // Fill the preview card from a selected recipe's nutrition.
  const onRecipeSelected = (n: RecipeNutrition) => {
    setError(null);
    const grams = n.servingWeightGrams > 0 ? n.servingWeightGrams : 100;
    setPreview({
      name: n.name,
      portionGrams: String(grams),
      calories: String(caloriesForPortion(n.caloriesPer100g, grams)),
      caloriesPer100g: n.caloriesPer100g,
      macrosPer100g: n.macrosPer100g,
      source: `recipe: ${n.source}`,
    });
  };

  const onSave = async () => {
    if (!preview) return;
    const grams = Number(preview.portionGrams);
    const kcal = Number(preview.calories);
    if (!Number.isFinite(kcal) || kcal < 0) {
      Alert.alert('Invalid calories', 'Calories must be a non-negative number.');
      return;
    }
    const macros: Macros = Number.isFinite(grams) && grams > 0
      ? macrosForPortion(preview.macrosPer100g, grams)
      : { protein_g: 0, carbs_g: 0, fat_g: 0 };

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
      photoUri: photoUri ?? undefined,
    };
    try {
      await add(meal);
      setDescription('');
      setPreview(null);
      setPhotoUri(null);
      scale.reset();
      Alert.alert('Saved', `${meal.name} · ${meal.calories} kcal`);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Unknown error');
    }
  };

  const onRemove = (id: string) =>
    Alert.alert('Remove meal?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(id) },
    ]);

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Log a meal</Text>
        <Text style={styles.muted}>
          Today: {meals.length} meal{meals.length === 1 ? '' : 's'} · {totalCalories} kcal
        </Text>

        <Text style={styles.label}>Photo (optional)</Text>
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

        <Text style={styles.label}>Search a recipe</Text>
        <RecipeSearch onSelect={onRecipeSelected} />
        <Text style={styles.muted}>Pick a recipe to auto-fill calories and macros, or describe it below.</Text>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. grilled chicken with rice"
          autoCapitalize="sentences"
        />

        <Text style={styles.label}>Meal type</Text>
        <View style={styles.segmented}>
          {MEAL_TYPES.map((t) => {
            const active = t === mealType;
            return (
              <Pressable
                key={t}
                onPress={() => setMealType(t)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 8 }} />
        <Button
          title={detecting ? 'Detecting…' : 'Detect food'}
          onPress={onDetect}
          disabled={detecting}
        />

        {detecting && <ActivityIndicator style={{ marginTop: 10 }} />}
        {error && <Text style={styles.err}>Error: {error}</Text>}

        {preview && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Detected — edit before saving</Text>
              <Text style={styles.muted}>{preview.source}</Text>

              <Text style={styles.label}>Food name</Text>
              <TextInput
                style={styles.input}
                value={preview.name}
                onChangeText={(t) => setPreview({ ...preview, name: t })}
              />

              <Text style={styles.label}>Portion (grams)</Text>
              <TextInput
                style={styles.input}
                value={preview.portionGrams}
                onChangeText={onPortionChange}
                keyboardType="number-pad"
                placeholder="e.g. 250"
              />

              <Text style={styles.label}>Calories</Text>
              <TextInput
                style={styles.input}
                value={preview.calories}
                onChangeText={(t) => setPreview({ ...preview, calories: t })}
                keyboardType="number-pad"
              />

              <Text style={styles.muted}>
                {preview.caloriesPer100g} kcal / 100g · P{preview.macrosPer100g.protein_g}{' '}
                C{preview.macrosPer100g.carbs_g} F{preview.macrosPer100g.fat_g}
              </Text>

              <View style={{ height: 6 }} />
              <Button title="Save meal" onPress={onSave} />
            </View>

            <View style={{ height: 10 }} />
            <ScaleConnectCard scale={scale} onWeightLocked={onWeightLocked} />
          </>
        )}

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Today's meals</Text>
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

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '700' },
  muted: { color: '#666' },
  err: { color: '#c0392b', marginTop: 8 },
  label: { fontSize: 13, color: '#444', fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: {
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  segmentActive: { backgroundColor: '#1e6fb8', borderColor: '#1e6fb8' },
  segmentText: { color: '#222', fontSize: 14 },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: '#f7f7f9',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    marginTop: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#e5e5ea', marginVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mealName: { fontSize: 16, fontWeight: '600', color: '#111' },
  mealKcal: { fontSize: 15, fontWeight: '700', color: '#1e6fb8' },
  photoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  photoWrap: { gap: 8 },
  photo: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#eee' },
  photoActions: { flexDirection: 'row', gap: 8 },
  photoBtn: {
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  photoBtnText: { color: '#222', fontWeight: '600' },
  photoBtnDanger: { borderColor: '#c0392b' },
  photoBtnDangerText: { color: '#c0392b' },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  thumbPlaceholder: { borderWidth: 1, borderColor: '#e5e5ea', borderStyle: 'dashed' },
});
