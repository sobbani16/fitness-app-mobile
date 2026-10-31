import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  createTrainerApplication,
  getMyApplication,
  submitMyApplication,
  updateMyApplication,
  CoachingMode,
  TrainerApplication,
  TrainerApplicationPayload,
  TrainerCertification,
  TrainerTier,
} from '../api/trainers';
import { SPECIALTIES } from '../config/specialties';
import { LANGUAGES } from '../config/languages';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useConfirmLeave } from '../hooks/useConfirmLeave';
import { backOrFallback } from '../navigation/back';
import { useRoles } from '../context/RolesContext';
import { Action, Card, Copy, Field, IconAction, ListRow, Notice, Segmented, Skeleton } from '../design/components';
import { radius, useTheme } from '../design/theme';
import Chip from '../components/Chip';
import CertificationEditor, { CertificationDraft, draftToInput } from '../components/CertificationEditor';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'TrainerSignup'>;

const TIERS = [
  { key: 'standard', label: 'Standard', desc: 'Great for new trainers' },
  { key: 'pro', label: 'Pro', desc: 'For experienced coaches' },
  { key: 'elite', label: 'Elite', desc: 'Top-tier performance coaching' },
] as const;

const COACHING_MODES: { value: CoachingMode; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In person' },
  { value: 'both', label: 'Both' },
];

const OTHER_LANGUAGE = '__other__';

function certToDraft(c: TrainerCertification | string): CertificationDraft {
  if (typeof c === 'string') return { name: c, issuingOrganization: '', credentialId: '', issuedAt: '', expiresAt: '' };
  return {
    id: c.id,
    name: c.name ?? '',
    issuingOrganization: c.issuingOrganization ?? '',
    credentialId: c.credentialId ?? '',
    issuedAt: c.issuedAt ?? '',
    expiresAt: c.expiresAt ?? '',
  };
}

function StatusBanner({ application }: { application: TrainerApplication }) {
  const note = application.applicationNote ? ` Note: ${application.applicationNote}` : '';
  switch (application.applicationStatus) {
    case 'submitted':
      return <Card><Notice title="Application submitted"
        message="We're reviewing your credentials. You'll be notified when a decision is made — no further action is needed." /></Card>;
    case 'under_review':
      return <Card><Notice title="Application under review"
        message={`Our team is actively reviewing your application.${note}`} /></Card>;
    case 'approved':
      return <Card><Notice title="Application approved"
        message="Your trainer profile is live. Clients can now find and request you." /></Card>;
    case 'changes_requested':
      return <Card><Notice title="Changes requested"
        message={`The review team asked for updates before approval.${note} Edit your application below and resubmit.`} /></Card>;
    case 'rejected':
      return <Card><Notice error title="Application not approved"
        message={`Your application was not approved this time.${note} You can update your details and submit again.`} /></Card>;
    case 'draft':
    default:
      return <Card><Notice title="Draft in progress"
        message="Your application is saved as a draft. Submit it when you're ready for review." /></Card>;
  }
}

