import 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, AppState } from 'react-native';
import VoiceInput from './src/components/VoiceInput';
import { ThemeProvider, useTheme } from './src/design/theme';
import { DisplayPreferencesProvider } from './src/context/DisplayPreferencesContext';
import AuthGate from './src/components/AuthGate';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { navigationRef, clearPendingNavigation, flushPendingNavigation } from './src/navigation/navigationRef';
import { setupNotifications } from './src/services/notifications';
import { syncReminderSchedules } from './src/services/reminderSync';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { ProfileProvider } from './src/context/ProfileContext';
import { MealsProvider } from './src/context/MealsContext';
import { RolesProvider } from './src/context/RolesContext';

// Global voice-log entry — floats over every screen so a user can dictate a
// log without navigating to a specific tab first.
function GlobalVoice() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Voice log" accessibilityHint="Dictate a workout, meal, or water entry"
      onPress={() => setOpen(true)}
      style={({ pressed }) => ({ position: 'absolute', right: 18, bottom: insets.bottom + 92, width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1, zIndex: 10,
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 })}>
      <Ionicons name="mic" size={24} color={colors.onPrimary} />
    </Pressable>
    <VoiceInput open={open} onClose={() => setOpen(false)} />
  </>;
}

function ThemedNavigation() {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  useEffect(() => {
    void setupNotifications();
    void syncReminderSchedules();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void syncReminderSchedules(); });
    return () => { sub.remove(); clearPendingNavigation(); };
  }, []);
  return <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation} onStateChange={flushPendingNavigation} theme={{ ...base, colors: { ...base.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border } }}>
    <View style={{ flex: 1 }}><RootNavigator /><GlobalVoice /></View><StatusBar style={isDark ? 'light' : 'dark'} />
  </NavigationContainer>;
}

export default function App() {
  return (
    <SafeAreaProvider><ThemeProvider>
      <AuthGate><ProfileProvider>
        <MealsProvider>
          <RolesProvider>
            <DisplayPreferencesProvider><ThemedNavigation /></DisplayPreferencesProvider>
          </RolesProvider>
        </MealsProvider>
      </ProfileProvider></AuthGate>
    </ThemeProvider></SafeAreaProvider>
  );
}
