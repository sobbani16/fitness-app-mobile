import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/OnboardingScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import MainTabs from './MainTabs';
import { useProfile } from '../context/ProfileContext';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {profile ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ presentation: 'modal' }}
          />
        </>
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      )}
    </Stack.Navigator>
  );
}
