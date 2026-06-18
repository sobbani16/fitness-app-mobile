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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dropTrainer, getDropFormReasons, getAssignedTrainer } from '../api/trainers';
import { RootStackParamList } from '../navigation/RootNavigator';

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

  const [reasons, setReasons] = useState<string[]>([]);
  const [reasonOptions, setReasonOptions] = useState<string[]>(Object.keys(REASON_LABELS));
  const [notes, setNotes] = useState('');
  const [trainerRating, setTrainerRating] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Lock warning banner */}
      {lockedUntil && daysRemaining !== null && (
        <View style={styles.lockBanner}>
          <Ionicons name="lock-closed-outline" size={18} color="#b8860b" />
          <Text style={styles.lockText}>
            You are locked in until {new Date(lockedUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
            You may still submit this survey, but the change will take effect at month end.
          </Text>
        </View>
      )}

      <Text style={styles.intro}>
        We're sorry to see you go. Your feedback helps us improve trainer matching.
      </Text>

      <Text style={styles.label}>Why are you leaving? * (select all that apply)</Text>
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

      <Text style={styles.label}>Rate your trainer</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setTrainerRating(n)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <Ionicons
              name={trainerRating !== null && n <= trainerRating ? 'star' : 'star-outline'}
              size={36}
              color="#f5a623"
            />
          </TouchableOpacity>
        ))}
      </View>
      {trainerRating && (
        <Text style={styles.ratingLabel}>
          {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][trainerRating]}
        </Text>
      )}

      <Text style={styles.label}>Any additional comments? (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Share anything else you'd like us to know..."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#555" />
        <Text style={styles.infoText}>
          Your rating affects the trainer's public score. Your comments are anonymous to the trainer.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit & Leave</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => nav.goBack()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  content: { padding: 20, paddingBottom: 48 },

  lockBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff8e1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffe082',
  },
  lockText: { flex: 1, fontSize: 13, color: '#7a5c00', lineHeight: 18 },

  intro: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 8 },

  label: { fontSize: 13, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 20 },

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
  reasonTagSelected: { backgroundColor: '#1e6fb8', borderColor: '#1e6fb8' },
  reasonText: { fontSize: 13, color: '#555' },
  reasonTextSelected: { color: '#fff', fontWeight: '600' },

  starsRow: { flexDirection: 'row', gap: 8 },
  ratingLabel: { fontSize: 13, color: '#888', marginTop: 6, fontStyle: 'italic' },

  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#222',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  textArea: { height: 100 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: '#777', lineHeight: 17 },

  submitBtn: {
    backgroundColor: '#c0392b',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: { backgroundColor: '#e0a0a0' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  cancelBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  cancelText: { fontSize: 15, color: '#888' },
});
