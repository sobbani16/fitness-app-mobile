import React, { useState } from 'react';
import { Alert, View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileForm, { ProfileFormData } from '../components/ProfileForm';
import { useProfile } from '../context/ProfileContext';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { profile, setProfile } = useProfile();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setSaving(true);
      await setProfile({
        ...data,
        createdAt: profile?.createdAt ?? new Date().toISOString(),
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not save profile', e?.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <View style={{ width: 56 }} />
      </View>
      <ProfileForm
        initial={profile}
        title="Edit profile"
        subtitle="Update your details to keep targets accurate."
        submitLabel="Save changes"
        saving={saving}
        onSubmit={onSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  cancel: { color: '#1e6fb8', fontSize: 16, fontWeight: '600' },
});
