import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Button,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeMeal, MealAnalysis } from '../api/meals';
import { useMeals } from '../context/MealsContext';
import { MealType, LoggedMeal } from '../storage/meals';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function LogMealScreen() {
  const { meals, totalCalories, add, remove } = useMeals();

  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<MealAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Photo library access is needed to attach a meal photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      setPreview(null);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Camera access is needed to take a meal photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      setPreview(null);
    }
  };

  const clearPhoto = () => setPhotoUri(null);

  const onAnalyze = async () => {
    setError(null);
    setAnalyzing(true);
    try {
      const result = await analyzeMeal({
        description: description.trim() || undefined,
        mealType,
        hasPhoto: Boolean(photoUri),
      });
      setPreview(result);
    } catch (e: any) {
      setError(e?.message ?? 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const onSave = async () => {
    if (!preview) return;
    const meal: LoggedMeal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      name: preview.name,
      calories: preview.calories,
      macros: preview.macros,
      description: description.trim() || undefined,
      mealType,
      feedback: preview.feedback,
      source: preview.source,
      photoUri: photoUri ?? undefined,
    };
    try {
      await add(meal);
      setDescription('');
      setPreview(null);
      setPhotoUri(null);
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
          title={analyzing ? 'Analyzing…' : 'Analyze'}
          onPress={onAnalyze}
          disabled={analyzing}
        />

        {analyzing && <ActivityIndicator style={{ marginTop: 10 }} />}
        {error && <Text style={styles.err}>Error: {error}</Text>}

        {preview && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{preview.name}</Text>
            <Text style={styles.muted}>{preview.source}</Text>
            <Row label="Calories" value={`${preview.calories} kcal`} />
            <Row label="Protein" value={`${preview.macros.protein_g} g`} />
            <Row label="Carbs" value={`${preview.macros.carbs_g} g`} />
            <Row label="Fat" value={`${preview.macros.fat_g} g`} />
            <Text style={styles.feedback}>{preview.feedback}</Text>
            <View style={{ height: 6 }} />
            <Button title="Save meal" onPress={onSave} />
          </View>
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
                {m.mealType ?? '—'} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={styles.mealKcal}>{m.calories} kcal</Text>
          </Pressable>
        ))}
        {meals.length > 0 && (
          <Text style={styles.muted}>Long-press a meal to remove.</Text>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  rowLabel: { color: '#444' },
  rowValue: { color: '#111', fontWeight: '600' },
  feedback: { marginTop: 8, color: '#333', lineHeight: 20 },
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
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
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
  thumbPlaceholder: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderStyle: 'dashed',
  },
});
