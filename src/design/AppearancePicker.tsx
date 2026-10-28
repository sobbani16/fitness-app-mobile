import React from 'react';
import { View } from 'react-native';
import { Copy, Segmented } from './components';
import { ThemePreference, useTheme } from './theme';
export default function AppearancePicker() {
  const { preference, setPreference, storageError } = useTheme();
  return <View style={{ gap: 8 }}><Copy size="title">Appearance</Copy>
    <Segmented<ThemePreference> label="Appearance" value={preference} onChange={setPreference}
      options={[{ value: 'system', label: 'System', icon: '📱' }, { value: 'light', label: 'Light', icon: '☀️' }, { value: 'dark', label: 'Dark', icon: '🌙' }]} />
    {storageError && <Copy tone="danger">Appearance changed for this session. Could not save your preference.</Copy>}
    <Copy size="caption" tone="muted">Today, Food, Workout, Progress and Account support both themes. Some advanced screens still use their original appearance.</Copy>
  </View>;
}
