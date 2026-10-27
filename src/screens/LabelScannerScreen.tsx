import { trackEvent } from '../analytics/events';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { recognizeLabel } from '../services/ocr';
import { extractFromOcrText } from '../api/labelScanner';
import { Action, Card, Copy, Field, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { getSession } from '../storage/session';
export default function LabelScannerScreen() {
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
  const [panels, setPanels] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => { if (!focused) generation.current++; }, [focused]);
  function review(extracted: unknown = null) {
    trackEvent('label_review_opened');
    const collected = { ...panels, [panel]: text };
    const nutrition = collected.nutrition || '';
    const result = extracted ? { ...(extracted as object), ...(collected.ingredients ? { ingredients: collected.ingredients.replace(/^ingredients\s*:\s*/i, '') } : {}) } : collected.ingredients ? { ingredients: collected.ingredients.replace(/^ingredients\s*:\s*/i, '') } : null;
    (route.params?.compareWith ? navigation.push : navigation.navigate)('PortionAdjust', { compareWith: route.params?.compareWith, extracted: result, photoUri: photos.nutrition || (panel === 'nutrition' ? photo : null), labelPhotos: { ...photos, ...(photo ? { [panel]: photo } : {}) }, allergenText: collected.allergens || '', claimText: collected.claims || '', ocrRawText: nutrition, mealType: route.params?.mealType || 'lunch' });
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
      setText((result.text || '').slice(0, 20000));
      if (result.text?.trim()) trackEvent('label_text_ready');
      if (!result.text?.trim()) setError('No readable text. Retake in good light or enter values manually.');
    } catch { if (request === generation.current) setError('Could not read the label. Try again or enter it manually.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function extract() {
    const nutritionText = panel === 'nutrition' ? text : panels.nutrition || '';
    if (lock.current || !nutritionText.trim()) return;
    lock.current = true; setBusy(true); setError('');
    const request = ++generation.current, account = getSession()?.user.id;
    try {
      const result = await extractFromOcrText(nutritionText);
      if (request === generation.current && account === getSession()?.user.id) review(result);
    } catch { if (request === generation.current) setError('Nutrition extraction is unavailable. Your text is kept; retry or enter nutrition manually.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <KeyboardAwareScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
    <Copy accessibilityRole="header" size="heading">Scan a nutrition label</Copy>
    <Copy tone="muted">Capture one nutrition column clearly. Text recognition runs on your device; extracting nutrition sends the reviewed text to the server and may use AI.</Copy>
    <Copy>Capture each side separately. Only the nutrition panel is sent for nutrition extraction; review the other panels as exact label text.</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['nutrition', 'ingredients', 'allergens', 'claims'] as const).map(value => <Action secondary key={value} label={`Panel: ${value}`} disabled={busy} selected={panel === value} onPress={() => {
      if (value === panel) return;
      setPanels(previous => ({ ...previous, [panel]: text }));
      if (photo) setPhotos(previous => ({ ...previous, [panel]: photo }));
      setText(panels[value] || ''); setPhoto(photos[value] || null); setPanel(value); setManual(false); setError('');
    }} />)}</View>
    {error !== '' && <Notice error title="Let’s try another way" message={error} />}
    {busy && <Skeleton label={photo ? 'Reading label' : 'Preparing camera'} />}
    {photo || manual ? <Card>
      {photo && <Image accessibilityLabel="Captured label" source={{ uri: photo }} style={{ width: '100%', height: 240 }} resizeMode="contain" />}
      <Field maxLength={20000} label="Label text — review and correct" value={text} multiline editable={!busy} style={{ minHeight: 150, textAlignVertical: 'top' }} onChangeText={setText} />
      <Action label="Extract nutrition for review" disabled={busy || !(panel === 'nutrition' ? text : panels.nutrition || '').trim()} onPress={() => { void extract(); }} />
      <Action secondary label="Retake label" disabled={busy} onPress={() => { generation.current++; setPhoto(null); setPhotos(previous => ({ ...previous, [panel]: '' })); setText(''); setPanels(previous => ({ ...previous, [panel]: '' })); setManual(false); setError(''); }} />
    </Card> : permission?.granted ? <>
      {focused && <CameraView ref={camera} facing="back" style={{ height: 300, borderRadius: 20 }} />}
      <Action label="Capture nutrition label" disabled={busy} onPress={() => { void capture(); }} />
    </> : <Card><Notice title="Camera access" message="Allow camera access to photograph the label, or enter it manually below." />
      <Action label={permission?.canAskAgain === false ? 'Open camera settings' : 'Allow camera'} onPress={() => {
        void (permission?.canAskAgain === false ? Linking.openSettings() : requestPermission()).catch(() => setError('Could not open camera access. Use device settings or manual entry.'));
      }} /></Card>}
    <Action secondary label="Type label text" disabled={busy} onPress={() => setManual(true)} />
    <Action secondary label="Enter nutrition manually" disabled={busy} onPress={() => review()} />
    <Action secondary label="Cancel scan" disabled={busy} onPress={() => navigation.goBack()} />
    <View style={{ height: 16 }} />
  </KeyboardAwareScrollView>;
}
