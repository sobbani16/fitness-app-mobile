import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../design/theme';
export default function FeedbackButton({ source }: { source: string }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  return <Pressable accessibilityRole="button" accessibilityLabel="Feedback" accessibilityHint="Review feedback about this screen before opening an email draft" onPress={() => navigation.navigate('Feedback', { source })} style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chatbox-outline" size={24} color={colors.primary} accessible={false} /></Pressable>;
}
