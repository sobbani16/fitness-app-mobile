import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dropClient, getDropFormReasons } from '../api/trainers';
import { RootStackParamList } from '../navigation/RootNavigator';

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
  const { clientId } = route.params;

  const [reasons, setReasons] = useState<string[]>([]);
  const [reasonOptions, setReasonOptions] = useState<string[]>(Object.keys(REASON_LABELS));
  const [notes, setNotes] = useState('');
  const [candidateGoals, setCandidateGoals] = useState('');
  const [adherenceRating, setAdherenceRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.warningBox}>
        <Ionicons name="warning-outline" size={20} color="#b8860b" />
        <Text style={styles.warningText}>
          Your responses help us improve client matching and will be visible to the next trainer assigned to this client.
        </Text>
      </View>

      <Text style={styles.label}>Reasons for dropping * (select all that apply)</Text>
      <View style={styles.reasonGrid}>
        {reasonOptions.map((r) => {
          const selected = reasons.includes(r);
          const label = REASON_LABELS[r] ?? r.replace(/_/g, ' ');
          return (
            <TouchableOpacity
              key={r}
              style={[styles.reasonTag, selected && styles.reasonTagSelected]}
              onPress={() => toggleReason(r)}
            >
              {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
              <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Candidate's Goals (for next trainer)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={candidateGoals}
        onChangeText={setCandidateGoals}
        placeholder="Summarize what this client is trying to achieve..."
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <Text style={styles.label}>How well did this client follow the plan?</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.ratingBtn, adherenceRating === n && styles.ratingBtnActive]}
            onPress={() => setAdherenceRating(n)}
          >
            <Text style={[styles.ratingBtnText, adherenceRating === n && styles.ratingBtnTextActive]}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingHint}>1 = Never followed plan · 5 = Excellent adherence</Text>

      <Text style={styles.label}>Additional Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything else a future trainer should know about this client..."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Drop Client</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  content: { padding: 20, paddingBottom: 48 },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff8e1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffe082',
  },
  warningText: { flex: 1, fontSize: 13, color: '#7a5c00', lineHeight: 18 },

  label: { fontSize: 13, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 16 },

  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f5',
    borderWidth: 1,
    borderColor: '#e0e0e8',
    gap: 4,
  },
  reasonTagSelected: { backgroundColor: '#c0392b', borderColor: '#c0392b' },
  reasonText: { fontSize: 13, color: '#555' },
  reasonTextSelected: { color: '#fff', fontWeight: '600' },

  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#222',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  textArea: { height: 90 },

  ratingRow: { flexDirection: 'row', gap: 10 },
  ratingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e8',
  },
  ratingBtnActive: { backgroundColor: '#1e6fb8', borderColor: '#1e6fb8' },
  ratingBtnText: { fontSize: 15, fontWeight: '700', color: '#555' },
  ratingBtnTextActive: { color: '#fff' },
  ratingHint: { fontSize: 11, color: '#aaa', marginTop: 6, marginBottom: 4 },

  submitBtn: {
    backgroundColor: '#c0392b',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { backgroundColor: '#e0a0a0' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
