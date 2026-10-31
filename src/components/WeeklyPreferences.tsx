import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { getPlanningPreferences, savePlanningPreferences, PlanningPreferences } from '../api/weeklyPlan';
import { Action, Card, Copy, Field } from '../design/components';
import { useTheme } from '../design/theme';

const diets = ['vegetarian','vegan','dairy-free','egg-free','soy-free','gluten-free','nut-free','peanut-free','fish-free','shellfish-free'];
const cuisines = ['indian','italian','mexican','chinese','japanese','thai','mediterranean','middle eastern','american','continental','korean','vietnamese','greek','french','african','caribbean'];
const equipment = ['stovetop','microwave','oven','blender','refrigerator'];
const budgets = ['low','medium','high'] as const;
const prepStyles = ['daily_cooking','weekly_prep','twice_weekly_prep'] as const;

export function Chip({ label, selected, disabled, onPress, checkbox = false }: {
  label: string; selected: boolean; disabled?: boolean; onPress: () => void; checkbox?: boolean;
}) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole={checkbox ? 'checkbox' : 'button'} accessibilityLabel={label}
    accessibilityState={{ checked: checkbox ? selected : undefined, selected: checkbox ? undefined : selected, disabled }}
    disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
      borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface,
      opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}>
    <Copy size="caption" style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: selected ? '700' : '500' }}>
      {checkbox ? `${selected ? '✓' : '○'} ` : ''}{label}</Copy>
  </Pressable>;
}

export default function WeeklyPreferences({ disabled = false }: { disabled?: boolean }) {
  const [prefs, setPrefs] = useState<PlanningPreferences | null>(null);
  const [exclusions, setExclusions] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    getPlanningPreferences().then(p => {
      if (!active) return;
      setPrefs({ mealPrepStyle:p.mealPrepStyle, budgetLevel:p.budgetLevel, householdSize:p.householdSize, dietaryRestrictions:p.dietaryRestrictions, availableEquipment:p.availableEquipment });
      setExclusions(p.dietaryRestrictions.filter(x=>x.startsWith('exclude:')).map(x=>x.slice(8)).join(', '));setMessage('');
    }).catch(()=>{if(active)setMessage('Could not load preferences. Retry before editing.');});
    return ()=>{active=false;};
  },[retry]);
  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const next = {...prefs, dietaryRestrictions:[...prefs.dietaryRestrictions.filter(x=>!x.startsWith('exclude:')), ...exclusions.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).map(x=>`exclude:${x}`)]};
      await savePlanningPreferences(next);setPrefs(next);setMessage('Saved. Generate or regenerate to apply these preferences.');
    } catch (e:any) {setMessage(e?.response?.data?.error || 'Could not save preferences. Try again.');}
    finally {setSaving(false);}
  };
  if (!prefs) return <Card>
    <Copy tone="muted">{message || 'Loading preferences…'}</Copy>
    {!!message && <Action secondary label="Retry preferences" onPress={() => setRetry(n => n + 1)} />}
  </Card>;
  const off = disabled || saving;
  const toggle = (key: 'dietaryRestrictions'|'availableEquipment', value: string) => setPrefs({...prefs,[key]:prefs[key].includes(value)?prefs[key].filter(x=>x!==value):[...prefs[key],value]});
  return <Card>
    <Copy accessibilityRole="header" size="title" style={{ fontWeight: '600' }}>Weekly preferences</Copy>
    <Copy size="caption" tone="muted">Ingredient filters cannot guarantee allergy-safe preparation. Plans use your saved targets; household size only scales shopping quantities.</Copy>
    <Copy size="body" style={{ fontWeight: '600' }}>Dietary filters</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {diets.map(d => <Chip key={d} checkbox label={d} selected={prefs.dietaryRestrictions.includes(d)} disabled={off} onPress={() => toggle('dietaryRestrictions', d)} />)}
    </View>
    <Copy size="body" style={{ fontWeight: '600' }}>Preferred cuisines</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {cuisines.map(c => <Chip key={c} checkbox label={c} selected={prefs.dietaryRestrictions.includes(`cuisine:${c}`)} disabled={off} onPress={() => toggle('dietaryRestrictions', `cuisine:${c}`)} />)}
    </View>
    <Field label="Exclude ingredients (comma separated)" value={exclusions} onChangeText={setExclusions} editable={!off} placeholder="e.g. banana, chicken" />
    <Copy size="body" style={{ fontWeight: '600' }}>Budget</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {budgets.map(b => <Chip key={b} label={b} selected={prefs.budgetLevel === b} disabled={off} onPress={() => setPrefs({ ...prefs, budgetLevel: b })} />)}
    </View>
    <Copy size="body" style={{ fontWeight: '600' }}>Preparation preference</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {prepStyles.map(p => <Chip key={p} label={p.replaceAll('_', ' ')} selected={prefs.mealPrepStyle === p} disabled={off} onPress={() => setPrefs({ ...prefs, mealPrepStyle: p })} />)}
    </View>
    <Copy size="body" style={{ fontWeight: '600' }}>Available equipment</Copy>
    <Copy size="caption" tone="muted">Leave blank for no equipment filter.</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {equipment.map(e => <Chip key={e} checkbox label={e} selected={prefs.availableEquipment.includes(e)} disabled={off} onPress={() => toggle('availableEquipment', e)} />)}
    </View>
    <Action label={saving ? 'Saving preferences…' : 'Save preferences'} onPress={save} disabled={off} />
    {!!message && <Copy size="caption" tone="muted" accessibilityLiveRegion="polite">{message}</Copy>}
  </Card>;
}
