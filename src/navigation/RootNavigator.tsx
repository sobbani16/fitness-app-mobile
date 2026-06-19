import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/OnboardingScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import HealthScoreDetailScreen from '../screens/HealthScoreDetailScreen';
import WeeklyPlanScreen from '../screens/WeeklyPlanScreen';
import TrainerListScreen from '../screens/TrainerListScreen';
import TrainerDetailScreen from '../screens/TrainerDetailScreen';
import TrainerSignupScreen from '../screens/TrainerSignupScreen';
import ClientProgressScreen from '../screens/ClientProgressScreen';
import TrainerDropFormScreen from '../screens/TrainerDropFormScreen';
import ClientDropSurveyScreen from '../screens/ClientDropSurveyScreen';
import ClientMealPlanScreen from '../screens/ClientMealPlanScreen';
import MainTabs from './MainTabs';
import { useProfile } from '../context/ProfileContext';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  EditProfile: undefined;
  HealthScoreDetail: undefined;
  WeeklyPlan: undefined;
  TrainerList: undefined;
  TrainerDetail: { trainerId: string };
  TrainerSignup: undefined;
  ClientProgress: { clientId: string };
  TrainerDropForm: { clientId: string };
  ClientDropSurvey: undefined;
  ClientMealPlan: { clientId: string };
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
          <Stack.Screen
            name="HealthScoreDetail"
            component={HealthScoreDetailScreen}
            options={{ headerShown: true, title: 'Health Score' }}
          />
          <Stack.Screen
            name="WeeklyPlan"
            component={WeeklyPlanScreen}
            options={{ headerShown: true, title: 'Weekly Meal Plan' }}
          />
          <Stack.Screen
            name="TrainerList"
            component={TrainerListScreen}
            options={{ headerShown: true, title: 'Find a Trainer' }}
          />
          <Stack.Screen
            name="TrainerDetail"
            component={TrainerDetailScreen}
            options={{ headerShown: true, title: 'Trainer' }}
          />
          <Stack.Screen
            name="TrainerSignup"
            component={TrainerSignupScreen}
            options={{ headerShown: true, title: 'Become a Trainer' }}
          />
          <Stack.Screen
            name="ClientProgress"
            component={ClientProgressScreen}
            options={{ headerShown: true, title: 'Client Progress' }}
          />
          <Stack.Screen
            name="TrainerDropForm"
            component={TrainerDropFormScreen}
            options={{ headerShown: true, title: 'Drop Client', presentation: 'modal' }}
          />
          <Stack.Screen
            name="ClientMealPlan"
            component={ClientMealPlanScreen}
            options={{ headerShown: true, title: 'Client Meal Plan' }}
          />
          <Stack.Screen
            name="ClientDropSurvey"
            component={ClientDropSurveyScreen}
            options={{ headerShown: true, title: 'Leave Trainer', presentation: 'modal' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen
            name="TrainerSignup"
            component={TrainerSignupScreen}
            options={{ headerShown: true, title: 'Become a Trainer' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
