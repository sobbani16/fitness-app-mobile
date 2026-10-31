import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import {
  addCertification,
  deleteCertification,
  getMyApplication,
  listMyCertifications,
  updateCertification,
  updateTrainerProfile,
  CoachingMode,
  TrainerCertification,
  TrainerSignupPayload,
} from '../api/trainers';
import { SPECIALTIES } from '../config/specialties';
import { LANGUAGES } from '../config/languages';
import { useConfirmLeave } from '../hooks/useConfirmLeave';
import { Action, Card, Copy, Field, IconAction, ListRow, Notice, Segmented, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import CertificationEditor, { CertificationDraft, draftToInput } from '../components/CertificationEditor';

const COACHING_MODES: { value: CoachingMode; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In person' },
  { value: 'both', label: 'Both' },
];

const OTHER_LANGUAGE = '__other__';

export default function EditTrainerProfileScreen() {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [philosophy, setPhilosophy] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [otherLanguages, setOtherLanguages] = useState('');
  const [coachingMode, setCoachingMode] = useState<CoachingMode>('online');
  const [yearsExperience, setYearsExperience] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [website, setWebsite] = useState('');
  const [certs, setCerts] = useState<TrainerCertification[]>([]);
  const [certsError, setCertsError] = useState<string | null>(null);
  const [certSheet, setCertSheet] = useState(false);
  const [editingCert, setEditingCert] = useState<TrainerCertification | null>(null);
  const [certBusy, setCertBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useConfirmLeave(dirty && !saved, saving || certBusy);

  const load = useCallback(async () => {
    // The application record carries the full profile field set; there is no
    // dedicated GET for the live trainer profile.
    try {
      const app = await getMyApplication();
      if (app) {
        setDisplayName(app.displayName ?? '');
        setBio(app.bio ?? '');
        setPhilosophy(app.philosophy ?? '');
        setSelectedSpecialties(app.specialties ?? []);
        const known = LANGUAGES.map((l) => l.code);
        const langs = app.languages ?? [];
        const custom = langs.filter((l) => !known.includes(l));
        setSelectedLanguages([
          ...langs.filter((l) => known.includes(l)),
          ...(custom.length ? [OTHER_LANGUAGE] : []),
        ]);
        setOtherLanguages(custom.join(', '));
        if (app.coachingMode) setCoachingMode(app.coachingMode);
        setYearsExperience(app.yearsExperience != null ? String(app.yearsExperience) : '');
        setLocation(app.location ?? '');
        setCountry(app.country ?? '');
        setTimeZone(app.timeZone ?? '');
        setWebsite(app.website ?? '');
      }
    } catch {
      // Blank profile is fine — PATCH will create/fill it.
    }
    try {
      setCerts(await listMyCertifications());
    } catch (e: any) {
      setCertsError(e.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const edit = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); setSaved(false); };

  const toggleIn = (list: string[], setList: (v: string[]) => void, value: string) => {
    setDirty(true);
    setSaved(false);
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const handleSave = async () => {
    const yrs = yearsExperience.trim() ? parseInt(yearsExperience, 10) : undefined;
    if (yrs !== undefined && (Number.isNaN(yrs) || yrs < 0))
      return Alert.alert('Validation', 'Enter valid years of experience.');
    const payload: Partial<TrainerSignupPayload> = {
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      philosophy: philosophy.trim() || undefined,
      specialties: selectedSpecialties,
      languages: [
        ...selectedLanguages.filter((l) => l !== OTHER_LANGUAGE),
        ...otherLanguages.split(',').map((l) => l.trim()).filter(Boolean),
      ],
      coachingMode,
      yearsExperience: yrs,
      location: location.trim() || undefined,
      country: country.trim() || undefined,
      timeZone: timeZone.trim() || undefined,
      website: website.trim() || undefined,
    };
    setSaving(true);
    try {
      await updateTrainerProfile(payload);
      setDirty(false);
      setSaved(true);
      Alert.alert('Profile saved', 'Your trainer profile has been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error ?? e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveCert = async (draft: CertificationDraft) => {
    setCertBusy(true);
    try {
      const input = draftToInput(draft);
      if (editingCert?.id) {
        const updated = await updateCertification(editingCert.id, input);
        setCerts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await addCertification(input);
        setCerts((prev) => [...prev, created]);
      }
      setCertSheet(false);
      setEditingCert(null);
    } catch (e: any) {
      Alert.alert('Could not save certification', e.response?.data?.error ?? e.message);
    } finally {
      setCertBusy(false);
    }
  };

  const removeCert = (cert: TrainerCertification) => {
    Alert.alert('Remove certification?', cert.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setCertBusy(true);
          try {
            await deleteCertification(cert.id);
            setCerts((prev) => prev.filter((c) => c.id !== cert.id));
          } catch (e: any) {
            Alert.alert('Could not remove certification', e.response?.data?.error ?? e.message);
          } finally {
            setCertBusy(false);
          }
        },
      },
    ]);
  };

  const certToDraft = (c: TrainerCertification): CertificationDraft => ({
    id: c.id,
    name: c.name ?? '',
    issuingOrganization: c.issuingOrganization ?? '',
    credentialId: c.credentialId ?? '',
    issuedAt: c.issuedAt ?? '',
    expiresAt: c.expiresAt ?? '',
  });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, gap: 16 }}>
        <Skeleton label="Loading trainer profile" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 12 }} keyboardShouldPersistTaps="handled">
      {saved && <Notice title="Saved" message="Your latest changes are live on your trainer profile." />}

      <Field label="Display name" value={displayName} onChangeText={edit(setDisplayName)}
        placeholder="The name clients see" />
      <Field label="Bio" value={bio} onChangeText={edit(setBio)}
        placeholder="Tell clients about your background and approach..."
        multiline numberOfLines={4} textAlignVertical="top" style={{ minHeight: 100, textAlignVertical: 'top' }} />
      <Field label="Coaching philosophy" value={philosophy} onChangeText={edit(setPhilosophy)}
        placeholder="What do you believe makes training work?"
        multiline numberOfLines={3} textAlignVertical="top" style={{ minHeight: 80, textAlignVertical: 'top' }} />
      <Field label="Years of experience" value={yearsExperience} onChangeText={edit(setYearsExperience)}
        placeholder="e.g. 5" keyboardType="number-pad" />
      <Field label="Location (City/Region)" value={location} onChangeText={edit(setLocation)}
        placeholder="e.g. New York, NY" />
      <Field label="Country" value={country} onChangeText={edit(setCountry)} placeholder="e.g. United States" />
      <Field label="Time zone" value={timeZone} onChangeText={edit(setTimeZone)}
        placeholder="e.g. America/New_York" autoCapitalize="none" />
      <Field label="Website" value={website} onChangeText={edit(setWebsite)}
        placeholder="https://…" autoCapitalize="none" keyboardType="url" />

      <Segmented<CoachingMode> label="Coaching mode" value={coachingMode}
        onChange={(v) => { setCoachingMode(v); setDirty(true); setSaved(false); }}
        options={COACHING_MODES} />

      <View style={{ gap: 8 }}>
        <Copy>Specialties</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SPECIALTIES.map((s) => (
            <Chip key={s} label={s} selected={selectedSpecialties.includes(s)}
              accessibilityRole="checkbox" onPress={() => toggleIn(selectedSpecialties, setSelectedSpecialties, s)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Copy>Languages you coach in</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LANGUAGES.map((l) => (
            <Chip key={l.code} label={l.label} selected={selectedLanguages.includes(l.code)}
              accessibilityRole="checkbox" onPress={() => toggleIn(selectedLanguages, setSelectedLanguages, l.code)} />
          ))}
          <Chip label="Other" selected={selectedLanguages.includes(OTHER_LANGUAGE)}
            accessibilityRole="checkbox" onPress={() => toggleIn(selectedLanguages, setSelectedLanguages, OTHER_LANGUAGE)} />
        </View>
        {selectedLanguages.includes(OTHER_LANGUAGE) && (
          <Field label="Other languages (comma-separated)" value={otherLanguages}
            onChangeText={edit(setOtherLanguages)} placeholder="e.g. Italian, Japanese" />
        )}
      </View>

      <Card>
        <Copy style={{ fontWeight: '700' }}>Certifications</Copy>
        {certsError && <Notice error title="Certifications unavailable" message={certsError} />}
        {certs.map((c) => (
          <ListRow key={c.id} title={c.name}
            subtitle={[c.issuingOrganization, c.verificationStatus ? `Verification: ${c.verificationStatus}` : null]
              .filter(Boolean).join(' · ') || undefined}>
            <IconAction icon="✎" label={`Edit certification ${c.name}`} disabled={certBusy}
              onPress={() => { setEditingCert(c); setCertSheet(true); }} />
            <IconAction icon="✕" danger label={`Remove certification ${c.name}`} disabled={certBusy}
              onPress={() => removeCert(c)} />
          </ListRow>
        ))}
        <Action secondary label="Add certification" disabled={certBusy}
          onPress={() => { setEditingCert(null); setCertSheet(true); }} />
      </Card>

      <Action label={saving ? 'Saving…' : 'Save profile'} onPress={handleSave} disabled={saving || certBusy} />

      <CertificationEditor visible={certSheet}
        initial={editingCert ? certToDraft(editingCert) : undefined}
        onSave={saveCert} onClose={() => { setCertSheet(false); setEditingCert(null); }} />
    </ScrollView>
  );
}
