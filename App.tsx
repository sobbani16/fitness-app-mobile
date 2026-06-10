import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { ProfileProvider } from './src/context/ProfileContext';
import { MealsProvider } from './src/context/MealsContext';
import { RolesProvider } from './src/context/RolesContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <MealsProvider>
          <RolesProvider>
            <NavigationContainer>
              <RootNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </RolesProvider>
        </MealsProvider>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
