import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../design/theme';
import { useNavigation } from '@react-navigation/native';
import { Action, Copy, Field, Sheet } from '../design/components';
import { useDailyStats } from '../hooks/useDailyStats';
import { useMeals } from '../context/MealsContext';
import { useProfile } from '../context/ProfileContext';
import { loadFavorites, loadRecentFoods } from '../storage/favoriteFoods';
import { LoggedMeal } from '../storage/meals';
import { logWeight } from '../api/weight';
import { parseQuickText } from '../services/quickParse';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import {
  QUICK_WATER_ML,
  buildRepeatMeal,
  isTrustedRepeatMeal,
  parseWeightInput,
  quickRepeatChoices,
} from '../services/quickLog';

export default function QuickAdd() {
  const { isEnabled } = useFeatureFlags();
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 400;
  const pending = useRef<{ route: string; params?: object } | null>(null);
  const afterDismiss = useCallback(() => {
    const destination = pending.current;
    pending.current = null;
    if (destination) navigation.navigate(destination.route, destination.params);
  }, [navigation]);
  useEffect(() => {
    // Android removes a non-animated Modal on commit and has no onDismiss event.
    if (visible || Platform.OS === 'ios' || !pending.current) return;
    const frame = requestAnimationFrame(afterDismiss);
    return () => cancelAnimationFrame(frame);
  }, [visible, afterDismiss]);
  function go(route: string, params?: object) {
    if (pending.current) return;
    pending.current = { route, params };
    setVisible(false);
  }

  const daily = useDailyStats(false);
  const meals = useMeals();
  const { profile, update } = useProfile();
  const [choices, setChoices] = useState<LoggedMeal[]>([]);
  const [weightText, setWeightText] = useState('');
  const [status, setStatus] = useState<{ message: string; error?: boolean; undo?: () => Promise<void> } | null>(null);
  const busy = useRef(false);
  const [isBusy, setBusy] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    if (!visible) return;
    const gen = ++generation.current;
    Promise.all([loadFavorites(), loadRecentFoods()])
      .then(([favorites, recents]) => { if (gen === generation.current) setChoices(quickRepeatChoices(favorites, recents)); })
      .catch(() => { if (gen === generation.current) setChoices([]); });
  }, [visible]);

  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setBusy(true);
    try { await action(); }
    catch { setStatus({ message: 'Could not save. Please try again.', error: true }); }
    finally { busy.current = false; setBusy(false); }
  }

  const addWater = (delta: number) => run(async () => {
    try {
      const stats = await daily.addWater(delta);
      setStatus(delta > 0
        ? { message: `+${QUICK_WATER_ML} ml water${stats ? ` · today ${stats.waterMl.toLocaleString()} ml` : ''}`, undo: async () => { await daily.addWater(-QUICK_WATER_ML); setStatus(null); } }
        : null);
    } catch {
      setStatus({ message: 'Could not save water. Please try again.', error: true });
    }
  });

  const repeatMeal = (meal: LoggedMeal) => {
    if (!isTrustedRepeatMeal(meal)) {
      // Uncertain portion or nutrition re-opens the normal review flow.
      go('FoodEntry', { meal });
      return;
    }
    void run(async () => {
      const copy = buildRepeatMeal(meal);
      try {
        await meals.add(copy);
        setStatus({ message: `${meal.name} logged again · ${Math.round(meal.calories)} kcal`, undo: async () => { await meals.remove(copy.id); setStatus(null); } });
      } catch {
        setStatus({ message: 'Could not save the meal. Please try again.', error: true });
      }
    });
  };

  const saveWeight = () => run(async () => {
    if (!profile) { go('EditProfile'); return; }
    const parsed = parseWeightInput(weightText, profile.units);
    if (parsed.error || parsed.weightKg == null) { setStatus({ message: parsed.error ?? 'Check the weight.', error: true }); return; }
    try {
      if (parsed.weightKg === profile.weightKg) await logWeight(parsed.weightKg);
      else await update({ weightKg: parsed.weightKg });
      setWeightText('');
      setStatus({ message: `Weight saved · ${parsed.weightKg} kg` });
    } catch {
      setStatus({ message: 'Could not save weight. Please try again.', error: true });
    }
  });

  const [voiceText, setVoiceText] = useState('');
  const parsed = parseQuickText(voiceText, profile?.units);
  const parsedLabel = parsed.type === 'water' ? `Water ${parsed.ml} ml`
    : parsed.type === 'weight' ? `Weight ${profile?.units === 'imperial' ? `${Math.round(parsed.weightKg * 2.20462)} lb` : `${parsed.weightKg} kg`}`
    : null;
  const saveParsed = () => run(async () => {
    if (parsed.type === 'water') {
      const r = await daily.addWater(parsed.ml);
      setStatus({ message: `Water logged${r ? ` · today ${r.waterMl.toLocaleString()} ml` : ''}`, undo: async () => { await daily.addWater(-parsed.ml); setStatus(null); } });
      setVoiceText('');
    } else if (parsed.type === 'weight') {
      if (!profile) { go('EditProfile'); return; }
      if (parsed.weightKg === profile.weightKg) await logWeight(parsed.weightKg); else await update({ weightKg: parsed.weightKg });
      setStatus({ message: `Weight saved · ${parsed.weightKg} kg` });
      setVoiceText('');
    }
  });

  return <><Pressable accessibilityRole="button" accessibilityLabel="Add" accessibilityHint="Open quick logging actions"
      onPress={() => { setStatus(null); setVisible(true); }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2,
        minHeight: 40, minWidth: 40, paddingHorizontal: compact ? 8 : 12, paddingVertical: 6,
        borderRadius: 20, backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 })}>
      <Ionicons name="add" size={20} color={colors.primary} />
      {!compact && <Copy size="caption" style={{ color: colors.primary, fontWeight: '700' }}>Add</Copy>}
    </Pressable>
    <Sheet visible={visible} onClose={() => { pending.current = null; setVisible(false); setVoiceText(''); }} onDismiss={afterDismiss} title="What would you like to log?">
      <Field label="Say or type it" value={voiceText} onChangeText={setVoiceText} autoCapitalize="none"
        placeholder="e.g. “drank 500 ml” or “weight 154 lb” — use your keyboard’s mic" />
      {voiceText.trim() !== '' && <Copy size="caption" tone={parsedLabel ? 'primary' : 'muted'}>{parsedLabel ? `${parsedLabel} — tap Log it` : 'Not recognized — try “water 250 ml”, “2 glasses”, or “weight 70 kg”'}</Copy>}
      <Action label="Log it" secondary disabled={isBusy || !parsedLabel} onPress={() => { void saveParsed(); }} />
      <Action label={`+${QUICK_WATER_ML} ml water`} hint={daily.stats ? `Today ${daily.stats.waterMl.toLocaleString()} ml` : 'Log a glass of water'} disabled={isBusy} onPress={() => { void addWater(QUICK_WATER_ML); }} />
      {daily.waterSyncError && <><Copy tone="danger" size="caption">{daily.waterSyncError}</Copy>
        <Action secondary label="Retry water sync" disabled={isBusy} onPress={() => { void run(daily.retryWaterSync); }} /></>}
      {choices.map(meal => <Action key={meal.id} secondary
        label={`${meal.name} · ${Math.round(meal.calories)} kcal`}
        hint={isTrustedRepeatMeal(meal) ? 'Log the same saved portion' : 'Review the saved portion before logging'}
        disabled={isBusy}
        onPress={() => repeatMeal(meal)} />)}
      <Field label={`Weight${profile ? ` (${profile.units === 'imperial' ? 'lb' : 'kg'})` : ''}`}
        value={weightText} onChangeText={setWeightText} keyboardType="decimal-pad"
        placeholder={profile?.units === 'imperial' ? 'e.g. 154' : 'e.g. 70'} />
      <Action label="Save weight" secondary disabled={isBusy || !weightText.trim()} onPress={() => { void saveWeight(); }} />
      {status && <>
        <Copy accessibilityLiveRegion="polite" tone={status.error ? 'danger' : 'muted'} size="caption">{status.message}</Copy>
        {status.undo && <Action secondary label="Undo" onPress={() => { void run(async () => { try { await status.undo!(); } catch { setStatus({ message: 'Could not undo. Please check your diary.', error: true }); } }); }} />}
      </>}
      <Copy accessibilityRole="header" size="caption" style={{ fontWeight: '700', marginTop: 4 }}>More ways to log</Copy>
      {isEnabled('nutritionLabelScanning') && <Action label="Scan nutrition label" secondary onPress={() => go('LabelScanner', {})} />}
      <Action label="Search food" secondary onPress={() => go('FoodEntry', { mode: 'search' })} />
      <Action label="Log a meal" secondary onPress={() => go('LogMeal')} />
      <Action label="Log water" secondary onPress={() => go('Dashboard', { waterRequest: Date.now() })} />
      <Action label="Log exercise" secondary onPress={() => go('LogExercise')} />
      <Action label="Update weight" secondary onPress={() => go('EditProfile')} />
      <Copy tone="muted" size="caption">Repeated foods log their saved portion. Estimated or edited entries open a quick review first.</Copy>
    </Sheet></>;
}
