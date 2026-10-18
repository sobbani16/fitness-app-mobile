import { startEntryTimer } from '../analytics/events';
import React, { useRef, useState } from 'react';
import { Alert, Image, View } from 'react-native';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { saveLabelAndLog, SaveLabelInput, SaveLabelResponse, ExtractedNutrition } from '../api/labelScanner';
import { useMeals } from '../context/MealsContext';
import { LoggedMeal } from '../storage/meals';
import { Action, Card, Copy, Field, Notice } from '../design/components';
import { useTheme } from '../design/theme';
import { numeric, portionRatio, scaleLabel } from '../services/labelPortion';
import { getSession } from '../storage/session';

const fields = ['Calories', 'Protein', 'Carbs', 'Fat', 'Fiber', 'Sugar'] as const;
export default function PortionAdjustScreen() {
  const [entryCompleted] = useState(() => startEntryTimer('label_meal_saved'));
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};
  const extracted: ExtractedNutrition | null = params.extracted || null;
  const { add } = useMeals();
  const { colors } = useTheme();
  const [name, setName] = useState(extracted?.productName || '');
  const [ingredients, setIngredients] = useState(extracted?.ingredients || '');
  const [basis, setBasis] = useState(extracted?.servingSizeG == null ? '' : String(extracted.servingSizeG));
  const [mass, setMass] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<'g' | 'ml' | 'servings' | 'package'>('g');
  const [packageServings, setPackageServings] = useState(extracted?.servingsPerContainer == null ? '' : String(extracted.servingsPerContainer));
  const [values, setValues] = useState([extracted?.calories, extracted?.proteinG, extracted?.carbsG, extracted?.fatG, extracted?.fiberG, extracted?.sugarG].map(value => value == null ? '' : String(value)));
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const stableId = useRef(`label-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const pending = useRef<SaveLabelInput | null>(null);
  const response = useRef<SaveLabelResponse | null>(null);
  const createdAt = useRef(new Date().toISOString());
  usePreventRemove(!saved && !removed && Boolean(name || values.some(value => value !== '') || amount), ({ data }) => {
    if (busy) return;
    Alert.alert('Leave label review?', pending.current ? 'The server may already have saved this entry. Check your diary before starting another scan.' : 'Your unsaved corrections will be discarded.', [
      { text: 'Keep reviewing', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  const ratio = portionRatio(basis, amount, unit, packageServings);
  const adjusted = values.map((value, index) => scaleLabel(value, ratio, index === 0));
  const servingMass = numeric(unit === 'ml' ? mass : basis);
  function edit(action: () => void) { action(); setReviewed(false); setError(''); }
  async function save() {
    if (lock.current || saved) return;
    if (!pending.current) {
      if (!reviewed || !name.trim() || !ratio || !servingMass || servingMass > 10000 || servingMass * ratio > 10000 || values.slice(0, 4).some(value => numeric(value) === null)
        || adjusted.slice(0, 4).some(value => value === null) || values.slice(4).some((value, index) => value.trim() !== '' && (numeric(value) === null || adjusted[index + 4] === null))) {
        setError('Review the food name, portion and required nutrition. Missing values are not zero. Portion mass must be between 0 and 10,000 g.'); return;
      }
      pending.current = { id: stableId.current, productName: name.trim(), ingredients: ingredients.trim() || undefined,
        servingSizeG: servingMass, actualPortionG: servingMass * ratio, servingsPerContainer: numeric(packageServings) || undefined,
        labelCalories: numeric(values[0])!, labelProteinG: numeric(values[1])!, labelCarbsG: numeric(values[2])!, labelFatG: numeric(values[3])!,
        labelFiberG: numeric(values[4]), labelSugarG: numeric(values[5]),
        mealType: params.mealType || 'lunch', photoUri: params.photoUri || undefined, ocrRawText: params.ocrRawText || undefined };
    }
    lock.current = true; setBusy(true); setError('');
    const account = getSession()?.user.id;
    try {
      response.current ??= await saveLabelAndLog(pending.current);
      if (getSession()?.user.id !== account) throw new Error('Account changed');
      const result = response.current;
      const log = result.foodLog;
      const meal: LoggedMeal = { id: log.id, createdAt: log.loggedAt || createdAt.current, name: log.foodName, calories: log.calories,
        quantityG: log.quantityG, macros: { protein_g: log.proteinG, carbs_g: log.carbsG, fat_g: log.fatG,
          ...(log.fiberG == null ? {} : { fiber_g: log.fiberG }) }, mealType: params.mealType || 'lunch',
        feedback: 'Reviewed label nutrition', source: 'label_scan', photoUri: params.photoUri || undefined };
      await add(meal); entryCompleted(); setSaved(true);
    } catch (failure: any) {
      if (failure?.response?.status === 400) { pending.current = null; setReviewed(false); setError('The server could not accept these values. Check the name, units, portion and nutrition before saving again.'); }
      else if (failure?.response?.status === 410) { setRemoved(true); setError('This meal was removed from your diary. It will not be recreated by a retry.'); }
      else setError('Could not finish saving. Retry this same entry when connected; your reviewed values are kept.');
    }
    finally { lock.current = false; setBusy(false); }
  }
  return <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
    <Copy size="heading" accessibilityRole="header">Review label & portion</Copy>
    {saved ? <Card><Notice title="Meal saved" message="Your reviewed label is now in your food diary." /><Action label="Done" onPress={() => navigation.navigate('Main', { screen: 'LogMeal' })} /></Card> : pending.current ?
      <Card><Copy>{pending.current.productName} · {adjusted[0]} kcal</Copy><Copy tone="muted">This entry is locked while saving or retrying, so the same meal is not submitted twice.</Copy>
        {error !== '' && <Notice error title="Save incomplete" message={error} />}{removed ? <Action label="Open food diary" onPress={() => navigation.navigate('Main', { screen: 'LogMeal' })} /> : <Action label={busy ? 'Saving…' : 'Retry save'} disabled={busy} onPress={() => { void save(); }} />}</Card> : <>
      <Notice title="Check against the package" message="OCR can miss values or mix columns. Choose one column (per serving or per 100 g/ml) and review every value. Unknown is not zero." />
      {params.photoUri && <Image accessibilityLabel="Captured nutrition label" source={{ uri: params.photoUri }} style={{ width: '100%', height: 220 }} resizeMode="contain" />}
      <Card><Field label="Food name" maxLength={300} value={name} onChangeText={value => edit(() => setName(value))} />
        <Field label="Ingredients (optional, editable)" maxLength={20000} multiline value={ingredients} onChangeText={value => edit(() => setIngredients(value))} />
        {params.ocrRawText ? <Copy size="caption" tone="muted">Label text: {params.ocrRawText}</Copy> : null}
      </Card>
      <Card><Copy size="title">Nutrition column & quantity</Copy>
        <Copy tone="muted">For per-100-g nutrition, enter 100 as the label basis. For per-serving nutrition, enter the serving’s labeled weight.</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['g', 'ml', 'servings', 'package'] as const).map(value => <Action secondary key={value} label={value} selected={unit === value} onPress={() => edit(() => { setUnit(value); setAmount(''); })} />)}</View>
        <Field label={unit === 'ml' ? 'Label basis (ml)' : 'Label basis / serving weight (g)'} value={basis} keyboardType="decimal-pad" onChangeText={value => edit(() => setBasis(value))} />
        {unit === 'ml' && <><Copy tone="muted">Volume is not weight. Enter the measured or labeled mass for the label basis above. We never assume 1 ml = 1 g.</Copy>
          <Field label="Mass of label basis (g)" value={mass} keyboardType="decimal-pad" onChangeText={value => edit(() => setMass(value))} /></>}
        {unit === 'package' && <Copy tone="muted">Use the per-serving nutrition column and serving weight for package portions.</Copy>}
        {unit === 'package' && <Field label="Servings per package" value={packageServings} keyboardType="decimal-pad" onChangeText={value => edit(() => setPackageServings(value))} />}
        <Field label={`Your portion (${unit})`} value={amount} keyboardType="decimal-pad" onChangeText={value => edit(() => setAmount(value))} />
        {fields.map((field, index) => <Field key={field} label={`${field} (${index === 0 ? 'kcal' : 'g'}) per label basis${index >= 4 ? ' — optional' : ''}`} value={values[index]}
          keyboardType="decimal-pad" onChangeText={value => edit(() => setValues(previous => previous.map((item, i) => i === index ? value : item)))} />)}
      </Card>
      <Card><Copy size="title">What you’ll log</Copy><Copy tone="muted">{ratio ? `${Number(ratio.toFixed(3))} × the label basis` : 'Enter a valid label basis and portion'}</Copy>
        {fields.map((field, index) => <Copy key={field}>{field}: {adjusted[index] == null ? 'Unknown' : `${adjusted[index]} ${index === 0 ? 'kcal' : 'g'}`}</Copy>)}
        <Copy size="caption" tone="muted">Calories rounded to whole kcal; nutrients to 0.1 g. Values remain label estimates.</Copy>
        <Action secondary label={reviewed ? 'Reviewed ✓' : 'I checked the label, units and portion'} onPress={() => setReviewed(true)} />
        {error !== '' && <Notice error title="Check your entry" message={error} />}
        <Action label="Save reviewed meal" disabled={!reviewed} onPress={() => { void save(); }} />
      </Card>
    </>}
  </KeyboardAwareScrollView>;
}
