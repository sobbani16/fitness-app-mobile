import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LogMealScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log Meal</Text>
      <Text style={styles.placeholder}>Photo upload + AI feedback coming next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  placeholder: { color: '#777' },
});
