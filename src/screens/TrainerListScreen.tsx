import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listTrainers, CoachingMode, TrainerProfile } from '../api/trainers';
import { SPECIALTIES } from '../config/specialties';
import { LANGUAGES } from '../config/languages';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, Field, Notice, Segmented, Sheet, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import StarRating from '../components/StarRating';
import EmptyState from '../components/ui-states/EmptyState';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'TrainerList'>;

type TierFilter = 'all' | 'standard' | 'pro' | 'elite';
type ModeFilter = 'any' | CoachingMode;

const PAGE_SIZE = 20;

function TierBadge({ tier }: { tier: string }) {
  const { colors } = useTheme();
  const tone = tier === 'elite' ? colors.warning : tier === 'pro' ? colors.primary : colors.muted;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: tone }}>
      <Copy size="caption" style={{ color: colors.surface, fontWeight: '700', fontSize: 11 }}>{tier.toUpperCase()}</Copy>
    </View>
  );
}

function TrainerCard({ trainer, onPress }: { trainer: TrainerProfile; onPress: () => void }) {
  const { colors } = useTheme();
  const isFull = trainer.spotsLeft === 0;
  const name = trainer.displayName ?? trainer.userId;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Trainer ${name}, ${trainer.tier} tier`}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <Avatar uri={trainer.profilePicture} name={trainer.displayName} size={56} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TierBadge tier={trainer.tier} />
            {isFull && (
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: colors.danger }}>
                <Copy size="caption" tone="danger" style={{ fontWeight: '700', fontSize: 11 }}>FULL</Copy>
              </View>
            )}
          </View>
          <Copy style={{ fontWeight: '700' }} numberOfLines={1}>{name}</Copy>
          <StarRating rating={trainer.rating} size={12} />
          <Copy size="caption" tone="muted">
            {trainer.yearsExperience} yr{trainer.yearsExperience !== 1 ? 's' : ''} experience
            {trainer.location ? ` · ${trainer.location}` : ''}
            {trainer.coachingMode ? ` · ${trainer.coachingMode === 'in_person' ? 'In person' : trainer.coachingMode === 'both' ? 'Online & in person' : 'Online'}` : ''}
          </Copy>
          {trainer.specialties.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
              {trainer.specialties.slice(0, 4).map((s) => <Chip key={s} small label={s} />)}
              {trainer.specialties.length > 4 && <Copy size="caption" tone="muted">+{trainer.specialties.length - 4}</Copy>}
            </View>
          )}
          {!isFull && (
            <Copy size="caption" tone="primary" style={{ fontWeight: '600' }}>
              {trainer.spotsLeft} spot{trainer.spotsLeft !== 1 ? 's' : ''} left
            </Copy>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

export default function TrainerListScreen() {
  const nav = useNavigation<NavProp>();
  const { colors } = useTheme();
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [tier, setTier] = useState<TierFilter>('all');
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeFilter>('any');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Debounce the search box so each keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async (opts: { cursor?: string; append?: boolean } = {}) => {
    const id = ++requestId.current;
    setError(null);
    try {
      const data = await listTrainers({
        q: appliedQuery || undefined,
        specialty: specialty ?? undefined,
        mode: mode === 'any' ? undefined : mode,
        language: language ?? undefined,
        tier: tier === 'all' ? undefined : tier,
        cursor: opts.cursor,
        take: PAGE_SIZE,
      });
      if (id !== requestId.current) return; // a newer request superseded this one
      setTrainers((prev) => (opts.append ? [...prev, ...data.trainers] : data.trainers));
      setNextCursor(data.nextCursor);
    } catch (e: any) {
      if (id !== requestId.current) return;
      setError(e.response?.data?.error ?? e.message);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [appliedQuery, specialty, mode, language, tier]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onEndReached = () => {
    if (!nextCursor || loading || loadingMore || refreshing) return;
    setLoadingMore(true);
    load({ cursor: nextCursor, append: true });
  };

  const clearFilters = () => {
    setSpecialty(null);
    setLanguage(null);
    setMode('any');
  };

  const activeFilters = (specialty ? 1 : 0) + (language ? 1 : 0) + (mode !== 'any' ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 12 }}>
        <Field label="Search trainers" value={query} onChangeText={setQuery}
          placeholder="Name, specialty, keyword…" autoCapitalize="none" autoCorrect={false}
          returnKeyType="search" accessibilityLabel="Search trainers" />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Segmented<TierFilter> label="Filter by tier" value={tier} onChange={setTier}
              options={[
                { value: 'all', label: 'All' },
                { value: 'standard', label: 'Std' },
                { value: 'pro', label: 'Pro' },
                { value: 'elite', label: 'Elite' },
              ]} />
          </View>
        </View>
        <Action secondary onPress={() => setFilterOpen(true)}
          label={activeFilters ? `Filters (${activeFilters})` : 'Filters'} />
      </View>

      {loading ? (
        <View style={{ padding: 20, gap: 16 }}>
          <Skeleton label="Loading trainers" />
          <Skeleton label="Loading trainer profiles" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
          <Notice error title="Could not load trainers" message={error} />
          <Action label="Retry" onPress={() => load()} />
        </View>
      ) : (
        <FlatList
          data={trainers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40, gap: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <Skeleton label="Loading more trainers" /> : null}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState
                title="No trainers found"
                description={appliedQuery || activeFilters || tier !== 'all'
                  ? 'No trainers match your search. Try different keywords or filters.'
                  : 'No trainers are accepting clients right now.'}
                primaryCTA={appliedQuery || activeFilters || tier !== 'all' ? 'Clear filters' : undefined}
                onAction={() => { setQuery(''); clearFilters(); setTier('all'); }}
              />
            </View>
          }
          renderItem={({ item }) => (
            <TrainerCard
              trainer={item}
              onPress={() => nav.navigate('TrainerDetail', { trainerId: item.id })}
            />
          )}
        />
      )}

      <Sheet visible={filterOpen} title="Filter trainers" onClose={() => setFilterOpen(false)}>
        <View style={{ gap: 8 }}>
          <Copy style={{ fontWeight: '700' }}>Specialty</Copy>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SPECIALTIES.map((s) => (
              <Chip key={s} label={s} selected={specialty === s} accessibilityRole="checkbox"
                onPress={() => setSpecialty(specialty === s ? null : s)} />
            ))}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Copy style={{ fontWeight: '700' }}>Language</Copy>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LANGUAGES.map((l) => (
              <Chip key={l.code} label={l.label} selected={language === l.code} accessibilityRole="checkbox"
                onPress={() => setLanguage(language === l.code ? null : l.code)} />
            ))}
          </View>
        </View>
        <Segmented<ModeFilter> label="Coaching mode" value={mode} onChange={setMode}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'online', label: 'Online' },
            { value: 'in_person', label: 'In person' },
            { value: 'both', label: 'Both' },
          ]} />
        {activeFilters > 0 && <Action secondary label="Clear all filters" onPress={clearFilters} />}
        <Action label="Show results" onPress={() => setFilterOpen(false)} />
      </Sheet>
    </View>
  );
}
