import React, { useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileForm, { ProfileFormData } from '../components/ProfileForm';
import { Action, Skeleton } from '../design/components';
import { useTheme } from '../design/theme';
import { useProfile } from '../context/ProfileContext';
export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { profile, loading, setProfile } = useProfile();
  const [saving, setSaving] = useState(false), [dirty, setDirty] = useState(false);
  const saved = useRef(false), busy = useRef(false);
  usePreventRemove(dirty || saving, ({ data }) => {
    if (saved.current) { navigation.dispatch(data.action); return; }
    if (busy.current) return;
    Alert.alert('Discard profile changes?', 'Your changes have not been saved.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) }]);
  });
  const submit = async (data: ProfileFormData) => {
    if (busy.current) return;
    busy.current = true; setSaving(true);
    try { await setProfile({ ...data, createdAt: profile?.createdAt ?? new Date().toISOString() }); saved.current = true; setDirty(false); navigation.goBack(); }
    finally { busy.current = false; setSaving(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
    <View style={{ padding: 12 }}><Action label="Cancel" secondary disabled={saving} onPress={() => navigation.goBack()} /></View>
    {loading ? <Skeleton label="Loading profile" /> : <ProfileForm initial={profile} title="Edit profile" subtitle="Update your details and preferences. Targets remain estimates." submitLabel="Save changes" saving={saving} onSubmit={submit} onDirtyChange={setDirty} />}
  </SafeAreaView>;
}