export default function TrainerSignupScreen() {
  const nav = useNavigation<NavProp>();
  const { colors } = useTheme();
  const { refresh } = useRoles();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<TrainerApplication | null>(null);
  const [dirty, setDirty] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [philosophy, setPhilosophy] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [otherLanguages, setOtherLanguages] = useState('');
  const [coachingMode, setCoachingMode] = useState<CoachingMode>('online');
  const [yearsExperience, setYearsExperience] = useState('');
  const [tier, setTier] = useState<TrainerTier>('standard');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [certs, setCerts] = useState<CertificationDraft[]>([]);
  const [certSheet, setCertSheet] = useState(false);
  const [editingCert, setEditingCert] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // 'submitted' / 'under_review' / 'approved' applications are read-only here.
  const status = application?.applicationStatus;
  const locked = status === 'submitted' || status === 'under_review' || status === 'approved';

  useConfirmLeave(dirty && !submitted && !locked, submitting || savingDraft);

  const load = useCallback(async () => {
    try {
      const app = await getMyApplication();
      if (app) {
        setApplication(app);
        setDisplayName(app.displayName ?? '');
        setBio(app.bio ?? '');
        setPhilosophy(app.philosophy ?? '');
        setSelectedSpecialties(app.specialties ?? []);
        const known = LANGUAGES.map((l) => l.code);
        const langs = app.languages ?? [];
        const custom = langs.filter((l) => !known.includes(l as any));
        setSelectedLanguages([
          ...langs.filter((l) => known.includes(l as any)),
          ...(custom.length ? [OTHER_LANGUAGE] : []),
        ]);
        setOtherLanguages(custom.join(', '));
        if (app.coachingMode) setCoachingMode(app.coachingMode);
        setYearsExperience(app.yearsExperience != null ? String(app.yearsExperience) : '');
        if (app.tier) setTier(app.tier);
        setLocation(app.location ?? '');
        setCountry(app.country ?? '');
        setWebsite(app.website ?? '');
        setCerts((app.certifications ?? []).map(certToDraft));
      }
    } catch {
      // No saved application / offline — start blank.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const edit = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };

  const toggleIn = (list: string[], setList: (v: string[]) => void, value: string) => {
    setDirty(true);
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const buildPayload = (): TrainerApplicationPayload => ({
    displayName: displayName.trim() || undefined,
    bio: bio.trim() || undefined,
    philosophy: philosophy.trim() || undefined,
    specialties: selectedSpecialties,
    languages: [
      ...selectedLanguages.filter((l) => l !== OTHER_LANGUAGE),
      ...otherLanguages.split(',').map((l) => l.trim()).filter(Boolean),
    ],
    coachingMode,
    certifications: certs.map(draftToInput),
    yearsExperience: parseInt(yearsExperience, 10),
    tier,
    location: location.trim() || undefined,
    country: country.trim() || undefined,
    website: website.trim() || undefined,
  });

  const validate = (): string | null => {
    if (!displayName.trim()) return 'Please add a display name.';
    if (!bio.trim()) return 'Please add a bio.';
    if (selectedSpecialties.length === 0) return 'Select at least one specialty.';
    const hasLanguage = selectedLanguages.some((l) => l !== OTHER_LANGUAGE) || otherLanguages.trim().length > 0;
    if (!hasLanguage) return 'Select at least one coaching language.';
    const yrs = parseInt(yearsExperience, 10);
    if (Number.isNaN(yrs) || yrs < 0) return 'Enter valid years of experience.';
    return null;
  };

  const saveDraft = async (payload: TrainerApplicationPayload) => {
    return application ? updateMyApplication(payload) : createTrainerApplication(payload);
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const saved = await saveDraft(buildPayload());
      setApplication((prev) => ({ ...(prev ?? saved), ...saved }));
      setDirty(false);
      Alert.alert('Draft saved', 'Your application draft has been saved. Submit it when ready.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error ?? e.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) return Alert.alert('Validation', error);
    setSubmitting(true);
    try {
      await saveDraft(buildPayload());
      const result = await submitMyApplication();
      setApplication((prev) => ({ ...(prev ?? result), ...result }));
      setSubmitted(true);
      // Approval may grant the TRAINER role server-side; refresh coaching UI.
      void refresh().catch(() => {});
      Alert.alert(
        'Application submitted',
        'Your trainer application is pending review. You will be notified when approved.',
        [{ text: 'OK', onPress: () => backOrFallback(nav, 'Summary') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error ?? e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const saveCert = (draft: CertificationDraft) => {
    setDirty(true);
    setCerts((prev) => {
      if (editingCert !== null) return prev.map((c, i) => (i === editingCert ? draft : c));
      return [...prev, draft];
    });
    setCertSheet(false);
    setEditingCert(null);
  };

  const removeCert = (index: number) => {
    setDirty(true);
    setCerts((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading your application" />
        <Skeleton label="Loading trainer profile" />
      </View>
    );
  }

  const editable = { editable: !locked };
  const resubmit = status === 'changes_requested' || status === 'rejected';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 12 }} keyboardShouldPersistTaps="handled">
      {application && <StatusBanner application={application} />}

      <Copy tone="muted">
        Fill out your profile. Once submitted, our team will verify your credentials and activate your account.
      </Copy>

      <Field label="Display name *" value={displayName} onChangeText={edit(setDisplayName)}
        placeholder="The name clients will see" {...editable} />

      <Field label="Bio *" value={bio} onChangeText={edit(setBio)}
        placeholder="Tell clients about your background and approach..."
        multiline numberOfLines={4} textAlignVertical="top" style={{ minHeight: 100, textAlignVertical: 'top' }} {...editable} />

      <Field label="Coaching philosophy" value={philosophy} onChangeText={edit(setPhilosophy)}
        placeholder="What do you believe makes training work?"
        multiline numberOfLines={3} textAlignVertical="top" style={{ minHeight: 80, textAlignVertical: 'top' }} {...editable} />

      <Field label="Years of Experience *" value={yearsExperience} onChangeText={edit(setYearsExperience)}
        placeholder="e.g. 5" keyboardType="number-pad" {...editable} />

      <Field label="Location (City/Region)" value={location} onChangeText={edit(setLocation)}
        placeholder="e.g. New York, NY" {...editable} />

      <Field label="Country" value={country} onChangeText={edit(setCountry)}
        placeholder="e.g. United States" {...editable} />

      <Field label="Website" value={website} onChangeText={edit(setWebsite)}
        placeholder="https://…" autoCapitalize="none" keyboardType="url" {...editable} />

      <Segmented<CoachingMode> label="Coaching mode" value={coachingMode}
        onChange={(v) => { if (!locked) { setCoachingMode(v); setDirty(true); } }}
        options={COACHING_MODES} />

      <View style={{ gap: 8 }}>
        <Copy>Specialties * (select all that apply)</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SPECIALTIES.map((s) => (
            <Chip key={s} label={s} selected={selectedSpecialties.includes(s)} disabled={locked}
              accessibilityRole="checkbox" onPress={() => toggleIn(selectedSpecialties, setSelectedSpecialties, s)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Copy>Languages you coach in *</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LANGUAGES.map((l) => (
            <Chip key={l.code} label={l.label} selected={selectedLanguages.includes(l.code)} disabled={locked}
              accessibilityRole="checkbox" onPress={() => toggleIn(selectedLanguages, setSelectedLanguages, l.code)} />
          ))}
          <Chip label="Other" selected={selectedLanguages.includes(OTHER_LANGUAGE)} disabled={locked}
            accessibilityRole="checkbox" onPress={() => toggleIn(selectedLanguages, setSelectedLanguages, OTHER_LANGUAGE)} />
        </View>
        {selectedLanguages.includes(OTHER_LANGUAGE) && (
          <Field label="Other languages (comma-separated)" value={otherLanguages}
            onChangeText={edit(setOtherLanguages)} placeholder="e.g. Italian, Japanese" {...editable} />
        )}
      </View>

      <Card>
        <Copy style={{ fontWeight: '700' }}>Certifications</Copy>
        <Copy size="caption" tone="muted">Structured credentials get verified faster than free-text lists.</Copy>
        {certs.map((c, i) => (
          <ListRow key={`${c.name}-${i}`} title={c.name}
            subtitle={[c.issuingOrganization, c.issuedAt].filter(Boolean).join(' · ') || undefined}>
            {!locked && (
              <>
                <IconAction icon="✎" label={`Edit certification ${c.name}`}
                  onPress={() => { setEditingCert(i); setCertSheet(true); }} />
                <IconAction icon="✕" danger label={`Remove certification ${c.name}`} onPress={() => removeCert(i)} />
              </>
            )}
          </ListRow>
        ))}
        {!locked && (
          <Action secondary label="Add certification" onPress={() => { setEditingCert(null); setCertSheet(true); }} />
        )}
      </Card>

      <Card>
        <Copy size="heading">Tier *</Copy>
        <Copy size="caption" tone="muted">Your tier determines your client capacity and platform placement. Compensation is set by the admin team based on your client base and tier.</Copy>
        <View accessibilityRole="radiogroup" accessibilityLabel="Tier" style={{ gap: 8 }}>
          {TIERS.map((t) => {
            const isSelected = tier === t.key;
            return (
              <Pressable
                key={t.key}
                accessibilityRole="radio" accessibilityState={{ checked: isSelected, selected: isSelected }}
                disabled={locked}
                onPress={() => { setTier(t.key); setDirty(true); }}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
                  borderRadius: radius.control, borderWidth: 2,
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.accent : colors.surface,
                  opacity: locked ? 0.6 : pressed ? 0.8 : 1,
                })}
              >
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: isSelected ? colors.primary : colors.track }}>
                  <Copy size="caption" style={{ color: isSelected ? colors.onPrimary : colors.text, fontWeight: '700' }}>{t.label.toUpperCase()}</Copy>
                </View>
                <View style={{ flex: 1 }}>
                  <Copy style={{ fontWeight: '700' }}>{t.label}</Copy>
                  <Copy size="caption" tone="muted">{t.desc}</Copy>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </Card>

      {!locked && (
        <>
          <Card>
            <Notice title="Pending verification" message="Your profile will be reviewed within 2–3 business days. Payment setup will follow after approval." />
          </Card>
          <Action label={submitting ? 'Submitting…' : resubmit ? 'Resubmit Application' : 'Submit Application'}
            onPress={handleSubmit} disabled={submitting || savingDraft} />
          <Action secondary label={savingDraft ? 'Saving…' : 'Save draft'} onPress={handleSaveDraft}
            disabled={submitting || savingDraft} />
        </>
      )}

      <CertificationEditor visible={certSheet}
        initial={editingCert !== null ? certs[editingCert] : undefined}
        onSave={saveCert} onClose={() => { setCertSheet(false); setEditingCert(null); }} />
    </ScrollView>
  );
}
