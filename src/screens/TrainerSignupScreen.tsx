import React, { useState } from 'react';
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
import { signupAsTrainer } from '../api/trainers';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'TrainerSignup'>;

const TIERS = [
  { key: 'standard', label: 'Standard', price: '$30/mo', desc: 'Great for new trainers' },
  { key: 'pro', label: 'Pro', price: '$50/mo', desc: 'For experienced coaches' },
  { key: 'elite', label: 'Elite', price: '$100/mo', desc: 'Top-tier performance coaching' },
] as const;

const TIER_COLORS: Record<string, string> = {
  standard: '#5c8a5c',
  pro: '#1e6fb8',
  elite: '#b8860b',
};

const SPECIALTY_OPTIONS = [
  'Strength Training', 'HIIT', 'Yoga', 'Running', 'Cycling',
  'Weight Loss', 'Muscle Gain', 'Flexibility', 'Cardio', 'CrossFit',
  'Pilates', 'Boxing', 'Swimming', 'Nutrition Coaching', 'Rehab & Recovery',
];

export default function TrainerSignupScreen() {
  const nav = useNavigation<NavProp>();

  const [bio, setBio] = useState('');
  const [certifications, setCertifications] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState('');
  const [tier, setTier] = useState<'standard' | 'pro' | 'elite'>('standard');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSubmit = async () => {
    if (!bio.trim()) return Alert.alert('Validation', 'Please add a bio.');
    if (selectedSpecialties.length === 0) return Alert.alert('Validation', 'Select at least one specialty.');
    const yrs = parseInt(yearsExperience, 10);
    if (isNaN(yrs) || yrs < 0) return Alert.alert('Validation', 'Enter valid years of experience.');

    setSubmitting(true);
    try {
      await signupAsTrainer({
        bio: bio.trim(),
        certifications: certifications
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        specialties: selectedSpecialties,
        yearsExperience: yrs,
        tier,
        location: location.trim() || undefined,
      });
      Alert.alert(
        'Application Submitted!',
        'Your trainer profile is pending admin verification. You will be notified when approved.',
        [{ text: 'OK', onPress: () => nav.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error ?? e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>
        Fill out your profile. Once submitted, our team will verify your credentials and activate your account.
      </Text>

      {/* Bio */}
      <Text style={styles.label}>Bio *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell clients about your coaching philosophy and approach..."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Certifications */}
      <Text style={styles.label}>Certifications (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={certifications}
        onChangeText={setCertifications}
        placeholder="e.g. NASM CPT, ACE, ISSA"
      />

      {/* Years of experience */}
      <Text style={styles.label}>Years of Experience *</Text>
      <TextInput
        style={styles.input}
        value={yearsExperience}
        onChangeText={setYearsExperience}
        placeholder="e.g. 5"
        keyboardType="number-pad"
      />

      {/* Location */}
      <Text style={styles.label}>Location (City/Region)</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. New York, NY"
      />

      {/* Specialties */}
      <Text style={styles.label}>Specialties * (select all that apply)</Text>
      <View style={styles.tagGrid}>
        {SPECIALTY_OPTIONS.map((s) => {
          const selected = selectedSpecialties.includes(s);
          return (
            <TouchableOpacity
              key={s}
              style={[styles.tag, selected && styles.tagSelected]}
              onPress={() => toggleSpecialty(s)}
            >
              <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tier selection */}
      <Text style={styles.label}>Tier *</Text>
      <Text style={styles.tierNote}>Your tier determines your monthly rate. You can request a tier change after verification.</Text>
      {TIERS.map((t) => {
        const isSelected = tier === t.key;
        const color = TIER_COLORS[t.key];
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.tierCard, isSelected && { borderColor: color, borderWidth: 2 }]}
            onPress={() => setTier(t.key)}
            activeOpacity={0.85}
          >
            <View style={[styles.tierBadge, { backgroundColor: color }]}>
              <Text style={styles.tierBadgeText}>{t.label.toUpperCase()}</Text>
            </View>
            <View style={styles.tierInfo}>
              <Text style={styles.tierPrice}>{t.price}</Text>
              <Text style={styles.tierDesc}>{t.desc}</Text>
            </View>
            {isSelected && <Ionicons name="checkmark-circle" size={22} color={color} />}
          </TouchableOpacity>
        );
      })}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color="#1e6fb8" />
        <Text style={styles.infoText}>
          Your profile will be reviewed within 2–3 business days. Payment setup will follow after approval.
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
          <Text style={styles.submitText}>Submit Application</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  content: { padding: 20, paddingBottom: 48 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 24 },

  label: { fontSize: 13, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 16 },
  tierNote: { fontSize: 12, color: '#888', marginBottom: 10, marginTop: -8 },

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

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f0f0f5',
    borderWidth: 1,
    borderColor: '#e0e0e8',
  },
  tagSelected: { backgroundColor: '#1e6fb8', borderColor: '#1e6fb8' },
  tagText: { fontSize: 13, color: '#555', fontWeight: '500' },
  tagTextSelected: { color: '#fff' },

  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    gap: 12,
  },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tierBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  tierInfo: { flex: 1 },
  tierPrice: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  tierDesc: { fontSize: 12, color: '#888' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f0fb',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    gap: 8,
  },
  infoText: { fontSize: 13, color: '#1e6fb8', flex: 1, lineHeight: 18 },

  submitBtn: {
    backgroundColor: '#1e6fb8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { backgroundColor: '#b0c8e8' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
