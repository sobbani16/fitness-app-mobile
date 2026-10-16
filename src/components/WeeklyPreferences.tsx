import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Pressable } from 'react-native';
import { getPlanningPreferences, savePlanningPreferences, PlanningPreferences } from '../api/weeklyPlan';
const diets = ['vegetarian','vegan','dairy-free','egg-free','soy-free','gluten-free','nut-free','peanut-free','fish-free','shellfish-free'];
export default function WeeklyPreferences({ disabled = false }: { disabled?: boolean }) {
  const [prefs, setPrefs] = useState<PlanningPreferences | null>(null);
  const [household, setHousehold] = useState('1');
  const [exclusions, setExclusions] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    getPlanningPreferences().then(p => {
      if (!active) return;
      setPrefs({ mealPrepStyle:p.mealPrepStyle, budgetLevel:p.budgetLevel, householdSize:p.householdSize, dietaryRestrictions:p.dietaryRestrictions, availableEquipment:p.availableEquipment });
      setHousehold(String(p.householdSize));setExclusions(p.dietaryRestrictions.filter(x=>x.startsWith('exclude:')).map(x=>x.slice(8)).join(', '));setMessage('');
    }).catch(()=>{if(active)setMessage('Could not load preferences. Retry before editing.');});
    return ()=>{active=false;};
  },[retry]);
  const save = async () => {
    if (!prefs) return;
    const householdSize = Number(household);
    if (!Number.isInteger(householdSize) || householdSize < 1 || householdSize > 12) {setMessage('Household size must be 1–12.');return;}
    setSaving(true);
    try {
      const next = {...prefs, householdSize, dietaryRestrictions:[...prefs.dietaryRestrictions.filter(x=>!x.startsWith('exclude:')), ...exclusions.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).map(x=>`exclude:${x}`)]};
      await savePlanningPreferences(next);setPrefs(next);setMessage('Saved. Generate or regenerate to apply these preferences.');
    } catch (e:any) {setMessage(e?.response?.data?.error || 'Could not save preferences. Try again.');}
    finally {setSaving(false);}
  };
  if (!prefs) return <View><Text>{message || 'Loading preferences…'}</Text>{!!message && <Button title="Retry preferences" onPress={()=>setRetry(n=>n+1)} />}</View>;
  const toggle = (key: 'dietaryRestrictions'|'availableEquipment', value: string) => setPrefs({...prefs,[key]:prefs[key].includes(value)?prefs[key].filter(x=>x!==value):[...prefs[key],value]});
  return <View style={{gap:8,marginBottom:20}}>
    <Text style={{fontWeight:'700',fontSize:18}}>Weekly preferences</Text>
    <Text>Ingredient filters cannot guarantee allergy-safe preparation. Plans use your saved targets; household size only scales shopping quantities.</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{diets.map(d=><Pressable key={d} accessibilityRole="checkbox" accessibilityLabel={d} accessibilityState={{checked:prefs.dietaryRestrictions.includes(d)}} disabled={disabled||saving} onPress={()=>toggle('dietaryRestrictions',d)}><Text>{prefs.dietaryRestrictions.includes(d)?'☑':'☐'} {d}</Text></Pressable>)}</View>
    <Text>Exclude ingredients (comma separated)</Text><TextInput accessibilityLabel="Excluded ingredients" value={exclusions} onChangeText={setExclusions} editable={!disabled&&!saving} placeholder="e.g. banana, chicken" style={{borderWidth:1,padding:8}} />
    <Text>Budget</Text><View style={{flexDirection:'row',gap:8}}>{(['low','medium','high'] as const).map(b=><Button key={b} title={`${prefs.budgetLevel===b?'✓ ':''}${b}`} disabled={disabled||saving} onPress={()=>setPrefs({...prefs,budgetLevel:b})} />)}</View>
    <Text>Preparation preference</Text>{(['daily_cooking','weekly_prep','twice_weekly_prep'] as const).map(p=><Button key={p} title={`${prefs.mealPrepStyle===p?'✓ ':''}${p.replaceAll('_',' ')}`} disabled={disabled||saving} onPress={()=>setPrefs({...prefs,mealPrepStyle:p})} />)}
    <Text>Available equipment (leave blank for no equipment filter)</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{['stovetop','microwave','oven','blender','refrigerator'].map(e=><Pressable key={e} accessibilityRole="checkbox" accessibilityLabel={e} accessibilityState={{checked:prefs.availableEquipment.includes(e)}} disabled={disabled||saving} onPress={()=>toggle('availableEquipment',e)}><Text>{prefs.availableEquipment.includes(e)?'☑':'☐'} {e}</Text></Pressable>)}</View>
    <Text>Household size</Text><TextInput accessibilityLabel="Household size" value={household} onChangeText={setHousehold} keyboardType="number-pad" editable={!disabled&&!saving} style={{borderWidth:1,padding:8}} />
    <Button title={saving?'Saving preferences…':'Save preferences'} onPress={save} disabled={disabled||saving} />
    {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
  </View>;
}
