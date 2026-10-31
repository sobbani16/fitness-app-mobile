import { trackEvent } from '../analytics/events';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { recognizeLabel } from '../services/ocr';
import { extractFromOcrText, classifyDocument, extractMergedLabel } from '../api/labelScanner';
import { Action, Card, Copy, Field, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { getSession } from '../storage/session';
import { useConfirmLeave } from '../hooks/useConfirmLeave';
export default function LabelScannerScreen() {
  const { isEnabled } = useFeatureFlags();
  const menuScanEnabled = isEnabled('menuScanning');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const focused = useIsFocused();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const generation = useRef(0);
  const lock = useRef(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [panel, setPanel] = useState<'nutrition' | 'ingredients' | 'allergens' | 'claims'>('nutrition');
  // Committed images per panel (capture order preserved; max 4 each).
  // `photo`/`text` hold the draft being reviewed before it's committed.
  const [saved, setSaved] = useState<Record<string, { uri: string | null; text: string }[]>>({});
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejected, setRejected] = useState<{ guess?: string } | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  useConfirmLeave(!handedOff && Boolean(photo || text.trim() || Object.values(saved).some(images => images.length)), busy && focused);
  useEffect(() => { if (focused) setHandedOff(false); }, [focused]);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => { if (!focused) generation.current++; }, [focused]);
  // Every panel key → ordered image list, with the active draft appended last.
  function collectedPanels() {
    const out: Record<string, { uri: string | null; text: string }[]> = { ...saved };
    if (text.trim() || photo) out[panel] = [...(out[panel] || []), { uri: photo, text }];
    return out;
  }
  function commitDraft(nextPanel?: string) {
    if (!text.trim() && !photo) { if (nextPanel) setPanel(nextPanel as typeof panel); return; }
    setSaved(prev => ({ ...prev, [panel]: [...(prev[panel] || []), { uri: photo, text }].slice(0, 4) }));
    setPhoto(null); setText(''); setManual(false); setShowRaw(false); setError('');
    if (nextPanel) setPanel(nextPanel as typeof panel);
  }
  function review(extracted: unknown = null, mergedResult: unknown = null) {
    trackEvent('label_review_opened');
    const collected = collectedPanels();
    const nutrition = (collected.nutrition || []).map(i => i.text).filter(Boolean).join('\n');
    const join = (key: string) => (collected[key] || []).map(i => i.text).filter(Boolean).join('\n');
    const ingredientText = join('ingredients').replace(/^ingredients\s*:\s*/gim, '');
    const result = extracted ? { ...(extracted as object), ...(ingredientText ? { ingredients: ingredientText } : {}) } : ingredientText ? { ingredients: ingredientText } : null;
    const labelPhotos = Object.fromEntries(Object.entries(collected).map(([k, list]) => [k, list.map(i => i.uri).filter(Boolean)]));
    setHandedOff(true);
    (route.params?.compareWith ? navigation.push : navigation.navigate)('PortionAdjust', { compareWith: route.params?.compareWith, extracted: result, merged: mergedResult, photoUri: (collected.nutrition || []).find(i => i.uri)?.uri || null, labelPhotos, allergenText: join('allergens'), claimText: join('claims'), ocrRawText: nutrition, mealType: route.params?.mealType || 'lunch' });
  }
  async function capture() {
    if (lock.current || !camera.current) return;
    lock.current = true; setBusy(true); setError('');
    const request = ++generation.current;
    try {
      trackEvent('label_capture_started');
      const image = await camera.current.takePictureAsync({ quality: 0.8 });
      if (request !== generation.current || !image) return;
      setPhoto(image.uri);
      const result = await recognizeLabel(image.uri);
      if (request !== generation.current) return;
      const ocrText = (result.text || '').slice(0, 20000);
      if (!ocrText.trim()) { setText(''); setError('No readable text. Retake in good light or enter values manually.'); return; }
      // Classify before showing: unrelated documents (visas, bills, receipts)
      // are rejected here and their text is never rendered to the screen.
      const verdict = await classifyDocument(ocrText).catch(() => null);
      if (request !== generation.current) return;
      if (verdict && verdict.type === 'UNSUPPORTED') { setRejected({ guess: verdict.guess }); setPhoto(null); return; }
      if (verdict && verdict.type === 'RESTAURANT_MENU') { navigation.navigate('MenuScan', { seedText: ocrText, mealType: route.params?.mealType }); return; }
      if (verdict && verdict.type === 'UNCERTAIN' && (verdict.guess === 'RESTAURANT_MENU' || (verdict.confidence ?? 0) < 0.4)) {
        // Low-confidence: keep the image but ask the user to confirm instead of guessing.
        setPhoto(image.uri); setText(ocrText); setError('Not sure this is a nutrition label. You can still correct the text below, or retake.');
        trackEvent('label_text_ready'); return;
      }
      setRejected(null);
      setText(ocrText);
      if (ocrText.trim()) trackEvent('label_text_ready');
    } catch { if (request === generation.current) setError('Could not read the label. Try again or enter it manually.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function extract() {
    const collected = collectedPanels();
    const payload = Object.fromEntries(Object.entries(collected)
      .map(([k, list]) => [k, list.map(i => i.text).filter(Boolean)])
      .filter(([, texts]) => (texts as string[]).length));
    const nutritionText = ((payload.nutrition as string[]) || []).join('\n');
    if (lock.current || !nutritionText.trim()) return;
    lock.current = true; setBusy(true); setError('');
    const request = ++generation.current, account = getSession()?.user.id;
    try {
      // Merge every captured image server-side with per-image provenance.
      const merged = await extractMergedLabel(payload).catch(() => null);
      if (request !== generation.current || account !== getSession()?.user.id) return;
      if (merged) { review(merged.merged, merged); return; }
      const result = await extractFromOcrText(nutritionText);
      if (request === generation.current && account === getSession()?.user.id) review(result);
    } catch { if (request === generation.current) setError('Nutrition extraction is unavailable. Your text is kept; retry or enter nutrition manually.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const activeMode = manual ? 'text' : 'camera';
  const modes: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; a11y: string }[] = [
    { key: 'camera', icon: 'camera-outline', label: 'Camera', a11y: 'Scan with camera' },
    { key: 'text', icon: 'create-outline', label: 'Type text', a11y: 'Type label text' },
    ...(menuScanEnabled ? [{ key: 'menu', icon: 'restaurant-outline' as const, label: 'Menu', a11y: 'Scan Restaurant Menu' }] : []),
    { key: 'manual', icon: 'keypad-outline', label: 'Manual', a11y: 'Enter nutrition manually' },
  ];
  function onModeTab(key: string) {
    if (key === activeMode) return;
    if (key === 'menu') { navigation.navigate('MenuScan', { mealType: route.params?.mealType }); return; }
    if (key === 'manual') { review(); return; }
    commitDraft(); // keep the current draft in its panel before switching
    if (key === 'text') setManual(true);
  }
  return <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
    <Copy accessibilityRole="header" size="heading">Scan a nutrition label</Copy>
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {modes.map(m => {
        const active = m.key === activeMode;
        return <Pressable key={m.key} accessibilityRole="button" accessibilityLabel={m.a11y} accessibilityState={{ selected: active }}
          disabled={busy} onPress={() => onModeTab(m.key)}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48,
            paddingHorizontal: active ? 14 : 0, flex: active ? 1 : 0, minWidth: 48, borderRadius: 14,
            borderWidth: 1, borderColor: active ? colors.primary : colors.border,
            backgroundColor: active ? colors.primary : colors.surface, opacity: busy ? 0.5 : pressed ? 0.7 : 1 })}>
          <Ionicons name={m.icon} size={20} color={active ? colors.onPrimary : colors.muted} />
          {active && <Copy style={{ color: colors.onPrimary, fontWeight: '700' }}>{m.label}</Copy>}
        </Pressable>;
      })}
    </View>
    <Copy tone="muted">Text is read on your device. Extraction sends your reviewed text to the server and may use AI — other panels stay as label text.</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['nutrition', 'ingredients', 'allergens', 'claims'] as const).map(value => <Action secondary key={value} label={`${value}${(saved[value]?.length || 0) + (panel === value && (text.trim() || photo) ? 1 : 0) ? ` (${(saved[value]?.length || 0) + (panel === value && (text.trim() || photo) ? 1 : 0)})` : ''}`} disabled={busy} selected={panel === value} onPress={() => {
      if (value === panel) return;
      commitDraft(value);
    }} />)}</View>
    {error !== '' && <Notice error title="Let’s try another way" message={error} />}
    {busy && <Skeleton label={photo ? 'Reading nutrition label…' : 'Preparing camera'} />}
    {!!rejected && <Card>
      <Notice error title="Not a food label" message="This doesn’t look like a food label or restaurant menu. Please scan food packaging or a menu." />
      <Action secondary label="Retake photo" onPress={() => { setRejected(null); setError(''); }} />
      {menuScanEnabled && <Action secondary label="Scan a restaurant menu" onPress={() => navigation.navigate('MenuScan', { mealType: route.params?.mealType })} />}
    </Card>}
    {!!saved[panel]?.length && <Card>
      <Copy size="caption" tone="muted">{saved[panel].length} saved {panel} photo{saved[panel].length === 1 ? '' : 's'} — merged in this order</Copy>
      {saved[panel].map((im, i) => <View key={`${panel}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {im.uri ? <Image accessibilityLabel={`${panel} photo ${i + 1}`} source={{ uri: im.uri }} style={{ width: 48, height: 48, borderRadius: 6 }} /> : null}
        <Copy size="caption" style={{ flex: 1 }}>#{i + 1} {im.uri ? '' : '(typed text)'}</Copy>
        <Action secondary label={`Edit ${panel} photo ${i + 1}`} disabled={busy} onPress={() => {
          if (text.trim() || photo) return; // commit or clear the draft first
          const list = [...saved[panel]]; const [it] = list.splice(i, 1);
          setSaved(prev => ({ ...prev, [panel]: list })); setPhoto(it.uri); setText(it.text); setManual(!it.uri);
        }} />
        <Action secondary label={`Move ${panel} photo ${i + 1} up`} disabled={busy || i === 0} onPress={() => {
          const list = [...saved[panel]]; [list[i - 1], list[i]] = [list[i], list[i - 1]];
          setSaved(prev => ({ ...prev, [panel]: list }));
        }} />
        <Action secondary label={`Remove ${panel} photo ${i + 1}`} disabled={busy} onPress={() => {
          const list = [...saved[panel]]; list.splice(i, 1);
          setSaved(prev => ({ ...prev, [panel]: list }));
        }} />
      </View>)}
    </Card>}
    {photo || manual ? <Card>
      {photo && <Image accessibilityLabel="Captured label" source={{ uri: photo }} style={{ width: '100%', height: 240 }} resizeMode="contain" />}
      {!showRaw && !manual && <Action secondary label="View or correct label text" onPress={() => setShowRaw(true)} />}
      {(showRaw || manual) && <Field maxLength={20000} label="Label text — review and correct" value={text} multiline editable={!busy} style={{ minHeight: 150, textAlignVertical: 'top' }} onChangeText={setText} />}
      <Action label="Extract nutrition for review" disabled={busy || !(((saved.nutrition || []).some(i => i.text.trim())) || (panel === 'nutrition' && text.trim()))} onPress={() => { void extract(); }} />
      <Action secondary label={`Save ${panel} photo & add another`} disabled={busy || (saved[panel]?.length || 0) >= 4} onPress={() => commitDraft()} />
      <Action secondary label="Retake label" disabled={busy} onPress={() => { generation.current++; setPhoto(null); setText(''); setManual(false); setError(''); }} />
    </Card> : permission?.granted ? <>
      {focused && <CameraView ref={camera} facing="back" style={{ height: 300, borderRadius: 20 }} />}
      <Action label="Capture nutrition label" disabled={busy} onPress={() => { void capture(); }} />
    </> : <Card><Notice title="Camera access" message="Allow camera access to photograph the label, or enter it manually below." />
      <Action label={permission?.canAskAgain === false ? 'Open camera settings' : 'Allow camera'} onPress={() => {
        void (permission?.canAskAgain === false ? Linking.openSettings() : requestPermission()).catch(() => setError('Could not open camera access. Use device settings or manual entry.'));
      }} /></Card>}
    <View style={{ height: 16 }} />
  </KeyboardAwareScrollView>;
}
