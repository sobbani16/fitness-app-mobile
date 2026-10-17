import React from 'react';
import { View } from 'react-native';
import { Action, Copy } from './components';
import { ThemePreference, useTheme } from './theme';
export default function AppearancePicker() {
  const { preference, setPreference, storageError } = useTheme();
  return <View style={{ gap: 8 }}><Copy size="title">Appearance</Copy>
    {(['system', 'light', 'dark'] as ThemePreference[]).map(value => <Action key={value} secondary
      selected={value === preference} label={`${value === preference ? '✓ ' : ''}${value === 'system' ? 'Use device setting' : value === 'light' ? 'Light' : 'Dark'}`}
      onPress={() => setPreference(value)} />)}
    {storageError && <Copy tone="danger">Appearance changed for this session. Could not save your preference.</Copy>}
    <Copy size="caption" tone="muted">Today, Food, Workout, Progress and Account support both themes. Some advanced screens still use their original appearance.</Copy>
  </View>;
}
