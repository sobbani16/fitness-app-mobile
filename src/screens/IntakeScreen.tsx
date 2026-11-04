import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Action, Card, Copy, Field, ListRow, Notice, Skeleton } from '../design/components';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';
import { useTheme } from '../design/theme';
import { getAssignedTrainer } from '../api/trainers';
import { getIntake, saveIntakeSections, submitIntake, BaselineAssessment } from '../api/coaching';

// Progressive coaching intake (M12) — each section saves independently.
// Once submitted, edits open a new version; history is never overwritten.
const SECTIONS: { key: string; label: string; fields: { key: string; label: string; hint?: string }[] }[] = [
  { key: 'objective', label: 'Main objective', fields: [{ key: 'goal', label: 'What do you want to achieve?' }, { key: 'why', label: 'Why is now the right time?' }] },
  { key: 'motivation', label: 'Motivation', fields: [{ key: 'drivers', label: 'What keeps you going when it gets hard?' }] },
  { key: 'routine', label: 'Daily routine', fields: [{ key: 'schedule', label: 'Typical day — work, family, sleep times' }] },
  { key: 'experience', label: 'Training experience', fields: [{ key: 'history', label: 'What have you tried? What worked?' }] },
  { key: 'equipment', label: 'Equipment', fields: [{ key: 'available', label: 'Gym access or home equipment' }] },
  { key: 'preferredActivities', label: 'Preferred activities', fields: [{ key: 'likes', label: 'Activities you enjoy' }, { key: 'dislikes', label: 'Activities to avoid' }] },
  { key: 'foodPreferences', label: 'Food preferences', fields: [{ key: 'likes', label: 'Foods and cuisines you like' }] },
  { key: 'restrictions', label: 'Restrictions', fields: [{ key: 'dietary', label: 'Allergies, intolerances, foods you avoid' }, { key: 'movement', label: 'Injuries or movements to avoid' }] },
  { key: 'functionalAbilities', label: 'Functional abilities', fields: [{ key: 'abilities', label: 'Anything your coach should know about mobility or stamina' }] },
  { key: 'pastBarriers', label: 'Past barriers', fields: [{ key: 'barriers', label: 'What has stopped you before?' }] },
  { key: 'coachingStyle', label: 'Coaching style', fields: [{ key: 'style', label: 'Do you want direct instruction, collaboration, or gentle accountability?' }] },
  { key: 'communicationPrefs', label: 'Communication', fields: [{ key: 'prefs', label: 'How often, and how much detail?' }] },
  { key: 'availableTime', label: 'Available time', fields: [{ key: 'time', label: 'Days and minutes per week you can commit' }] },
  { key: 'startingMeasurements', label: 'Starting measurements', fields: [{ key: 'measurements', label: 'Optional — weight, waist, or any baseline numbers' }] },
  { key: 'dataSharing', label: 'Data sharing', fields: [{ key: 'notes', label: 'Anything about your data you want your coach to know' }] },
];

export default function IntakeScreen() {
  const { colors } = useTheme();
  const [relationId, setRelationId] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<BaselineAssessment | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [noCoach, setNoCoach] = useState(false);

  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true); setError(false);
    (async () => {
      try {
        const a = await getAssignedTrainer();
        if (!a.assigned) { if (live) setNoCoach(true); return; }
        if (live) setRelationId(a.assigned.id);
        const d: Record<string, Record<string, string>> = {};
        try {
          const r = await getIntake(a.assigned.id);
          if (!live) return;
          setAssessment(r);
          for (const s of SECTIONS) d[s.key] = { ...(r.data?.[s.key] as Record<string, string> || {}) };
        } catch (e: any) {
          // 404 = no intake yet — start a fresh empty form.
          if (e.response?.status !== 404) throw e;
          for (const s of SECTIONS) d[s.key] = {};
        }
        if (live) setDrafts(d);
      } catch { if (live) setError(true); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, []));

  async function save(sectionKey: string) {
    if (!relationId || saving) return;
    setSaving(true);
    try {
      const r = await saveIntakeSections(relationId, { [sectionKey]: drafts[sectionKey] });
      setAssessment(r.assessment);
      setOpen(null);
    } catch { setError(true); }
    finally { setSaving(false); }
  }

  async function submit() {
    if (!relationId || saving) return;
    setSaving(true);
    try { const r = await submitIntake(relationId); setAssessment(r.assessment); }
    catch { setError(true); }
    finally { setSaving(false); }
  }

  const filled = (k: string) => Object.values(drafts[k] || {}).some(v => String(v || '').trim().length > 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Getting to know you</Copy>
      <Copy tone="muted" size="caption">Share what helps your coach coach you. Every section saves on its own — fill what you can, when you can.</Copy>
      {loading && <Skeleton label="Loading your intake" />}
      {error && <Notice error title="Couldn't load or save" message="Check your connection and try again." />}
      {noCoach && !loading && <EmptyState title="No coach yet" description="The intake opens once you start coaching with a trainer." />}
      {(assessment || relationId) && !loading && (
        <>
          <Copy size="caption" tone="muted">
            {assessment ? `${assessment.progress.completed} of ${assessment.progress.total} sections filled · v${assessment.version} · ${assessment.status.replace('_', ' ')}` : 'Not started — fill any section to begin.'}
          </Copy>
          <Card>
            {SECTIONS.map((s) => (
              <View key={s.key}>
                <ListRow title={s.label} subtitle={filled(s.key) ? 'Filled' : 'Tap to fill'}
                  onPress={() => setOpen(open === s.key ? null : s.key)}>
                  {filled(s.key) && <Chip small label="Done" accessibilityLabel={`${s.label} filled`} />}
                </ListRow>
                {open === s.key && (
                  <View style={{ gap: 8, paddingLeft: 8, paddingBottom: 8 }}>
                    {s.fields.map((f) => (
                      <Field key={f.key} label={f.label} value={drafts[s.key]?.[f.key] ?? ''}
                        onChangeText={(t: string) => setDrafts(d => ({ ...d, [s.key]: { ...(d[s.key] || {}), [f.key]: t } }))}
                        multiline placeholder={f.hint ?? 'Optional — share what you want'} />
                    ))}
                    <Action label={saving ? 'Saving…' : 'Save section'} disabled={saving} onPress={() => void save(s.key)} />
                  </View>
                )}
              </View>
            ))}
          </Card>
          {(!assessment || assessment.status === 'in_progress') && (
            <Action label={saving ? 'Submitting…' : 'Submit to your coach'} disabled={saving || (!assessment && !SECTIONS.some(s => filled(s.key))) || (assessment?.progress.completed === 0)}
              onPress={() => void submit()} />
          )}
          {assessment?.status !== 'in_progress' && assessment && (
            <Copy size="caption" tone="muted">Submitted — your coach can see this. Any edit you save opens a new version; earlier versions stay on record.</Copy>
          )}
        </>
      )}
    </ScrollView>
  );
}
