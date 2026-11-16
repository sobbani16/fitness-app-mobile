import React, { useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScrollView, View, TextInput } from 'react-native';
import { Action, Card, Copy, ListRow, Notice } from '../design/components';
import { useTheme } from '../design/theme';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { scanResult, getAlternatives, logScannedFood, ScanResult } from '../api/foodIntel';

const VERDICT: Record<string, { tone: 'danger' | 'primary' | 'muted' | 'text'; label: string }> = {
  conflict: { tone: 'danger', label: 'Conflicts with your restrictions' },
  caution: { tone: 'danger', label: 'Review before eating' },
  suitable: { tone: 'primary', label: 'No conflicts found' },
  unknown: { tone: 'muted', label: 'Not enough info to assess' },
};

export default function FoodIntelligenceScreen() {
  const { colors } = useTheme();
  const { isEnabled } = useFeatureFlags();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [logged, setLogged] = useState(false);
  const [alts, setAlts] = useState<{ name: string; foodType: string | null; reason: string }[] | null>(null);
  const lastScan = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [barcode, setBarcode] = useState('');
  const [ingredientText, setIngredientText] = useState(route.params?.ingredientText || '');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onScanned = ({ data }: { data: string }) => {
    const now = Date.now();
    const code = String(data || '').replace(/\D/g, '');
    if (!code || (lastScan.current.code === code && now - lastScan.current.at < 4000)) return;
    lastScan.current = { code, at: now };
    setBarcode(code); setCameraOpen(false);
    runAnalysis({ barcode: code });
  };

  const runAnalysis = async (over?: { barcode?: string }) => {
    const bc = (over?.barcode ?? barcode).trim();
    const text = ingredientText.trim();
    if (!bc && !text) { setError('Scan or enter a barcode, or paste an ingredient list'); return; }
    setBusy(true); setError(null); setLogged(false); setAlts(null);
    try {
      const r = await scanResult({ barcode: bc || undefined, ingredientText: text || undefined });
      setResult(r);
    } catch (e: any) { setError(e?.response?.data?.error || e?.message || 'Lookup failed'); }
    setBusy(false);
  };

  const addToLog = async () => {
    if (!result?.product) return;
    setBusy(true); setError(null);
    try {
      await logScannedFood({ productName: result.product.name, servingG: result.product.servingSizeG || 100, nutrients: result.nutrition?.values || {}, barcode: result.product.barcode });
      setLogged(true);
    } catch (e: any) { setError(e?.response?.data?.error || 'Could not log this food'); }
    setBusy(false);
  };

  const showAlternatives = async () => {
    setBusy(true); setError(null);
    try {
      const r = await getAlternatives({ ingredientText: result?.product?.ingredients || ingredientText.trim() });
      setAlts(r.alternatives);
    } catch { setError('Could not load alternatives'); }
    setBusy(false);
  };

  const run = async () => {
    if (!barcode.trim() && !ingredientText.trim()) { setError('Enter a barcode or paste an ingredient list'); return; }
    return runAnalysis();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Copy size="heading" style={{ fontWeight: '700' }}>Food Intelligence</Copy>
      <Copy size="caption" tone="muted">Check a product\'s ingredients against the evidence and your preferences. Estimates — always verify the label.</Copy>

      {isEnabled('foodBarcodeScanningEnabled') && (
        <Card>
          {cameraOpen ? (
            <>
              {permission?.granted ? (
                <CameraView facing="back" style={{ height: 240, borderRadius: 12 }}
                  barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
                  onBarcodeScanned={onScanned} />
              ) : (
                <Notice title="Camera access" message="Allow camera access to scan a barcode, or type it below." />
              )}
              <Action label={permission?.granted ? 'Close camera' : 'Allow camera'} secondary onPress={() => { if (!permission?.granted) requestPermission(); else setCameraOpen(false); }} />
            </>
          ) : (
            <Action label="Scan barcode with camera" secondary onPress={() => setCameraOpen(true)} />
          )}
        </Card>
      )}

      <Card>
        {isEnabled('foodBarcodeScanningEnabled') && (
          <TextInput value={barcode} onChangeText={setBarcode} placeholder="Barcode (UPC/EAN digits)"
            placeholderTextColor={colors.muted} keyboardType="number-pad"
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text }} />
        )}
        <TextInput value={ingredientText} onChangeText={setIngredientText} placeholder="Or paste ingredient list (e.g. oats, honey, cinnamon)"
          placeholderTextColor={colors.muted} multiline
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text, minHeight: 70 }} />
        <Action label={busy ? 'Checking…' : 'Analyze'} onPress={run} disabled={busy} />
      </Card>
      {error ? <Notice error title="Lookup failed" message={error} /> : null}

      {result && (
        <>
          {result.product ? (
            <Card>
              <Copy style={{ fontWeight: '600' }}>{result.product.name}</Copy>
              {result.product.brand ? <Copy tone="muted">{result.product.brand}</Copy> : null}
              <Copy size="caption" tone="muted">{result.nutrition?.verified ? 'Verified catalog product' : 'User-contributed — verify label'} · per {result.product.servingLabel || 'serving'}</Copy>
              {result.nutrition?.values && Object.entries(result.nutrition.values).slice(0, 8).map(([k, v]) => (
                <ListRow key={k} title={k} subtitle={String(v)} />
              ))}
            </Card>
          ) : (
            <Notice title={result.provenance?.barcode === 'unknown' ? 'Barcode not in our catalog' : 'Ingredient analysis'} message={result.provenance?.barcode === 'unknown' ? 'Paste the ingredient list or scan the nutrition label.' : 'Showing analysis for the pasted ingredients.'} />
          )}

          {result.product && (
            <Card>
              <Action label={logged ? 'Logged ✓' : 'Add to Food Log'} onPress={addToLog} disabled={busy || logged} />
              <Action label="Find alternatives" secondary onPress={showAlternatives} disabled={busy} />
              <Action label="Ask Leo about this" secondary onPress={() => navigation.navigate('LeoHelp')} disabled={busy} />
            </Card>
          )}
          {alts && (
            <Card>
              <Copy style={{ fontWeight: '600' }}>Alternatives that fit your preferences</Copy>
              {alts.length === 0 && <Copy size="caption" tone="muted">No clearly-better matches found in the catalog.</Copy>}
              {alts.map((a, i) => <ListRow key={i} title={a.name} subtitle={a.reason} />)}
            </Card>
          )}

          {result.suitability && (
            <Card>
              <Notice title={VERDICT[result.suitability.verdict].label} message={result.suitability.reasons[0]?.message || (result.suitability.verdict === 'suitable' ? 'Nothing conflicts with your saved preferences.' : 'Check the details below.')} error={result.suitability.verdict === 'conflict'} />
              {result.suitability.reasons.map((r, i) => (
                <Copy key={i} size="caption" tone={r.severity === 'hard' ? 'danger' : 'muted'}>{r.severity === 'hard' ? '✕' : '•'} {r.message}</Copy>
              ))}
              {result.suitability.unknowns.map((u, i) => (
                <Copy key={`u${i}`} size="caption" tone="muted">? {u}</Copy>
              ))}
            </Card>
          )}

          {isEnabled('ingredientEvidenceEnabled') && result.evidence.length > 0 && (
            <Card>
              <Copy style={{ fontWeight: '600' }}>What the evidence says</Copy>
              {result.evidence.map((ev) => (
                <View key={ev.ingredientKey} style={{ gap: 4 }}>
                  <Copy style={{ fontWeight: '600' }}>{ev.displayName}</Copy>
                  <Copy size="caption" tone="muted">{ev.summary}</Copy>
                  {(ev.claims || []).map((c, i) => (
                    <View key={i} style={{ gap: 1 }}>
                      <Copy size="caption">{c.verdict === 'established' ? '✓' : c.verdict === 'mixed' ? '~' : '✕'} {c.claim}</Copy>
                      <Copy size="caption" tone="muted">{c.applicability}{c.dose ? ` · ${c.dose}` : ''}</Copy>
                    </View>
                  ))}
                  {(ev.cautions || []).map((c, i) => (
                    <Copy key={`c${i}`} size="caption" tone='danger'>⚠ {c.text}</Copy>
                  ))}
                </View>
              ))}
              <Copy size="caption" tone="muted">Educational content reviewed by our team. Not medical advice.</Copy>
            </Card>
          )}

          <Copy size="caption" tone="muted">{result.disclaimer}</Copy>
        </>
      )}
    </ScrollView>
  );
}
