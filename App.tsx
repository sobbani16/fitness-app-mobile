import 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/design/theme';
import AuthGate from './src/components/AuthGate';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { ProfileProvider } from './src/context/ProfileContext';
import { MealsProvider } from './src/context/MealsContext';
import { RolesProvider } from './src/context/RolesContext';

function ThemedNavigation() {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  return <NavigationContainer theme={{ ...base, colors: { ...base.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border } }}>
    <RootNavigator /><StatusBar style={isDark ? 'light' : 'dark'} />
  </NavigationContainer>;
}

export default function App() {
  return (
    <SafeAreaProvider><ThemeProvider>
      <AuthGate><ProfileProvider>
        <MealsProvider>
          <RolesProvider>
            <ThemedNavigation />
          </RolesProvider>
        </MealsProvider>
      </ProfileProvider></AuthGate>
    </ThemeProvider></SafeAreaProvider>
  );
}
