import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { ProfileProvider } from './src/context/ProfileContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
