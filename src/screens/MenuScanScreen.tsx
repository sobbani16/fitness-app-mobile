import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { recognizeLabel } from '../services/ocr';
import { scanMenu, MenuItem } from '../api/labelScanner';
import { Action, Card, Copy, Field, ListRow, IconAction, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { useMeals } from '../context/MealsContext';
import { MealType } from '../storage/meals';
import { applyMenuCorrection, MenuCorrection } from '../services/menuCorrections';

function itemCaloriesText(i: MenuItem): string {
  if (i.calorieSource === 'user-entered' && i.calories != null) return `${i.calories} kcal (entered)`;
  if (i.nutritionSource === 'restaurant-reported' && i.calories != null) return `${i.calories} kcal`;
  if (i.estimate) return `≈ ${i.estimate.calories.min}–${i.estimate.calories.max} kcal`;
  return 'Not enough info';
}
function itemMacros(i: MenuItem, portionG: number) {
  if (i.estimate) {
    const midG = (i.estimate.calories.portionGMin + i.estimate.calories.portionGMax) / 2;
    const scale = midG > 0 ? portionG / midG : 1;
    const mid = (r: { min: number; max: number }) => Math.round(((r.min + r.max) / 2) * scale * 10) / 10;
    return { calories: Math.round(mid(i.estimate.calories) * scale), protein_g: mid(i.estimate.proteinG), carbs_g: mid(i.estimate.carbsG), fat_g: mid(i.estimate.fatG) };
  }
  return { calories: i.calories ?? 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

export default function MenuScanScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const focused = useIsFocused();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const { add } = useMeals();
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

  const sections = items ? [...new Set(items.map(i => i.section).filter(Boolean) as string[])] : [];
  const filtered = (items || []).filter(i =>
    (!query || i.name.toLowerCase().includes(query.toLowerCase()) || (i.description || '').toLowerCase().includes(query.toLowerCase())) &&
    (!sectionFilter || i.section === sectionFilter));

  const toggle = (i: MenuItem) => {
    const next = new Map(selected);
    if (next.has(i.name)) next.delete(i.name); else next.set(i.name, 200);
    setSelected(next);
  };
  const selectedItems = (items || []).filter(i => selected.has(i.name));
  const total = selectedItems.reduce((s, i) => {
    if (i.estimate) { const mid = (i.estimate.calories.min + i.estimate.calories.max) / 2; return s + Math.round(mid); }
    return s + (i.calories ?? 0);
  }, 0);

  async function saveAll() {
    setBusy(true);
    try {
      for (const i of selectedItems) {
        const portionG = selected.get(i.name) || 200;
        const macros = itemMacros(i, portionG);
        await add({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          name: i.name, calories: macros.calories, mealType,
          macros: { protein_g: macros.protein_g, carbs_g: macros.carbs_g, fat_g: macros.fat_g },
          quantityG: portionG,
          source: i.nutritionSource === 'restaurant-reported' ? `restaurant: ${i.name}` : `restaurant estimate: ${i.name}`,
          feedback: 'restaurant-scan',
          description: [i.description, i.explanation].filter(Boolean).join(' — '),
        });
      }
      setSaved(true);
    } catch { setError('Could not save. Try again.'); }
    finally { setBusy(false); }
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
      {items && <>
        <Copy size="heading">{restaurant || 'Menu'} · {items.length} item{items.length === 1 ? '' : 's'}</Copy>
        <Field label="Search dishes" value={query} onChangeText={setQuery} />
        {!!sections.length && <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[null, ...sections].map(s => <Action secondary key={s || 'all'} label={s || 'All'} selected={sectionFilter === s} onPress={() => setSectionFilter(s)} />)}
        </View>}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          {filtered.map(i => <View key={i.name}><ListRow title={i.name}
            subtitle={`${[i.section, i.price != null ? `${i.currency == null ? '' : i.currency === 'INR' ? '₹' : i.currency === 'EUR' ? '€' : i.currency === 'GBP' ? '£' : '$'}${i.price}${(i as any).priceAmbiguous ? ' (price?)' : ''}` : null, itemCaloriesText(i), i.explanation && i.nutritionSource !== 'restaurant-reported' ? i.nutritionSource === 'estimated' ? `est. from ${i.matchedTo?.name}` : 'not enough info' : null].filter(Boolean).join(' · ')}${i.nutritionSource === 'restaurant-reported' ? ' · restaurant-reported' : ''}`}
            onPress={() => toggle(i)}
          ><IconAction label={selected.has(i.name) ? `Remove ${i.name}` : `Add ${i.name}`} icon={selected.has(i.name) ? '✓' : '+'} onPress={() => toggle(i)} /></ListRow>
          {(i.priceAmbiguous || correcting === i.name) && <View style={{ paddingHorizontal: 8, gap: 6 }}>
            <Copy size="caption" tone="muted">Is “{i.price}” a price, calories, or something else?</Copy>
            {correcting === i.name ? <>
              <Field label="Number" value={corrValue} keyboardType="decimal-pad" onChangeText={setCorrValue} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['price', 'calories', 'quantity', 'ignore'] as const).map(kind => <Action secondary key={kind} label={`Mark ${i.name} ${kind}`} onPress={() => {
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
        <Action secondary label="Scan another menu" onPress={() => { setItems(null); setPages([]); setSelected(new Map()); setSaved(false); setError(''); }} />
      </>}
    </View>
  </View>;
}
