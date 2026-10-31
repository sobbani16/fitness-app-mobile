import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useRoute } from '@react-navigation/native';
import { recognizeLabel } from '../services/ocr';
import { scanMenu, MenuItem } from '../api/labelScanner';
import { Action, Card, Copy, Field, ListRow, IconAction, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { useMeals } from '../context/MealsContext';
import { LoggedMeal, MealType } from '../storage/meals';
import { itemMacros } from '../services/menuLogging';
import { applyMenuCorrection } from '../services/menuCorrections';
import { useConfirmLeave } from '../hooks/useConfirmLeave';

function itemCaloriesText(i: MenuItem): string {
  if (i.calorieSource === 'user-entered' && i.calories != null) return `${i.calories} kcal (entered)`;
  if (i.nutritionSource === 'restaurant-reported' && i.calories != null) return `${i.calories} kcal`;
  if (i.estimate) return `≈ ${i.estimate.calories.min}–${i.estimate.calories.max} kcal`;
  return 'Not enough info';
}

export default function MenuScanScreen() {
  const route = useRoute<any>();
  const focused = useIsFocused();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const { add } = useMeals();
  const saveLock = useRef(false);
  const pendingMeals = useRef(new Map<string, LoggedMeal>());
  const savedNames = useRef(new Set<string>());
  const [pages, setPages] = useState<{ uri: string; text: string }[]>([]);
  const [items, setItems] = useState<MenuItem[] | null>(route.params?.seedText ? null : null);
  const [restaurant, setRestaurant] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [query, setQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [corrValue, setCorrValue] = useState('');
  const [corrCurrency, setCorrCurrency] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const confirmLeave = useConfirmLeave(!saved && Boolean(pages.length || items || route.params?.seedText), busy);
  const mealType: MealType = route.params?.mealType || 'lunch';
  const generation = useRef(0);

  async function runScan(texts: string[]) {
    setBusy(true); setError('');
    try {
      const r = await scanMenu(texts, restaurant || undefined);
      setRestaurant(r.restaurant);
      setItems(r.items);
    } catch (e: any) { setError(e?.response?.data?.error || 'Could not read the menu. Try a clearer photo.'); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (route.params?.seedText) runScan([route.params.seedText]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function capture(fromLibrary: boolean) {
    if (busy) return;
    const g = ++generation.current;
    setBusy(true); setError('');
    try {
      let uri: string | null = null;
      if (fromLibrary) {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { setError('Photo library access needed, or take a photo instead.'); return; }
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
        if (res.canceled || !res.assets?.[0]?.uri) return;
        uri = res.assets[0].uri;
      } else {
        if (!camera.current) return;
        const img = await camera.current.takePictureAsync({ quality: 0.8 });
        uri = img?.uri || null;
      }
      if (!uri || g !== generation.current) return;
      const ocr = await recognizeLabel(uri);
      if (g !== generation.current) return;
      const next = [...pages, { uri, text: ocr.text || '' }].slice(0, 6);
      setPages(next);
      if (ocr.text?.trim()) await runScan(next.map(p => p.text));
      else setError('No readable text on that page. Retake in good light.');
    } catch { if (g === generation.current) setError('Could not read the menu. Try again.'); }
    finally { setBusy(false); }
  }

  // Collapse OCR variants of the same section ("Drink"/"Drinks", "Side Salad O").
  const normSection = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '');
  const sectionLabels = new Map<string, string>();
  for (const i of items || []) {
    const k = normSection(i.section);
    if (k && !sectionLabels.has(k)) sectionLabels.set(k, i.section!.trim());
  }
  const sections = [...sectionLabels.keys()];
  const filtered = (items || []).filter(i =>
    (!query || i.name.toLowerCase().includes(query.toLowerCase()) || (i.description || '').toLowerCase().includes(query.toLowerCase())) &&
    (!sectionFilter || normSection(i.section) === sectionFilter));

  const toggle = (i: MenuItem) => {
    if (saveLock.current || saved) return;
    const next = new Map(selected);
    if (next.has(i.name)) next.delete(i.name); else next.set(i.name, 200);
    setSelected(next);
  };
  const selectedItems = (items || []).filter(i => selected.has(i.name));
  const total = selectedItems.filter(i => i.estimate || i.calories != null)
    .reduce((sum, i) => sum + itemMacros(i, selected.get(i.name) || 200).calories, 0);

  async function saveAll() {
    if (saveLock.current || saved) return;
    saveLock.current = true;
    setBusy(true); setError('');
    try {
      // Items with no calories and no estimate have no nutrition data —
      // never log them as a fabricated zero. Skip and tell the user.
      const loggable = selectedItems.filter(i => i.estimate || i.calories != null);
      const skipped = selectedItems.filter(i => !(i.estimate || i.calories != null));
      for (const i of loggable) {
        if (savedNames.current.has(i.name)) continue;
        const portionG = selected.get(i.name) || 200;
        const macros = itemMacros(i, portionG);
        const pending = pendingMeals.current.get(i.name);
        const entry = {
          id: pending?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: pending?.createdAt || new Date().toISOString(),
          name: i.name, calories: macros.calories, mealType,
          macros: { protein_g: macros.protein_g, carbs_g: macros.carbs_g, fat_g: macros.fat_g },
          quantityG: portionG,
          source: i.nutritionSource === 'restaurant-reported' ? `restaurant: ${i.name}` : `restaurant estimate: ${i.name}`,
          feedback: 'restaurant-scan',
          description: [i.description, i.explanation].filter(Boolean).join(' — '),
        };
        pendingMeals.current.set(i.name, entry);
        await add(entry);
        savedNames.current.add(i.name);
      }
      setSaved(skipped.length === 0);
      setSkipped(skipped.map(i => i.name));
    } catch { setError('Could not save. Try again.'); }
    finally { saveLock.current = false; setBusy(false); }
  }

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Copy size="title" accessibilityRole="header">Scan a restaurant menu</Copy>
      {!items && <>
        {pages.length === 0 && <Copy tone="muted">Photograph each menu page. We read it on your device and look for dishes, prices and calories.</Copy>}
        {pages.map((p, idx) => <Image key={idx} source={{ uri: p.uri }} style={{ width: '100%', height: 120, borderRadius: 8 }} resizeMode="cover" accessibilityLabel={`Menu page ${idx + 1}`} />)}
        {busy && <Skeleton label="Reading menu…" />}
        {permission?.granted ? <>
          {focused && <CameraView ref={camera} facing="back" style={{ height: 200, borderRadius: 16 }} />}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Action label={pages.length ? 'Add another page' : 'Capture menu'} disabled={busy} onPress={() => void capture(false)} />
            <Action secondary label="Photo library" disabled={busy} onPress={() => void capture(true)} />
          </View>
        </> : <Card>
          <Notice title="Camera access" message="Allow camera access or pick a photo from your library." />
          <Action label={permission?.canAskAgain === false ? 'Open settings' : 'Allow camera'} onPress={() => void requestPermission()} />
          <Action secondary label="Photo library" onPress={() => void capture(true)} />
        </Card>}
      </>}
      {!!error && <Notice error title="Try again" message={error} />}
      {skipped.length > 0 && <Notice title="Skipped — no nutrition info" message={`Not logged because calories and macros are unknown: ${skipped.join(', ')}. Use "Correct the number" to enter calories, or log the item manually.`} />}
      {items && <>
        <Copy size="heading">{restaurant || 'Menu'} · {items.length} item{items.length === 1 ? '' : 's'}</Copy>
        <Field label="Search dishes" value={query} onChangeText={setQuery} />
        {!!sections.length && <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[null, ...sections].map(s => <Action secondary key={s || 'all'} label={s ? sectionLabels.get(s)! : 'All'} selected={sectionFilter === s} onPress={() => setSectionFilter(s)} />)}
        </View>}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          {filtered.map(i => <View key={i.name}><ListRow title={i.name}
            subtitle={`${[i.section, i.price != null ? `${i.currency == null ? '' : i.currency === 'INR' ? '₹' : i.currency === 'EUR' ? '€' : i.currency === 'GBP' ? '£' : '$'}${i.price}${(i as any).priceAmbiguous ? ' (price?)' : ''}` : null, itemCaloriesText(i), i.explanation && i.nutritionSource !== 'restaurant-reported' ? i.nutritionSource === 'estimated' ? `est. from ${i.matchedTo?.name}` : 'not enough info' : null].filter(Boolean).join(' · ')}${i.nutritionSource === 'restaurant-reported' ? ' · restaurant-reported' : ''}`}
            onPress={() => toggle(i)}
          ><IconAction label={selected.has(i.name) ? `Remove ${i.name}` : `Add ${i.name}`} icon={selected.has(i.name) ? '✓' : '+'} onPress={() => toggle(i)} /></ListRow>
          {(!saved && !savedNames.current.has(i.name) || correcting === i.name) && <View style={{ paddingHorizontal: 8, gap: 6 }}>
            <Copy size="caption" tone="muted">{i.priceAmbiguous ? `Is “${i.price}” a price, calories, or something else?` : 'Review the dish’s calories or price.'}</Copy>
            {correcting === i.name ? <>
              <Field label="Number" value={corrValue} keyboardType="decimal-pad" onChangeText={setCorrValue} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['price', 'calories', 'quantity', 'ignore'] as const).map(kind => <Action secondary key={kind} label={`Mark ${i.name} ${kind}`} onPress={() => {
                  if (saveLock.current) return;
                  const num = corrValue.trim() === '' ? undefined : Number(corrValue);
                  setItems(prev => (prev || []).map(x => x.name === i.name ? applyMenuCorrection(x, { kind, value: num, currency: corrCurrency }) : x));
                  setCorrecting(null);
                }} />)}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['INR', 'USD', 'GBP', 'EUR'] as const).map(cur => <Action secondary key={cur} label={`Currency ${cur}`} selected={corrCurrency === cur} onPress={() => setCorrCurrency(c => c === cur ? null : cur)} />)}
                <Action secondary label="Cancel correction" onPress={() => setCorrecting(null)} />
              </View>
            </> : <Action secondary label={`Correct the number for ${i.name}`} onPress={() => { setCorrecting(i.name); setCorrValue(i.price == null ? '' : String(i.price)); setCorrCurrency(i.currency); }} />}
          </View>}
          </View>)}
          {!filtered.length && <Copy tone="muted">No dishes match.</Copy>}
        </ScrollView>
        {!!selectedItems.length && <Card>
          <Copy size="heading">Your order · ≈ {total} kcal</Copy>
          {selectedItems.map(i => <Copy key={i.name} size="caption" tone="muted">{i.name} — {itemCaloriesText(i)}</Copy>)}
          <Copy size="caption" tone="muted">Estimates are approximate; actual portions and recipes vary.</Copy>
          <Action label={saved ? 'Saved ✓' : `Log ${selectedItems.length} dish${selectedItems.length === 1 ? '' : 'es'}`} disabled={busy || saved} onPress={() => void saveAll()} />
        </Card>}
        <Action secondary label="Scan another menu" disabled={busy} onPress={() => confirmLeave(() => { setItems(null); setPages([]); setSelected(new Map()); setSaved(false); setError(''); setSkipped([]); pendingMeals.current.clear(); savedNames.current.clear(); })} />
      </>}
    </View>
  </View>;
}
