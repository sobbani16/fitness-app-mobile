import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { saveLabelAndLog, ExtractedNutrition } from '../api/labelScanner';
import { useMeals } from '../context/MealsContext';
import { LoggedMeal } from '../storage/meals';

interface RouteParams {
  extracted: ExtractedNutrition | null;
  photoUri: string | null;
  ocrRawText: string;
  mealType: string;
}

export default function PortionAdjustScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = route.params as RouteParams;
  const { add } = useMeals();

  const extracted = params.extracted;

  // Form state — initialized from extracted data or blank for manual entry
  const [productName, setProductName] = useState(extracted?.productName || '');
  const [servingSizeG, setServingSizeG] = useState(String(extracted?.servingSizeG || '100'));
  const [actualPortionG, setActualPortionG] = useState(String(extracted?.servingSizeG || '100'));
  const [labelCalories, setLabelCalories] = useState(String(extracted?.calories || ''));
  const [labelProteinG, setLabelProteinG] = useState(String(extracted?.proteinG || ''));
  const [labelCarbsG, setLabelCarbsG] = useState(String(extracted?.carbsG || ''));
  const [labelFatG, setLabelFatG] = useState(String(extracted?.fatG || ''));
  const [labelFiberG, setLabelFiberG] = useState(String(extracted?.fiberG || ''));
  const [labelSugarG, setLabelSugarG] = useState(String(extracted?.sugarG || ''));
  const [ingredients, setIngredients] = useState(extracted?.ingredients || '');
  const [saving, setSaving] = useState(false);

  // Calculate adjusted values in real-time
  const adjusted = useMemo(() => {
    const serving = Number(servingSizeG) || 1;
    const portion = Number(actualPortionG) || 0;
    const ratio = portion / serving;
    return {
      calories: Math.round((Number(labelCalories) || 0) * ratio),
      proteinG: Math.round(((Number(labelProteinG) || 0) * ratio) * 10) / 10,
      carbsG: Math.round(((Number(labelCarbsG) || 0) * ratio) * 10) / 10,
      fatG: Math.round(((Number(labelFatG) || 0) * ratio) * 10) / 10,
      fiberG: Math.round(((Number(labelFiberG) || 0) * ratio) * 10) / 10,
      sugarG: Math.round(((Number(labelSugarG) || 0) * ratio) * 10) / 10,
    };
  }, [servingSizeG, actualPortionG, labelCalories, labelProteinG, labelCarbsG, labelFatG, labelFiberG, labelSugarG]);

  const portionRatio = useMemo(() => {
    const s = Number(servingSizeG) || 1;
    const p = Number(actualPortionG) || 0;
    return p / s;
  }, [servingSizeG, actualPortionG]);

  const onSave = useCallback(async () => {
    if (!Number(actualPortionG)) {
      Alert.alert('Enter portion', 'Please enter the actual portion size in grams.');
      return;
    }
    if (!Number(labelCalories) && !Number(labelProteinG)) {
      Alert.alert('Missing data', 'Please enter at least calories or protein from the label.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveLabelAndLog({
        productName: productName || undefined,
        ingredients: ingredients || undefined,
        servingSizeG: Number(servingSizeG),
        labelCalories: Number(labelCalories) || 0,
        labelProteinG: Number(labelProteinG) || 0,
        labelCarbsG: Number(labelCarbsG) || 0,
        labelFatG: Number(labelFatG) || 0,
        labelFiberG: Number(labelFiberG) || 0,
        labelSugarG: Number(labelSugarG) || 0,
        actualPortionG: Number(actualPortionG),
        mealType: params.mealType,
        photoUri: params.photoUri || undefined,
        ocrRawText: params.ocrRawText || undefined,
        aiConfidence: extracted?.confidence,
      });

      // Also add to local meals context so it appears immediately on dashboard
      const localMeal: LoggedMeal = {
        id: result.foodLog.id,
        createdAt: new Date().toISOString(),
        name: productName || 'Scanned food',
        calories: adjusted.calories,
        macros: {
          protein_g: adjusted.proteinG,
          carbs_g: adjusted.carbsG,
          fat_g: adjusted.fatG,
        },
        mealType: params.mealType as any,
        feedback: 'Logged from label scan',
        source: 'label_scan',
        photoUri: params.photoUri || undefined,
      };
      await add(localMeal);

      Alert.alert('Saved!', `${productName || 'Food'} logged: ${adjusted.calories} kcal`, [
        { text: 'OK', onPress: () => navigation.navigate('Main') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, [productName, ingredients, servingSizeG, actualPortionG, labelCalories, labelProteinG, labelCarbsG, labelFatG, labelFiberG, labelSugarG, adjusted, params, extracted, navigation, add]);

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Adjust Portion</Text>
      {extracted?.confidence != null && (
        <Text style={styles.confidence}>
          AI Confidence: {Math.round(extracted.confidence * 100)}%
        </Text>
      )}

      {/* Product Info */}
      <Text style={styles.sectionTitle}>Product Info</Text>
      <Text style={styles.label}>Product Name</Text>
      <TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="e.g. Granola Bar" />

      {ingredients ? (
        <View style={styles.ingredientsBox}>
          <Text style={styles.ingredientsLabel}>Ingredients:</Text>
          <Text style={styles.ingredientsText}>{ingredients}</Text>
        </View>
      ) : null}

      {/* Label Nutrition (per serving) */}
      <Text style={styles.sectionTitle}>Label Nutrition (per serving)</Text>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Serving Size (g)</Text>
          <TextInput style={styles.input} value={servingSizeG} onChangeText={setServingSizeG} keyboardType="decimal-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Calories</Text>
          <TextInput style={styles.input} value={labelCalories} onChangeText={setLabelCalories} keyboardType="decimal-pad" />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Protein (g)</Text>
          <TextInput style={styles.input} value={labelProteinG} onChangeText={setLabelProteinG} keyboardType="decimal-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Carbs (g)</Text>
          <TextInput style={styles.input} value={labelCarbsG} onChangeText={setLabelCarbsG} keyboardType="decimal-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Fat (g)</Text>
          <TextInput style={styles.input} value={labelFatG} onChangeText={setLabelFatG} keyboardType="decimal-pad" />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Fiber (g)</Text>
          <TextInput style={styles.input} value={labelFiberG} onChangeText={setLabelFiberG} keyboardType="decimal-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Sugar (g)</Text>
          <TextInput style={styles.input} value={labelSugarG} onChangeText={setLabelSugarG} keyboardType="decimal-pad" />
        </View>
      </View>

      {/* Portion Input */}
      <Text style={styles.sectionTitle}>Your Portion</Text>
      <Text style={styles.hint}>
        How much did you actually eat? Weigh your food or estimate in grams.
      </Text>
      <TextInput
        style={[styles.input, styles.portionInput]}
        value={actualPortionG}
        onChangeText={setActualPortionG}
        keyboardType="decimal-pad"
        placeholder="e.g. 150"
      />
      <Text style={styles.ratioText}>
        {portionRatio === 1
          ? 'Eating exactly 1 serving'
          : portionRatio < 1
          ? `Eating ${Math.round(portionRatio * 100)}% of a serving`
          : `Eating ${portionRatio.toFixed(1)}× servings`}
      </Text>

      {/* Adjusted Preview */}
      <View style={styles.adjustedCard}>
        <Text style={styles.adjustedTitle}>Adjusted Nutrition</Text>
        <Text style={styles.adjustedSubtitle}>What you'll actually log</Text>
        <View style={styles.adjustedRow}>
          <NutrientPill label="Calories" value={adjusted.calories} unit="kcal" />
          <NutrientPill label="Protein" value={adjusted.proteinG} unit="g" />
          <NutrientPill label="Carbs" value={adjusted.carbsG} unit="g" />
          <NutrientPill label="Fat" value={adjusted.fatG} unit="g" />
        </View>
        <View style={styles.adjustedRow}>
          <NutrientPill label="Fiber" value={adjusted.fiberG} unit="g" />
          <NutrientPill label="Sugar" value={adjusted.sugarG} unit="g" />
        </View>
      </View>

      {/* Save Button */}
      <Pressable style={styles.saveBtn} onPress={onSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Log This Meal</Text>
        )}
      </Pressable>

      <View style={{ height: 40 }} />
    </KeyboardAwareScrollView>
  );
}

function NutrientPill({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue}>{value}{unit}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  confidence: { fontSize: 13, color: '#6c63ff', fontWeight: '600', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginTop: 20, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  hint: { fontSize: 13, color: '#888', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  portionInput: { fontSize: 20, fontWeight: '700', textAlign: 'center', paddingVertical: 14 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  field: { flex: 1 },
  ratioText: { fontSize: 13, color: '#1e6fb8', fontWeight: '600', marginTop: 6, textAlign: 'center' },
  ingredientsBox: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 10, marginTop: 8 },
  ingredientsLabel: { fontSize: 12, fontWeight: '700', color: '#555' },
  ingredientsText: { fontSize: 13, color: '#333', marginTop: 4 },

  adjustedCard: {
    backgroundColor: '#e8f4fd',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#b8daef',
  },
  adjustedTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  adjustedSubtitle: { fontSize: 12, color: '#666', marginBottom: 12 },
  adjustedRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pill: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pillValue: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  pillLabel: { fontSize: 11, color: '#888', marginTop: 2 },

  saveBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
