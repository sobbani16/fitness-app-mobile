import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getTrainerDetail, getAssignedTrainer, subscribeToTrainer, TrainerProfile } from '../api/trainers';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Action, Card, Copy, Notice, Skeleton } from '../design/components';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { openConversationWithTrainer } from '../api/conversations';
import { radius, useTheme } from '../design/theme';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import StarRating from '../components/StarRating';

type RoutePropType = RouteProp<RootStackParamList, 'TrainerDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList, 'TrainerDetail'>;

function TierBadge({ tier }: { tier: string }) {
  const { colors } = useTheme();
  const tone = tier === 'elite' ? colors.warning : tier === 'pro' ? colors.primary : colors.muted;
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14, backgroundColor: tone }}>
      <Copy size="caption" style={{ color: colors.surface, fontWeight: '700' }}>{tier.toUpperCase()}</Copy>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <Copy size="caption" tone="muted" style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>{title}</Copy>
      {children}
    </Card>
  );
}

export default function TrainerDetailScreen() {
  const route = useRoute<RoutePropType>();
  const nav = useNavigation<NavProp>();
  const { colors } = useTheme();
  const { trainerId } = route.params;
  const { isEnabled } = useFeatureFlags();

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
      const res = await subscribeToTrainer(trainerId);
      if (res.status === 'pending') {
        Alert.alert('Request sent', 'The trainer will review your request. You will be notified once they respond.');
      } else {
        Alert.alert('Subscribed!', 'You are now working with this trainer.');
      }
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
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading trainer" />
      </View>
    );
  }

  if (error || !trainer) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 12 }}>
        <Notice error title="Trainer unavailable" message={error ?? 'Trainer not found.'} />
        {!!error && <Action label="Retry" onPress={load} />}
      </View>
    );
  }

  const isMyTrainer = assigned?.trainerId === trainerId;
  const isLocked = assigned && assigned.trainerId !== trainerId && assigned.lockedUntil && new Date() < new Date(assigned.lockedUntil);
  const isFull = trainer.spotsLeft === 0;

  let buttonLabel = 'Request This Trainer';
  if (isMyTrainer) buttonLabel = 'Your Current Trainer';
  else if (isLocked) buttonLabel = `Locked — Change on ${new Date(assigned.lockedUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  else if (isFull) buttonLabel = 'Trainer is Full';

  const buttonDisabled = isMyTrainer || !!isLocked || isFull || subscribing;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
      {/* Header */}
      <Card style={{ alignItems: 'center' }}>
        <Avatar uri={trainer.profilePicture} size={90} />
        <TierBadge tier={trainer.tier} />
        <StarRating rating={trainer.rating} count={trainer.ratingCount} size={16} />
        {trainer.location && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Copy size="caption" tone="muted">{trainer.location}</Copy>
          </View>
        )}
      </Card>

      {/* Days with trainer badge */}
      {isMyTrainer && assigned?.daysWithTrainer !== undefined && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent,
          borderRadius: radius.control, padding: 10, gap: 8 }}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Copy style={{ color: colors.primary, fontWeight: '600' }}>
            {assigned.daysWithTrainer} day{assigned.daysWithTrainer !== 1 ? 's' : ''} with this trainer
          </Copy>
        </View>
      )}

      {/* Sections */}
      <SectionCard title="About">
        <Copy>{trainer.bio || 'No bio provided.'}</Copy>
      </SectionCard>

      <SectionCard title="Details">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="ribbon-outline" size={16} color={colors.muted} />
          <Copy>{trainer.yearsExperience} years of experience</Copy>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="people-outline" size={16} color={colors.muted} />
          <Copy>
            {trainer.currentClients} / {trainer.maxClients} clients
            {!isFull ? ` · ${trainer.spotsLeft} spot${trainer.spotsLeft !== 1 ? 's' : ''} left` : ' · Full'}
          </Copy>
        </View>
      </SectionCard>

      {trainer.specialties.length > 0 && (
        <SectionCard title="Specialties">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {trainer.specialties.map((s) => <Chip key={s} label={s} />)}
          </View>
        </SectionCard>
      )}

      {trainer.certifications.length > 0 && (
        <SectionCard title="Certifications">
          {trainer.certifications.map((c) => (
            <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Copy>{c}</Copy>
            </View>
          ))}
        </SectionCard>
      )}

      <Action label={subscribing ? 'Sending request…' : buttonLabel} onPress={handleSubscribe} disabled={buttonDisabled} />

      {isMyTrainer && assigned && (
        <Card>
          <Copy size="caption" tone="muted" style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>Your coaching</Copy>
          {isEnabled('trainerMessagingEnabled') && (
            <Action secondary label="Message coach" onPress={async () => {
              try {
                const conv = await openConversationWithTrainer(trainerId);
                nav.navigate('CoachChat', { conversationId: conv.id, name: trainer.displayName || 'Coach' });
              } catch { Alert.alert('Unavailable', 'Messaging is not available right now.'); }
            }} />
          )}
          {isEnabled('trainerSchedulingEnabled') && (
            <Action secondary label="Book a session" onPress={() => nav.navigate('BookSession', { relationId: assigned.id, trainerId, trainerName: trainer.displayName || undefined })} />
          )}
          {isEnabled('trainerSchedulingEnabled') && (
            <Action secondary label="My sessions" onPress={() => nav.navigate('MyBookings')} />
          )}
          {isEnabled('trainerWorkoutPlansEnabled') && (
            <Action secondary label="My workout plans" onPress={() => nav.navigate('ClientPlans')} />
          )}
          {isEnabled('trainerCoaching') && (
            <Action secondary label="Sharing & consent" onPress={() => nav.navigate('ConsentSharing', { relationId: assigned.id })} />
          )}
        </Card>
      )}

      {isMyTrainer && (
        <Pressable
          accessibilityRole="button" accessibilityLabel="Leave This Trainer"
          onPress={() => nav.navigate('ClientDropSurvey')}
          style={({ pressed }) => ({
            minHeight: 48, borderRadius: radius.control, padding: 12, justifyContent: 'center',
            alignItems: 'center', borderWidth: 1.5, borderColor: colors.danger, opacity: pressed ? 0.7 : 1,
          })}
        >
          <Copy tone="danger" style={{ fontWeight: '600' }}>Leave This Trainer</Copy>
        </Pressable>
      )}
    </ScrollView>
  );
}
