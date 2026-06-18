import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getTrainerDetail, getAssignedTrainer, subscribeToTrainer, TrainerProfile } from '../api/trainers';
import { RootStackParamList } from '../navigation/RootNavigator';

type RoutePropType = RouteProp<RootStackParamList, 'TrainerDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList, 'TrainerDetail'>;

const TIER_COLORS: Record<string, string> = {
  standard: '#5c8a5c',
  pro: '#1e6fb8',
  elite: '#b8860b',
};

const TIER_PRICES: Record<string, number> = { standard: 30, pro: 50, elite: 100 };

function StarRating({ rating, count }: { rating: number | null; count: number }) {
  const stars = rating ? Math.round(rating) : 0;
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= stars ? 'star' : 'star-outline'} size={16} color="#f5a623" />
      ))}
      <Text style={styles.ratingLabel}>
        {rating !== null ? `${rating.toFixed(1)} (${count})` : 'No ratings yet'}
      </Text>
    </View>
  );
}

export default function TrainerDetailScreen() {
  const route = useRoute<RoutePropType>();
  const nav = useNavigation<NavProp>();
  const { trainerId } = route.params;

  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [assigned, setAssigned] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [t, a] = await Promise.all([getTrainerDetail(trainerId), getAssignedTrainer()]);
      setTrainer(t);
      setAssigned(a.assigned);
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => { load(); }, [load]);

  const handleSubscribe = async () => {
    if (!trainer) return;
    setSubscribing(true);
    try {
      await subscribeToTrainer(trainerId);
      Alert.alert('Subscribed!', `You are now working with this trainer.`);
      load();
    } catch (e: any) {
      if (e.response?.status === 423) {
        const d = e.response.data;
        Alert.alert(
          'Locked In',
          `You can change trainers in ${d.daysRemaining} day${d.daysRemaining !== 1 ? 's' : ''} (${new Date(d.lockedUntil).toLocaleDateString()}).`
        );
      } else {
        Alert.alert('Error', e.response?.data?.error ?? e.message);
      }
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1e6fb8" /></View>;
  }

  if (error || !trainer) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Trainer not found.'}</Text>
      </View>
    );
  }

  const isMyTrainer = assigned?.trainerId === trainerId;
  const tierColor = TIER_COLORS[trainer.tier] ?? '#555';
  const price = trainer.monthlyRateUsd ?? TIER_PRICES[trainer.tier] ?? 0;
  const isLocked = assigned && assigned.trainerId !== trainerId && assigned.lockedUntil && new Date() < new Date(assigned.lockedUntil);
  const isFull = trainer.spotsLeft === 0;

  let buttonLabel = 'Choose This Trainer';
  if (isMyTrainer) buttonLabel = 'Your Current Trainer';
  else if (isLocked) buttonLabel = `Locked — Change on ${new Date(assigned.lockedUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  else if (isFull) buttonLabel = 'Trainer is Full';

  const buttonDisabled = isMyTrainer || !!isLocked || isFull || subscribing;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        {trainer.profilePicture ? (
          <Image source={{ uri: trainer.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={48} color="#aaa" />
          </View>
        )}
        <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
          <Text style={styles.tierText}>{trainer.tier.toUpperCase()}</Text>
        </View>
        <StarRating rating={trainer.rating} count={trainer.ratingCount} />
        {trainer.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#888" />
            <Text style={styles.locationText}>{trainer.location}</Text>
          </View>
        )}
      </View>

      {/* Days with trainer badge */}
      {isMyTrainer && assigned?.daysWithTrainer !== undefined && (
        <View style={styles.daysBadge}>
          <Ionicons name="calendar-outline" size={16} color="#1e6fb8" />
          <Text style={styles.daysText}>
            {assigned.daysWithTrainer} day{assigned.daysWithTrainer !== 1 ? 's' : ''} with this trainer
          </Text>
        </View>
      )}

      {/* Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bioText}>{trainer.bio || 'No bio provided.'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailRow}>
          <Ionicons name="ribbon-outline" size={16} color="#888" />
          <Text style={styles.detailText}>{trainer.yearsExperience} years of experience</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={16} color="#888" />
          <Text style={styles.detailText}>
            {trainer.currentClients} / {trainer.maxClients} clients
            {!isFull ? ` · ${trainer.spotsLeft} spot${trainer.spotsLeft !== 1 ? 's' : ''} left` : ' · Full'}
          </Text>
        </View>
      </View>

      {trainer.specialties.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specialties</Text>
          <View style={styles.tagRow}>
            {trainer.specialties.map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {trainer.certifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certifications</Text>
          {trainer.certifications.map((c) => (
            <View key={c} style={styles.certRow}>
              <Ionicons name="checkmark-circle" size={16} color="#2e7d32" />
              <Text style={styles.certText}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Price & CTA */}
      <View style={styles.priceSection}>
        <Text style={styles.priceLabel}>Monthly Rate</Text>
        <Text style={styles.priceValue}>${price} / month</Text>
      </View>

      <TouchableOpacity
        style={[styles.ctaBtn, buttonDisabled && styles.ctaBtnDisabled]}
        onPress={handleSubscribe}
        disabled={buttonDisabled}
        activeOpacity={0.85}
      >
        {subscribing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>{buttonLabel}</Text>
        )}
      </TouchableOpacity>

      {isMyTrainer && (
        <TouchableOpacity
          style={styles.dropBtn}
          onPress={() => nav.navigate('ClientDropSurvey')}
          activeOpacity={0.85}
        >
          <Text style={styles.dropBtnText}>Leave This Trainer</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#c0392b', textAlign: 'center' },

  header: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: '#f0f0f5', justifyContent: 'center', alignItems: 'center' },
  tierBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14, marginBottom: 10 },
  tierText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  ratingLabel: { fontSize: 13, color: '#888', marginLeft: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, color: '#888' },

  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0fb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  daysText: { fontSize: 14, color: '#1e6fb8', fontWeight: '600' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  bioText: { fontSize: 15, color: '#333', lineHeight: 22 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailText: { fontSize: 14, color: '#555' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#e8f0fb', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: 13, color: '#1e6fb8', fontWeight: '600' },

  certRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  certText: { fontSize: 14, color: '#333' },

  priceSection: { alignItems: 'center', marginBottom: 16 },
  priceLabel: { fontSize: 13, color: '#888', marginBottom: 2 },
  priceValue: { fontSize: 28, fontWeight: '800', color: '#1a1a2e' },

  ctaBtn: {
    backgroundColor: '#1e6fb8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaBtnDisabled: { backgroundColor: '#b0c8e8' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  dropBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#c0392b',
  },
  dropBtnText: { fontSize: 15, fontWeight: '600', color: '#c0392b' },
});
