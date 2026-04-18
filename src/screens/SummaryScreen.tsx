import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { useProfile } from '../context/ProfileContext';

export default function SummaryScreen() {
  const { profile, reset } = useProfile();

  const onReset = () => {
    Alert.alert('Reset profile?', 'This clears your saved profile.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => reset() },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Summary</Text>
      <Text style={styles.placeholder}>End-of-day insights coming next.</Text>

      {profile && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your profile</Text>
          <Text>Name: {profile.name}</Text>
          <Text>Sex: {profile.sex}</Text>
          <Text>Age: {profile.age}</Text>
          <Text>Height: {profile.heightCm} cm</Text>
          <Text>Weight: {profile.weightKg} kg</Text>
          <Text>Activity: {profile.activityLevel.replace('_', ' ')}</Text>
          <Text>Goal: {profile.goal}</Text>
        </View>
      )}

      <View style={{ height: 12 }} />
      <Button title="Reset profile" color="#c0392b" onPress={onReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  placeholder: { color: '#777' },
  card: {
    backgroundColor: '#f7f7f9',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    marginTop: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
});
