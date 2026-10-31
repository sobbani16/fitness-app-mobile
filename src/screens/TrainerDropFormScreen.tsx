import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dropClient, getDropFormReasons } from '../api/trainers';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useConfirmLeave } from '../hooks/useConfirmLeave';
import { Copy, Field } from '../design/components';
import { radius, useTheme } from '../design/theme';
import Chip from '../components/Chip';

type RoutePropType = RouteProp<RootStackParamList, 'TrainerDropForm'>;
type NavProp = NativeStackNavigationProp<RootStackParamList, 'TrainerDropForm'>;

const REASON_LABELS: Record<string, string> = {
  non_responsive: 'Non-responsive',
  goal_mismatch: 'Goal mismatch',
  no_progress: 'No progress',
  personal_reasons: 'Personal reasons',
  schedule_conflict: 'Schedule conflict',
  rule_violation: 'Rule violation',
};

export default function TrainerDropFormScreen() {
  const nav = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { colors } = useTheme();
  const { clientId } = route.params;

  const [reasons, setReasons] = useState<string[]>([]);
  const [reasonOptions, setReasonOptions] = useState<string[]>(Object.keys(REASON_LABELS));
  const [notes, setNotes] = useState('');
  const [candidateGoals, setCandidateGoals] = useState('');
  const [adherenceRating, setAdherenceRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  useConfirmLeave(!submitted && Boolean(reasons.length || notes || candidateGoals || adherenceRating !== null), submitting);

  useEffect(() => {
    getDropFormReasons()
      .then((r) => setReasonOptions(r.trainerReasons))
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
      'Confirm',
      'Are you sure you want to drop this client? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Drop Client',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await dropClient(clientId, {
                reasons,
                notes: notes.trim() || undefined,
                candidateGoals: candidateGoals.trim() || undefined,
                adherenceRating: adherenceRating ?? undefined,
              });
              setSubmitted(true);
              Alert.alert('Done', 'The client has been removed from your roster.', [
                { text: 'OK', onPress: () => nav.popToTop() },
              ]);
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.error ?? e.message);
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
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.accent,
        borderRadius: radius.control, padding: 12, gap: 8 }}>
        <Ionicons name="warning-outline" size={20} color={colors.warning} />
        <Copy size="caption" style={{ flex: 1, color: colors.warning }}>
          Your responses help us improve client matching and will be visible to the next trainer assigned to this client.
        </Copy>
      </View>

      <View style={{ gap: 8 }}>
        <Copy>Reasons for dropping * (select all that apply)</Copy>
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

      <Field label="Candidate's Goals (for next trainer)" value={candidateGoals} onChangeText={setCandidateGoals}
        placeholder="Summarize what this client is trying to achieve..."
        multiline numberOfLines={3} textAlignVertical="top" style={{ minHeight: 90, textAlignVertical: 'top' }} />

      <View style={{ gap: 8 }}>
        <Copy>How well did this client follow the plan?</Copy>
        <View accessibilityRole="radiogroup" accessibilityLabel="Adherence rating" style={{ flexDirection: 'row', gap: 10 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Chip key={n} label={`${n}`} selected={adherenceRating === n}
              accessibilityRole="radio" accessibilityLabel={`Adherence rating ${n} of 5`}
              onPress={() => setAdherenceRating(n)} />
          ))}
        </View>
        <Copy size="caption" tone="muted">1 = Never followed plan · 5 = Excellent adherence</Copy>
      </View>

      <Field label="Additional Notes (optional)" value={notes} onChangeText={setNotes}
        placeholder="Anything else a future trainer should know about this client..."
        multiline numberOfLines={4} textAlignVertical="top" style={{ minHeight: 90, textAlignVertical: 'top' }} />

      <Pressable
        accessibilityRole="button" accessibilityLabel="Drop Client"
        onPress={handleSubmit} disabled={submitting}
        style={({ pressed }) => ({
          minHeight: 48, borderRadius: radius.control, padding: 12, justifyContent: 'center',
          alignItems: 'center', backgroundColor: colors.danger,
          opacity: submitting ? 0.55 : pressed ? 0.8 : 1, marginTop: 8,
        })}
      >
        <Copy style={{ color: colors.surface, fontWeight: '700' }}>{submitting ? 'Dropping…' : 'Drop Client'}</Copy>
      </Pressable>
    </ScrollView>
  );
}
