import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Location from 'expo-location';
import KeyboardAwareScrollView from './KeyboardAwareScrollView';
import { Action, Card, Copy, Field, Notice } from '../design/components';
import { useTheme } from '../design/theme';
import { ActivityLevel, Goal, Profile, Sex, UnitSystem } from '../storage/profile';
import { countryToUnitSystem } from '../util/units';
export type ProfileFormData = Omit<Profile, 'createdAt'>;
export const GOAL_LABELS: Record<Goal, string> = { weight_loss: 'Weight loss', muscle_gain: 'Muscle gain', body_recomposition: 'Body recomposition', maintain: 'Maintain weight' };
export const ACTIVITY_LABELS: Record<ActivityLevel, string> = { sedentary: 'Mostly seated', light: 'Light activity', moderate: 'Moderate activity', active: 'Active', very_active: 'Very active' };
interface Props {
  initial?: Partial<Profile> | null; title?: string; subtitle?: string; submitLabel?: string; saving?: boolean;
  onSubmit: (data: ProfileFormData) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  footer?: React.ReactNode;
}
/** Canonical values stay unchanged when toggling display units; only editing changes the measurement. */
function Measurement({ label, value, factor, onChange, disabled }: { label: string; value: number | null; factor: number; onChange: (n: number | null) => void; disabled: boolean }) {
  const canonical = useRef(value); canonical.current = value;
  const [text, setText] = useState(value === null ? '' : String(Math.round(value * factor * 10000) / 10000));
  useEffect(() => { setText(canonical.current === null ? '' : String(Math.round(canonical.current * factor * 10000) / 10000)); }, [factor]);
  return <Field label={label} value={text} editable={!disabled} keyboardType="decimal-pad" onChangeText={raw => {
    const normalized = raw.replace(',', '.'); setText(normalized);
    onChange(normalized.trim() && /^(\d+\.?\d*|\.\d+)$/.test(normalized) ? Number(normalized) / factor : normalized.trim() ? NaN : null);
  }} />;
}
export default function ProfileForm({ initial, title = 'Your profile', subtitle = 'These details help estimate your targets. They are not medical advice.', submitLabel = 'Save changes', saving = false, onSubmit, onDirtyChange, footer }: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState(initial?.name || '');
  const [age, setAge] = useState(initial?.age === undefined ? '' : String(initial.age));
  const [sex, setSex] = useState<Sex | null>(initial?.sex || null);
  const [activity, setActivity] = useState<ActivityLevel | null>(initial?.activityLevel || null);
  const [goal, setGoal] = useState<Goal | null>(initial?.goal || null);
  const [units, setUnits] = useState<UnitSystem>(initial?.units || 'metric');
  const [height, setHeight] = useState<number | null>(initial?.heightCm ?? null);
  const [weight, setWeight] = useState<number | null>(initial?.weightKg ?? null);
  const [goalWeight, setGoalWeight] = useState<number | null>(initial?.goalWeightKg ?? null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [detecting, setDetecting] = useState(false);
  const lock = useRef(false), locationGeneration = useRef(0);
  useEffect(() => () => { locationGeneration.current++; }, []);
  const dirty = () => onDirtyChange?.(true);
  const disabled = busy || saving;
  const selectUnits = (unit: UnitSystem) => { locationGeneration.current++; setDetecting(false); setUnits(unit); dirty(); };
  const detectUnits = async () => {
    const token = ++locationGeneration.current; setDetecting(true); setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (token !== locationGeneration.current) return;
      if (!permission.granted) throw new Error('Location was not allowed. Choose your units above.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const places = await Location.reverseGeocodeAsync(position.coords);
      if (token !== locationGeneration.current) return;
      if (!places[0]?.isoCountryCode) throw new Error('Could not identify your region. Choose your units above.');
      setUnits(countryToUnitSystem(places[0].isoCountryCode)); dirty();
    } catch (e: any) { if (token === locationGeneration.current) setError(e.message || 'Choose units manually.'); }
    finally { if (token === locationGeneration.current) setDetecting(false); }
  };
  const submit = async () => {
    if (lock.current || saving) return;
    setError('');
    if (!name.trim() || name.trim().length > 100) return setError('Enter a name between 1 and 100 characters.');
    if (!/^\d+$/.test(age) || Number(age) < 18 || Number(age) > 120) return setError('Enter a whole-number age from 18 to 120.');
    if (!sex || !activity || !goal) return setError('Choose sex, activity level and a goal.');
    if (height === null || !Number.isFinite(height) || height < 50 || height > 260) return setError('Enter a height from 50 to 260 cm (about 20 to 102 inches).');
    if (weight === null || !Number.isFinite(weight) || weight < 20 || weight > 400) return setError('Enter a weight from 20 to 400 kg (about 44 to 882 lb).');
    if (goalWeight !== null && (!Number.isFinite(goalWeight) || goalWeight < 20 || goalWeight > 400)) return setError('Goal weight must be from 20 to 400 kg, or left blank.');
    lock.current = true; setBusy(true); locationGeneration.current++; setDetecting(false);
    try { await onSubmit({ name: name.trim(), age: Number(age), sex, heightCm: height, weightKg: weight, ...(goalWeight === null ? {} : { goalWeightKg: goalWeight }), activityLevel: activity, goal, units }); }
    catch (e: any) { setError(e?.response?.data?.error || e.message || 'Could not save. Your edits are still here; try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const options = <T extends string,>(values: T[], value: T | null, change: (v: T) => void, labels: Partial<Record<T, string>> = {}) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{values.map(v => <Action key={v} label={labels[v] || v[0].toUpperCase() + v.slice(1)} secondary={value !== v} selected={value === v} disabled={disabled} onPress={() => { change(v); dirty(); }} />)}</View>;
  return <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
    <Copy size="title" accessibilityRole="header">{title}</Copy><Copy tone="muted">{subtitle}</Copy>
    <Card><Copy size="heading">About you</Copy><Field label="Name" value={name} maxLength={100} editable={!disabled} onChangeText={v => { setName(v); dirty(); }} autoCapitalize="words" />
      <Field label="Age (years)" value={age} editable={!disabled} keyboardType="number-pad" onChangeText={v => { setAge(v); dirty(); }} />
      <Copy>Sex used for calorie estimates</Copy>{options(['male', 'female', 'other'] as Sex[], sex, setSex)}
      <Copy tone="muted">Current calorie formulas have limited sex categories. Targets are estimates, not a clinical assessment.</Copy>
    </Card>
    <Card><Copy size="heading">Measurements</Copy>{options(['metric', 'imperial'] as UnitSystem[], units, selectUnits, { metric: 'kg / cm', imperial: 'lb / inches' })}
      <Copy tone="muted">Optional: use your location to choose regional units. You can choose them yourself without location access.</Copy>
      <Action secondary label={detecting ? 'Finding region…' : 'Use my location for units'} disabled={disabled || detecting} onPress={() => void detectUnits()} />
      <Measurement label={`Height (${units === 'metric' ? 'cm' : 'inches'})`} value={height} factor={units === 'metric' ? 1 : 1 / 2.54} disabled={disabled} onChange={v => { setHeight(v); dirty(); }} />
      <Measurement label={`Current weight (${units === 'metric' ? 'kg' : 'lb'})`} value={weight} factor={units === 'metric' ? 1 : 1 / 0.45359237} disabled={disabled} onChange={v => { setWeight(v); dirty(); }} />
      <Measurement label={`Goal weight (${units === 'metric' ? 'kg' : 'lb'}, optional)`} value={goalWeight} factor={units === 'metric' ? 1 : 1 / 0.45359237} disabled={disabled} onChange={v => { setGoalWeight(v); dirty(); }} />
      <Copy tone="muted">Changing current weight saves a weight-history entry. Changing units alone does not.</Copy>
    </Card>
    <Card><Copy size="heading">Your preferences</Copy><Copy>Activity level</Copy>{options(Object.keys(ACTIVITY_LABELS) as ActivityLevel[], activity, setActivity, ACTIVITY_LABELS)}<Copy>Goal</Copy>{options(Object.keys(GOAL_LABELS) as Goal[], goal, setGoal, GOAL_LABELS)}</Card>
    {!!error && <Notice title="Check your profile" message={error} error />}
    <Action label={disabled ? 'Saving…' : submitLabel} disabled={disabled || detecting} onPress={() => void submit()} />
    {footer}
  </KeyboardAwareScrollView>;
}
