import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, ListRow, Notice, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import * as api from '../api/supplements';
import Toggle from '../components/Toggle';

const PRODUCTION_LABEL: Record<string, string> = {
  ENDOGENOUS: 'Yes — your body makes this', DIET_REQUIRED: 'No — must come from food', ESSENTIAL_FAT: 'No — essential fat from food',
  PROTEIN_FOOD: 'No — comes from dietary protein', NONESSENTIAL_PLANT: 'No — plant compound', NONESSENTIAL_OTHER: 'No — not produced naturally',
  MICROBE: 'It\'s a living organism, not a body product', PARTIAL: 'Partially — body makes some', BLEND: 'Mixed — varies by component',
  HORMONE: 'Yes — an endogenous hormone', NO_ELEMENT_SYNTHESIS: 'No — minerals aren\'t made by the body',
};

const REQUIRED_LABEL: Record<string, string> = {
  optional: 'Optional convenience', required: 'Actually matters for this one', uncertain: 'Uncertain — don\'t overthink it',
};

function Section({ title, body }: { title: string; body?: string | null }) {
  if (!body) return null;
  return <Card><Copy size="heading">{title}</Copy><Copy>{body}</Copy></Card>;
}

export default function SupplementDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { supplementId, userSupplementId } = useRoute<RouteProp<RootStackParamList, 'SupplementDetail'>>().params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<api.SupplementDetail | null>(null);
  const [schedules, setSchedules] = useState<api.SupplementSchedule[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await api.getSupplementDetail(supplementId);
      setDetail(d);
      if (userSupplementId) setSchedules(await api.getSchedules(userSupplementId).catch(() => []));
      setError('');
    } catch { setError('Could not load supplement details.'); }
    finally { setLoading(false); }
  }, [supplementId, userSupplementId]);

  useEffect(() => { void load(); }, [load]);

  async function toggleSchedule(s: api.SupplementSchedule, active: boolean) {
    try {
      const updated = await api.updateSchedule(s.id, { active });
      setSchedules(list => list.map(x => x.id === s.id ? updated : x));
    } catch { setError('Could not update the schedule.'); }
  }

  async function removeSelection() {
    if (!userSupplementId) return;
    try { await api.deselectSupplement(supplementId); navigation.goBack(); }
    catch { setError('Could not remove it.'); }
  }

  if (loading) return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}><Skeleton label="Loading" /></ScrollView>;
  const s = detail?.supplement;
  const edu = detail?.education;
  const g = detail?.guidance;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
    <Card>
      <Copy size="heading">{s?.personalLabel?.name || s?.name || 'Supplement'}</Copy>
      {!!(s?.brand || s?.personalLabel?.brand) && <Copy tone="muted">{s?.brand || s?.personalLabel?.brand}</Copy>}
      {!!error && <Notice error title="Something went wrong" message={error} />}
      {detail?.labels.unverified && <Notice title="Research draft" message="Evidence hasn't been reviewed for this entry yet. Treat the information below as preliminary." />}
      {detail?.labels.reviewOnly && <Notice title="Extra caution" message="This item is flagged for specialist review. It isn't recommended automatically." />}
      {s?.catalogStatus === 'personal' && <Copy size="caption" tone="muted">Personal supplement — only you can see it. Nutrient values weren’t verified.</Copy>}
      {s?.ingredient?.evidenceClass && <Copy size="caption" tone="muted">Evidence class: {s.ingredient.evidenceClass.replace(/_/g, ' ').toLowerCase()}</Copy>}
      {!userSupplementId && s && <Action label="Add to my supplements" onPress={async () => { try { await api.selectSupplement(s.id); navigation.goBack(); } catch { setError('Could not add it.'); } }} />}
    </Card>

    {!!g && <Card>
      <Copy size="heading">Timing</Copy>
      <Copy>{g.suggestion}</Copy>
      <Copy size="caption" tone="muted">{REQUIRED_LABEL[g.required] || g.required}{g.rationale ? ` · ${g.rationale}` : ''}</Copy>
      {!!g.labelExceptions && <Copy size="caption" tone="muted">Label exceptions: {g.labelExceptions}</Copy>}
    </Card>}

    <Section title="What it is" body={edu?.whatItIs || edu?.overview} />
    <Section title="What it does in the body" body={edu?.physiologicalRole} />
    {(edu?.bodyProduces || s?.ingredient?.productionCode) && <Card>
      <Copy size="heading">Does your body produce it?</Copy>
      <Copy>{edu?.bodyProduces || PRODUCTION_LABEL[s!.ingredient!.productionCode || ''] || 'Unknown'}</Copy>
      {!!edu?.productionExplanation && <Copy tone="muted">{edu.productionExplanation}</Copy>}
      {edu?.isEssentialNutrient != null && <Copy size="caption" tone="muted">{edu.isEssentialNutrient ? 'Essential nutrient — required from diet.' : 'Not classified as an essential nutrient.'}</Copy>}
    </Card>}
    <Section title="Do you need it?" body={edu?.benefitEvidence || edu?.dietarySufficiency} />
    {!!edu?.evidenceLimitations && <Card><Copy size="heading">What the evidence can’t tell us</Copy><Copy tone="muted">{edu.evidenceLimitations}</Copy></Card>}
    <Section title="Food sources" body={edu?.foodSources} />
    {(edu?.adverseEffects || edu?.interactionCautions) && <Card>
      <Copy size="heading">Safety</Copy>
      {!!edu?.adverseEffects && <Copy>{edu.adverseEffects}</Copy>}
      {!!edu?.interactionCautions && <Copy tone="muted">{edu.interactionCautions}</Copy>}
      {!!edu?.pregnancyCaution && <Copy tone="muted">Pregnancy: {edu.pregnancyCaution}</Copy>}
      {!!edu?.regulatoryNotes && <Copy size="caption" tone="muted">{edu.regulatoryNotes}</Copy>}
    </Card>}
    {!!edu?.sources?.length && <Card>
      <Copy size="heading">Sources</Copy>
      {edu.sources.map((src, i) => <Copy key={i} size="caption" tone="primary" onPress={() => void Linking.openURL(src.url).catch(() => {})}>{src.title || src.url}</Copy>)}
    </Card>}

    {!!userSupplementId && <Card>
      <Copy size="heading">Schedules</Copy>
      {!schedules.length && <Copy tone="muted">No schedules yet — add one to get reminders and track doses.</Copy>}
      {schedules.map(sc => <Card key={sc.id} style={{ padding: 14 }}>
        <Copy style={{ fontWeight: '600' }}>{sc.dose || (sc.doseAmount != null ? `${sc.doseAmount} ${sc.doseUnit || ''}` : '1 serving')}</Copy>
        <Copy size="caption" tone="muted">{sc.frequency}{sc.mealAnchor ? ` · with ${sc.mealAnchor}` : ''}{sc.reminderTime ? ` · ${sc.reminderTime}` : ''}{sc.workoutAnchor ? ' · around workouts' : ''}</Copy>
        <Toggle label="Active" value={sc.active} onChange={v => void toggleSchedule(sc, v)} />
        <Action secondary label="Edit" onPress={() => navigation.navigate('SupplementSchedule', { userSupplementId, scheduleId: sc.id, supplementName: s?.name || '' })} />
      </Card>)}
      <Action label="Add schedule" onPress={() => navigation.navigate('SupplementSchedule', { userSupplementId, supplementName: s?.name || '' })} />
      <Action secondary label="Remove from my supplements" onPress={() => void removeSelection()} />
    </Card>}

    {!!detail?.disclaimer && <Card><Copy size="caption" tone="muted">{detail.disclaimer}</Copy></Card>}
    <ListRow title="Back to my supplements" onPress={() => navigation.goBack()} />
  </ScrollView>;
}
