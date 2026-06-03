import React, { useState } from 'react';
import { Alert } from 'react-native';
import ProfileForm, { ProfileFormData } from '../components/ProfileForm';
import { useProfile } from '../context/ProfileContext';

export default function OnboardingScreen() {
  const { setProfile } = useProfile();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setSaving(true);
      await setProfile({ ...data, createdAt: new Date().toISOString() });
    } catch (e: any) {
      Alert.alert('Could not save profile', e?.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileForm
      title="Welcome"
      subtitle="Tell us a bit about you. We'll use this to set your daily calorie target."
      submitLabel="Continue"
      saving={saving}
      onSubmit={onSubmit}
    />
  );
}
