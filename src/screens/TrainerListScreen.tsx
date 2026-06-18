import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listTrainers, TrainerProfile } from '../api/trainers';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'TrainerList'>;

const TIERS = [
  { key: undefined, label: 'All' },
  { key: 'standard', label: 'Standard' },
  { key: 'pro', label: 'Pro' },
  { key: 'elite', label: 'Elite' },
] as const;

const TIER_COLORS: Record<string, string> = {
  standard: '#5c8a5c',
  pro: '#1e6fb8',
  elite: '#b8860b',
};

const TIER_PRICES: Record<string, number> = {
  standard: 30,
  pro: 50,
  elite: 100,
};

function StarRating({ rating }: { rating: number | null }) {
  const stars = rating ? Math.round(rating) : 0;
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= stars ? 'star' : 'star-outline'}
          size={12}
          color="#f5a623"
        />
      ))}
      {rating !== null && (
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      )}
    </View>
  );
}

function TrainerCard({ trainer, onPress }: { trainer: TrainerProfile; onPress: () => void }) {
  const tierColor = TIER_COLORS[trainer.tier] ?? '#555';
  const price = trainer.monthlyRateUsd ?? TIER_PRICES[trainer.tier] ?? 0;
  const isFull = trainer.spotsLeft === 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        {trainer.profilePicture ? (
          <Image source={{ uri: trainer.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={28} color="#aaa" />
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={styles.tierText}>{trainer.tier.toUpperCase()}</Text>
          </View>
          {isFull && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullText}>FULL</Text>
            </View>
          )}
        </View>
        <Text style={styles.trainerName} numberOfLines={1}>
          {trainer.userId}
        </Text>
        <StarRating rating={trainer.rating} />
        <Text style={styles.experience}>
          {trainer.yearsExperience} yr{trainer.yearsExperience !== 1 ? 's' : ''} experience
          {trainer.location ? ` · ${trainer.location}` : ''}
        </Text>
        {trainer.specialties.length > 0 && (
          <Text style={styles.specialties} numberOfLines={1}>
            {trainer.specialties.join(' · ')}
          </Text>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.price}>${price}/mo</Text>
          {!isFull && (
            <Text style={styles.spots}>
              {trainer.spotsLeft} spot{trainer.spotsLeft !== 1 ? 's' : ''} left
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" style={styles.chevron} />
    </TouchableOpacity>
  );
}

export default function TrainerListScreen() {
  const nav = useNavigation<NavProp>();
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [tier, setTier] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (selectedTier?: string) => {
    setError(null);
    try {
      const data = await listTrainers(selectedTier);
      setTrainers(data.trainers);
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(tier);
  }, [tier, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(tier);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e6fb8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tier filter tabs */}
      <View style={styles.filterRow}>
        {TIERS.map((t) => (
          <TouchableOpacity
            key={String(t.key)}
            style={[styles.filterTab, tier === t.key && styles.filterTabActive]}
            onPress={() => setTier(t.key)}
          >
            <Text style={[styles.filterTabText, tier === t.key && styles.filterTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load(tier)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trainers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No trainers available</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  list: { padding: 16, paddingBottom: 32 },

  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f5',
  },
  filterTabActive: {
    backgroundColor: '#1e6fb8',
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#555' },
  filterTabTextActive: { color: '#fff' },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardLeft: { marginRight: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: '#f0f0f5', justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },

  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tierText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  fullBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#ffecec',
    borderWidth: 1,
    borderColor: '#ffaaaa',
  },
  fullText: { fontSize: 10, fontWeight: '700', color: '#c0392b' },

  trainerName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 2 },
  stars: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, gap: 1 },
  ratingText: { fontSize: 11, color: '#888', marginLeft: 4 },
  experience: { fontSize: 12, color: '#666', marginBottom: 2 },
  specialties: { fontSize: 11, color: '#999', marginBottom: 4 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 14, fontWeight: '700', color: '#1e6fb8' },
  spots: { fontSize: 12, color: '#2e7d32', fontWeight: '600' },

  chevron: { marginLeft: 4 },

  errorText: { color: '#c0392b', textAlign: 'center', marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#1e6fb8', borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { color: '#999', marginTop: 12, fontSize: 15 },
});
