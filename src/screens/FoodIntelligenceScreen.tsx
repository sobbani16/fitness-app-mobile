import React, { useState } from 'react';
import { ScrollView, View, TextInput } from 'react-native';
import { Action, Card, Copy, ListRow, Notice } from '../design/components';
import { useTheme } from '../design/theme';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { scanResult, checkSuitability, ScanResult } from '../api/foodIntel';

const VERDICT: Record<string, { tone: 'danger' | 'primary' | 'muted' | 'text'; label: string }> = {
  conflict: { tone: 'danger', label: 'Conflicts with your restrictions' },
  caution: { tone: 'danger', label: 'Review before eating' },
  suitable: { tone: 'primary', label: 'No conflicts found' },
  unknown: { tone: 'muted', label: 'Not enough info to assess' },
};

export default function FoodIntelligenceScreen() {
  const { colors } = useTheme();
  const { isEnabled } = useFeatureFlags();
  const [barcode, setBarcode] = useState('');
  const [ingredientText, setIngredientText] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!barcode.trim() && !ingredientText.trim()) { setError('Enter a barcode or paste an ingredient list'); return; }
    setBusy(true); setError(null);
    try {
      const r = await scanResult({ barcode: barcode.trim() || undefined, ingredientText: ingredientText.trim() || undefined });
      setResult(r);
    } catch (e: any) { setError(e?.response?.data?.error || e?.message || 'Lookup failed'); }
    setBusy(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Copy size="heading" style={{ fontWeight: '700' }}>Food Intelligence</Copy>
      <Copy size="caption" tone="muted">Check a product\'s ingredients against the evidence and your preferences. Estimates — always verify the label.</Copy>

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
              <Copy size="caption" tone="muted">{result.nutrition?.verified ? 'Verified catalog product' : 'User-contributed — verify label'} · per {result.nutrition?.per || 'serving'}</Copy>
              {result.nutrition?.values && Object.entries(result.nutrition.values).slice(0, 8).map(([k, v]) => (
                <ListRow key={k} title={k} subtitle={String(v)} />
              ))}
            </Card>
          ) : (
            <Notice title={result.provenance?.barcode === 'unknown' ? 'Barcode not in our catalog' : 'Ingredient analysis'} message={result.provenance?.barcode === 'unknown' ? 'Paste the ingredient list or scan the nutrition label.' : 'Showing analysis for the pasted ingredients.'} />
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
