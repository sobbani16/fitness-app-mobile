import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Action, Card, Copy, Field, IconAction, ListRow, Notice, Segmented, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import BodyMap, { BODY_MUSCLES } from '../components/BodyMap';
import { getLibraryAlternatives, getMuscleHeatmap, LibraryExercise, MuscleStat, searchLibrary } from '../api/exerciseLibrary';
import { openYouTubeSearch } from '../services/youtubeSearch';

const EQUIPMENT = ['bodyweight', 'dumbbell', 'barbell', 'band', 'machine', 'kettlebell'];
type Mode = 'explore' | '7d' | '30d';

export default function MuscleExplorerScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('explore');
  const [view, setView] = useState<'front' | 'back'>('front');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [mechanic, setMechanic] = useState<'All' | 'compound' | 'isolation'>('All');
  const [equipment, setEquipment] = useState<string | null>(null);
  const [results, setResults] = useState<LibraryExercise[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heat, setHeat] = useState<Record<string, MuscleStat>>({});
  const [detail, setDetail] = useState<LibraryExercise | null>(null);
  const [alternatives, setAlternatives] = useState<{ exercise: LibraryExercise; score: number; why: string }[] | null>(null);

  const loadHeat = useCallback(async (days: 7 | 30) => {
    setError(null);
    try { setHeat((await getMuscleHeatmap(days)).muscles); }
    catch (e: any) {
      if (__DEV__) console.warn('muscle heatmap failed', e?.response?.status, e?.response?.data || e?.message);
      setError('Couldn’t load your training history right now.');
    }
  }, []);

  const loadList = useCallback(async () => {
    if (!muscle) { setResults([]); setTotal(0); return; }
    setLoading(true); setError(null);
    try {
      const res = await searchLibrary({
        muscle, role: 'primary', q: q.trim() || undefined,
        mechanic: mechanic === 'All' ? undefined : mechanic,
        equipment: equipment || undefined,
      });
      setResults(res.exercises); setTotal(res.total);
    } catch (e: any) {
      if (__DEV__) console.warn('library search failed', e?.response?.status, e?.response?.data || e?.message);
      setError('Couldn’t load exercises right now.');
    }
    finally { setLoading(false); }
  }, [muscle, q, mechanic, equipment]);

  useEffect(() => { void loadList(); }, [loadList]);
  useFocusEffect(useCallback(() => {
    if (mode !== 'explore') void loadHeat(mode === '7d' ? 7 : 30);
  }, [mode, loadHeat]));

  const select = (id: string) => setMuscle(muscle === id ? null : id);
  const openDetail = (e: LibraryExercise) => {
    setDetail(e); setAlternatives(null);
    void getLibraryAlternatives(e.id).then(a => setAlternatives(a.alternatives)).catch(() => setAlternatives([]));
  };
  const start = (id: string) => { setDetail(null); navigation.navigate('Main', { screen: 'LogExercise', params: { start: id } }); };
  const stat = muscle ? heat[muscle] : undefined;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      <Segmented label="Muscle explorer mode" options={[{ value: 'explore', label: 'Explore' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }]} value={mode} onChange={v => setMode(v)} />
      {error && mode !== 'explore' && (
        <View style={{ gap: 8 }}>
          <Notice title="Something went wrong" message={error} error />
          <Action secondary label="Try again" onPress={() => void loadHeat(mode === '7d' ? 7 : 30)} />
        </View>
      )}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Copy size="heading">{BODY_MUSCLES[muscle || '']?.label || 'Tap a muscle'}</Copy>
          <IconAction icon="⇄" label={`Show ${view === 'front' ? 'back' : 'front'} view`} onPress={() => setView(view === 'front' ? 'back' : 'front')} />
        </View>
        <BodyMap view={view} selected={muscle} heat={mode === 'explore' ? undefined : Object.fromEntries(Object.entries(heat).map(([k, v]) => [k, v.intensity]))} onSelect={select} />
        {mode !== 'explore' && <Copy size="caption" tone="muted">Blue shading shows logged training exposure — not recovery or growth.</Copy>}
      </Card>

      {mode !== 'explore' && muscle && (
        <Card>
          {stat ? <>
            <Copy>{stat.sets} sets · {stat.sessions} session{stat.sessions === 1 ? '' : 's'}</Copy>
            <Copy size="caption" tone="muted">
              {stat.volumeLoadLbs > 0 ? `≈${Math.round(stat.volumeLoadLbs).toLocaleString()} lb volume load · ` : ''}
              Last trained {stat.lastTrained ? new Date(stat.lastTrained).toLocaleDateString() : '—'}
            </Copy>
          </> : <Copy tone="muted">No logged sets for this muscle in the period — or none logged at all.</Copy>}
        </Card>
      )}

      {mode === 'explore' && muscle && (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Search within muscle" value={q} onChangeText={setQ} /></View>
            {equipment && <IconAction icon="✕" label="Clear equipment filter" onPress={() => setEquipment(null)} />}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['All', 'compound', 'isolation'] as const).map(m => <Action key={m} label={m === 'All' ? 'All' : m[0].toUpperCase() + m.slice(1)} secondary selected={mechanic === m} onPress={() => setMechanic(m)} />)}
            {EQUIPMENT.map(e => <Action key={e} label={e} secondary selected={equipment === e} onPress={() => setEquipment(equipment === e ? null : e)} />)}
          </View>
          {loading ? <Skeleton label="Loading exercises" /> :
            error ? <View style={{ gap: 8 }}>
              <Copy tone="muted">{error}</Copy>
              <Action secondary label="Try again" onPress={() => void loadList()} />
            </View> :
            results.length === 0 ? <View style={{ gap: 8 }}>
              <Copy tone="muted">{q || mechanic !== 'All' || equipment ? 'No exercises found for this muscle with the current filters.' : 'The exercise library has no moves targeting this muscle yet.'}</Copy>
              {(q || mechanic !== 'All' || equipment) && <Action secondary label="Clear filters" onPress={() => { setQ(''); setMechanic('All'); setEquipment(null); }} />}
            </View> :
            results.map(e => (
              <ListRow key={e.id} title={e.name}
                subtitle={`${[e.equipment, e.level, e.mechanic].filter(Boolean).join(' · ')}${e.secondaryMuscles.length ? ` · also ${e.secondaryMuscles.map(m => BODY_MUSCLES[m]?.label || m).join(', ')}` : ''}`}
                onPress={() => openDetail(e)} />
            ))}
          {!loading && total > results.length && <Copy size="caption" tone="muted">Showing {results.length} of {total} — refine filters to narrow down.</Copy>}
        </Card>
      )}

      <Sheet visible={!!detail} title={detail?.name || ''} onClose={() => setDetail(null)}>
        {detail && <View style={{ gap: 10 }}>
          <Copy size="caption" tone="muted">
            {[detail.equipment, detail.level, detail.mechanic].filter(Boolean).join(' · ')}
          </Copy>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {detail.primaryMuscles.map(m => <Action key={m} label={BODY_MUSCLES[m]?.label || m} secondary selected onPress={() => {}} />)}
            {detail.secondaryMuscles.map(m => <Action key={m} label={BODY_MUSCLES[m]?.label || m} secondary onPress={() => {}} />)}
          </View>
          {detail.instructions.length > 0 && <View>
            <Copy>How to</Copy>
            {detail.instructions.slice(0, 4).map((s, i) => <Copy key={i} size="caption" tone="muted">{i + 1}. {s}</Copy>)}
          </View>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <IconAction icon="🎥" label="Search on YouTube" onPress={() => void openYouTubeSearch(`${detail.name} proper form`).then(ok => { if (!ok) setError('Couldn’t open YouTube. Try searching in a browser.'); })} />
            {!!error && mode === 'explore' && <Copy size="caption" style={{ color: colors.danger }}>{error}</Copy>}
            <View style={{ flex: 1 }}><Action label="Log this exercise" onPress={() => start(detail.id)} /></View>
          </View>
          <View>
            <Copy>Alternatives</Copy>
            {alternatives === null ? <Skeleton label="Loading alternatives" /> :
              alternatives.length === 0 ? <Copy size="caption" tone="muted">No close alternatives found.</Copy> :
              alternatives.slice(0, 5).map(a => (
                <ListRow key={a.exercise.id} title={a.exercise.name}
                  subtitle={`${a.exercise.equipment || 'any'} · ${a.why}`}
                  onPress={() => openDetail(a.exercise)} />
              ))}
            {alternatives !== null && alternatives.length > 0 && <Copy size="caption" tone="muted">Suggestions are ranked by shared muscles, pattern, and equipment — not a validated equivalence.</Copy>}
          </View>
        </View>}
      </Sheet>
    </ScrollView>
  );
}
