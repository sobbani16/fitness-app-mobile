import { startEntryTimer } from '../analytics/events';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, View } from 'react-native';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { saveLabelAndLog, SaveLabelInput, SaveLabelResponse, ExtractedNutrition } from '../api/labelScanner';
import { useMeals } from '../context/MealsContext';
import { LoggedMeal } from '../storage/meals';
import { Action, Card, Copy, Field, Notice } from '../design/components';
import { useTheme } from '../design/theme';
import { numeric, portionRatio, scaleLabel } from '../services/labelPortion';
import LabelInsights from '../components/LabelInsights';
import { analyzeLabel, compareLabels, LabelAnalysis, LabelFacts } from '../api/labelScanner';
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
  const [allergens, setAllergens] = useState(params.allergenText || extracted?.allergens || '');
  const [claims, setClaims] = useState(params.claimText || '');
  const [addedSugar, setAddedSugar] = useState(extracted?.addedSugarG == null ? '' : String(extracted.addedSugarG));
  const [sodium, setSodium] = useState(extracted?.sodiumMg == null ? '' : String(extracted.sodiumMg));
  const [saturatedFat,setSaturatedFat]=useState(extracted?.saturatedFatG==null?'':String(extracted.saturatedFatG));
  const [transFat,setTransFat]=useState(extracted?.transFatG==null?'':String(extracted.transFatG));
  const [jurisdiction, setJurisdiction] = useState<LabelFacts['jurisdiction']>('unknown');
  const [column, setColumn] = useState<LabelFacts['column']>('unknown');
  const [form, setForm] = useState<LabelFacts['form']>('unknown');
  const [comparison, setComparison] = useState<LabelAnalysis | null>(null);
  const [personalize, setPersonalize] = useState(false);
  const [analysis, setAnalysis] = useState<LabelAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const analysisRequest = useRef(0);
  useEffect(() => () => { analysisRequest.current++; }, []);
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
  function edit(action: () => void) { analysisRequest.current++; action(); setReviewed(false); setAnalysis(null); setComparison(null); setAnalyzing(false); setError(''); }
  const labelFacts: LabelFacts = { calories: numeric(values[0]), proteinG: numeric(values[1]), form, ingredients: ingredients.trim(), allergens, claims, addedSugarG: numeric(addedSugar), sodiumMg: numeric(sodium), sugarG: numeric(values[5]), carbsG: numeric(values[2]), fiberG: numeric(values[4]), basisAmount: numeric(basis), basisUnit: unit === 'ml' ? 'ml' : 'g', column, portionRatio: ratio, jurisdiction, reviewed, personalize };
  async function inspect() {
    labelFacts.fatG=numeric(values[3]);labelFacts.saturatedFatG=numeric(saturatedFat);labelFacts.transFatG=numeric(transFat);labelFacts.basisMassG=servingMass;labelFacts.servingsPerContainer=numeric(packageServings);
    if ([addedSugar, sodium, saturatedFat, transFat].some(value => value.trim() !== '' && numeric(value) === null)) { setError('Correct optional nutrients, or leave unreadable values blank.'); return; }
    const request = ++analysisRequest.current, account = getSession()?.user.id;
    setAnalyzing(true); setError('');
    try {
      const result = await analyzeLabel(labelFacts);
      if (request === analysisRequest.current && account === getSession()?.user.id) { setAnalysis(result); }
      if (params.compareWith && request === analysisRequest.current && account === getSession()?.user.id) {
        const compared = await compareLabels(params.compareWith, labelFacts);
        if (request === analysisRequest.current && account === getSession()?.user.id) setComparison(compared);
      }
    } catch { if (request === analysisRequest.current) setError('Insights or comparison unavailable. For comparison, confirm both labels’ quantities, units and physical form. Your reviewed meal can still be saved.'); }
    finally { if (request === analysisRequest.current) setAnalyzing(false); }
  }
  async function save() {
    labelFacts.fatG=numeric(values[3]);labelFacts.saturatedFatG=numeric(saturatedFat);labelFacts.transFatG=numeric(transFat);labelFacts.basisMassG=servingMass;labelFacts.servingsPerContainer=numeric(packageServings);
    if (lock.current || saved) return;
    if (!pending.current) {
      if ([addedSugar, sodium].some(value => value.trim() !== '' && numeric(value) === null) || !reviewed || !name.trim() || !ratio || !servingMass || servingMass > 10000 || servingMass * ratio > 10000 || values.slice(0, 4).some(value => numeric(value) === null)
        || adjusted.slice(0, 4).some(value => value === null) || values.slice(4).some((value, index) => value.trim() !== '' && (numeric(value) === null || adjusted[index + 4] === null))) {
        setError('Review the food name, portion and required nutrition. Missing values are not zero. Portion mass must be between 0 and 10,000 g.'); return;
      }
      pending.current = { id: stableId.current, productName: name.trim(), ingredients: ingredients.trim() || undefined,
        servingSizeG: servingMass, actualPortionG: servingMass * ratio, servingsPerContainer: numeric(packageServings) || undefined,
        labelCalories: numeric(values[0])!, labelProteinG: numeric(values[1])!, labelCarbsG: numeric(values[2])!, labelFatG: numeric(values[3])!,
        labelFiberG: numeric(values[4]), labelSugarG: numeric(values[5]), labelSodiumMg: numeric(sodium),
        labelFacts,
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
      {Object.entries(params.labelPhotos || {}).filter(([key]) => key !== 'nutrition').map(([key, uri]) => uri ? <Image key={key} accessibilityLabel={`Captured ${key} panel`} source={{ uri: String(uri) }} style={{ width: '100%', height: 220 }} resizeMode="contain" /> : null)}
      <Card><Field label="Food name" maxLength={300} value={name} onChangeText={value => edit(() => setName(value))} />
        <Field label="Ingredients (optional, editable)" maxLength={20000} multiline value={ingredients} onChangeText={value => edit(() => setIngredients(value))} />
        <Field label="Allergen statement — exact label text" multiline maxLength={20000} value={allergens} onChangeText={value => edit(() => setAllergens(value))} />
        <Field label="Front-of-pack claims — exact label text" multiline maxLength={20000} value={claims} onChangeText={value => edit(() => setClaims(value))} />
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
      <Card><Copy size="title">Optional label checks</Copy>
        <Field label="Saturated fat (g) per label basis — optional" value={saturatedFat} keyboardType="decimal-pad" onChangeText={value=>edit(()=>setSaturatedFat(value))} />
        <Field label="Trans fat (g) per label basis — optional" value={transFat} keyboardType="decimal-pad" onChangeText={value=>edit(()=>setTransFat(value))} />
        <Field label="Added sugars (g) per label basis — optional" value={addedSugar} keyboardType="decimal-pad" onChangeText={value => edit(() => setAddedSugar(value))} />
        <Field label="Sodium (mg) per label basis — optional" value={sodium} keyboardType="decimal-pad" onChangeText={value => edit(() => setSodium(value))} />
        <Copy>Market printed on this package</Copy>
        {(['unknown', 'IN', 'US'] as const).map(value => <Action secondary key={value} label={value === 'IN' ? 'India / FSSAI' : value === 'US' ? 'United States / FDA' : 'Market unknown'} selected={jurisdiction === value} onPress={() => edit(() => setJurisdiction(value))} />)}
        <Copy>Product as labeled</Copy>
        {(['unknown', 'solid', 'liquid'] as const).map(value => <Action secondary key={value} label={`Form: ${value}`} selected={form === value} onPress={() => edit(() => setForm(value))} />)}
        <Copy>Which nutrition column did you enter?</Copy>
        {(['unknown', 'serving', '100'] as const).map(value => <Action secondary key={value} label={value === '100' ? 'Per 100 g/ml' : value === 'serving' ? 'Per labeled serving' : 'Column unknown'} selected={column === value} onPress={() => edit(() => setColumn(value))} />)}
        <Action secondary label="Use my saved goal, conditions and allergies" selected={personalize} onPress={() => edit(() => setPersonalize(v => !v))} />
        <Copy tone="muted">Optional. These checks use deterministic rules on the server, not AI. No medical restrictions are inferred.</Copy>
      </Card>
      <Card><Copy size="title">What you’ll log</Copy><Copy tone="muted">{ratio ? `${Number(ratio.toFixed(3))} × the label basis` : 'Enter a valid label basis and portion'}</Copy>
        {fields.map((field, index) => <Copy key={field}>{field}: {adjusted[index] == null ? 'Unknown' : `${adjusted[index]} ${index === 0 ? 'kcal' : 'g'}`}</Copy>)}
        <Copy size="caption" tone="muted">Calories rounded to whole kcal; nutrients to 0.1 g. Values remain label estimates.</Copy>
        <Action secondary label={reviewed ? 'Reviewed ✓' : 'I checked the label, units and portion'} onPress={() => setReviewed(true)} />
        {error !== '' && <Notice error title="Check your entry" message={error} />}
        <Action secondary label={analyzing ? 'Checking label…' : 'Explain this reviewed label'} disabled={!reviewed || analyzing} onPress={() => void inspect()} />
        <Action label="Save reviewed meal" disabled={!reviewed} onPress={() => { void save(); }} />
      </Card>
      {analysis && <><LabelInsights analysis={analysis} />{comparison && <><Copy size="title">A: previous label · B: this label</Copy><LabelInsights analysis={comparison} /></>}<Action secondary label="Compare with another label" onPress={() => navigation.push('LabelScanner', { compareWith: labelFacts, mealType: params.mealType })} /><Action secondary label="View these findings with Leo" onPress={() => navigation.navigate('LeoHelp', { labelAnalysis: analysis })} /></>}
    </>}
  </KeyboardAwareScrollView>;
}
