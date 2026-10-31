import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dropTrainer, getDropFormReasons, getAssignedTrainer } from '../api/trainers';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useConfirmLeave } from '../hooks/useConfirmLeave';
import { backOrFallback } from '../navigation/back';
import { Action, Copy, Field, Notice } from '../design/components';
import { radius, useTheme } from '../design/theme';
import Chip from '../components/Chip';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'ClientDropSurvey'>;

const REASON_LABELS: Record<string, string> = {
  not_seeing_results: 'Not seeing results',
  communication_issues: 'Communication issues',
  price: 'Price',
  found_better_fit: 'Found a better fit',
  personal_reasons: 'Personal reasons',
  schedule_conflict: 'Schedule conflict',
};

export default function ClientDropSurveyScreen() {
  const nav = useNavigation<NavProp>();
  const { colors } = useTheme();

  const [reasons, setReasons] = useState<string[]>([]);
  const [reasonOptions, setReasonOptions] = useState<string[]>(Object.keys(REASON_LABELS));
  const [notes, setNotes] = useState('');
  const [trainerRating, setTrainerRating] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  useConfirmLeave(!submitted && Boolean(reasons.length || notes || trainerRating !== null), submitting);

  useEffect(() => {
    Promise.all([getDropFormReasons(), getAssignedTrainer()])
      .then(([r, a]) => {
        setReasonOptions(r.clientReasons);
        if (a.assigned?.lockedUntil) {
          const now = new Date();
          const lock = new Date(a.assigned.lockedUntil);
          if (now < lock) {
            setLockedUntil(a.assigned.lockedUntil);
            setDaysRemaining(
              Math.ceil((lock.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            );
          }
        }
      })
      .catch(() => {});
  }, []);

  const toggleReason = (r: string) => {
    setReasons((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  const handleSubmit = async () => {
    if (reasons.length === 0) {
      return Alert.alert('Required', 'Please select at least one reason.');
    }
    Alert.alert(
      'Leave this trainer?',
      'This will end your current trainer relationship.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Trainer',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await dropTrainer({
                reasons,
                notes: notes.trim() || undefined,
                trainerRating: trainerRating ?? undefined,
              });
              setSubmitted(true);
              Alert.alert(
                'Done',
                'You have left your trainer. You can choose a new one at the start of next month.',
                [{ text: 'OK', onPress: () => nav.popToTop() }]
              );
            } catch (e: any) {
              if (e.response?.status === 423) {
                const d = e.response.data;
                Alert.alert(
                  'Still Locked',
                  `You can leave in ${d.daysRemaining} day${d.daysRemaining !== 1 ? 's' : ''} (${new Date(d.lockedUntil).toLocaleDateString()}).`
                );
              } else {
                Alert.alert('Error', e.response?.data?.error ?? e.message);
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 12 }} keyboardShouldPersistTaps="handled">
      {/* Lock warning banner */}
      {lockedUntil && daysRemaining !== null && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.accent,
          borderRadius: radius.control, padding: 12, gap: 8 }}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.warning} />
          <Copy size="caption" style={{ flex: 1, color: colors.warning }}>
            You are locked in until {new Date(lockedUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
            You may still submit this survey, but the change will take effect at month end.
          </Copy>
        </View>
      )}

      <Copy tone="muted">
        We&apos;re sorry to see you go. Your feedback helps us improve trainer matching.
      </Copy>

      <View style={{ gap: 8 }}>
        <Copy>Why are you leaving? * (select all that apply)</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {reasonOptions.map((r) => {
            const label = REASON_LABELS[r] ?? r.replace(/_/g, ' ');
            return (
              <Chip key={r} label={label} selected={reasons.includes(r)}
                accessibilityRole="checkbox" onPress={() => toggleReason(r)} />
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Copy>Rate your trainer</Copy>
        <View accessibilityRole="radiogroup" accessibilityLabel="Trainer rating" style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} accessibilityRole="radio" accessibilityLabel={`Trainer rating ${n} of 5`}
              accessibilityState={{ checked: trainerRating === n }} onPress={() => setTrainerRating(n)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Ionicons
                name={trainerRating !== null && n <= trainerRating ? 'star' : 'star-outline'}
                size={36}
                color={colors.warning}
              />
            </Pressable>
          ))}
        </View>
        {trainerRating !== null && (
          <Copy size="caption" tone="muted" style={{ fontStyle: 'italic' }}>
            {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][trainerRating]}
          </Copy>
        )}
      </View>

      <Field label="Any additional comments? (optional)" value={notes} onChangeText={setNotes}
        placeholder="Share anything else you'd like us to know..."
        multiline numberOfLines={4} textAlignVertical="top" style={{ minHeight: 100, textAlignVertical: 'top' }} />

      <Notice title="How ratings work" message="Your rating affects the trainer's public score. Your comments are anonymous to the trainer." />

      <Pressable
        accessibilityRole="button" accessibilityLabel="Submit & Leave"
        onPress={handleSubmit} disabled={submitting}
        style={({ pressed }) => ({
          minHeight: 48, borderRadius: radius.control, padding: 12, justifyContent: 'center',
          alignItems: 'center', backgroundColor: colors.danger,
          opacity: submitting ? 0.55 : pressed ? 0.8 : 1, marginTop: 4,
        })}
      >
        <Copy style={{ color: colors.surface, fontWeight: '700' }}>{submitting ? 'Submitting…' : 'Submit & Leave'}</Copy>
      </Pressable>

      <Action secondary label="Cancel" onPress={() => backOrFallback(nav, 'Summary')} />
    </ScrollView>
  );
}
