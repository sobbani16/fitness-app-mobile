import { useReducedMotion } from '../hooks/useReducedMotion';
import { gateScreen } from '../components/FeatureGate';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Pressable, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MainTabsParamList } from './MainTabs';
import { backOrFallback, fallbackTab, handleRootHardwareBack } from './back';
import { navigationRef } from './navigationRef';
import { useTheme } from '../design/theme';
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
import LabelScannerScreen from '../screens/LabelScannerScreen';
import MenuScanScreen from '../screens/MenuScanScreen';
import WorkoutPlanScreen from '../screens/WorkoutPlanScreen';
import MuscleExplorerScreen from '../screens/MuscleExplorerScreen';
import PortionAdjustScreen from '../screens/PortionAdjustScreen';
import FoodEntryScreen from '../screens/FoodEntryScreen';
import SmartRemindersScreen from '../screens/SmartRemindersScreen';
import ReminderInboxScreen from '../screens/ReminderInboxScreen';
import VideoSearchScreen from '../screens/VideoSearchScreen';
import VideoCompareScreen from '../screens/VideoCompareScreen';
import ConnectedHealthScreen from '../screens/ConnectedHealthScreen';
import { LoggedMeal } from '../storage/meals';
import ChatScreen from '../screens/ChatScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import FeedbackButton from '../components/FeedbackButton';
import MainTabs from './MainTabs';
import { useProfile } from '../context/ProfileContext';

export type RootStackParamList = {
  LeoHelp: { labelAnalysis?: import('../api/labelScanner').LabelAnalysis } | undefined;
  Feedback: { source?: string };
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabsParamList> | undefined;
  FoodEntry: { mode: 'search' | 'manual' | 'photo' | 'recipes' | 'repeat'; meal?: LoggedMeal };
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
  LabelScanner: { mealType?: string; compareWith?: import('../api/labelScanner').LabelFacts };
  MenuScan: { mealType?: string; seedText?: string };
  PortionAdjust: { extracted: any; photoUri: string | null; ocrRawText: string; mealType: string };
  SmartReminders: undefined;
  ReminderInbox: undefined;
  VideoSearch: { query?: string; context?: 'exercise' | 'recipe' | 'nutrition' | 'education' | 'general'; exerciseKey?: string };
  ConnectedHealth: undefined;
  WorkoutPlan: undefined;
  MuscleExplorer: { selectMuscle?: string };
  VideoCompare: { videos: [import('../api/videos').VideoResult, import('../api/videos').VideoResult]; exerciseKey?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Feature-gated screens: routes stay registered so mid-session flag flips and
// deep entries render FeatureUnavailable instead of a broken navigation state.
const GatedWeeklyPlan = gateScreen('weeklyMealPlans', WeeklyPlanScreen, 'Weekly meal plans');
const GatedLeo = gateScreen('aiCoach', ChatScreen, 'Leo coach');
const GatedLabelScanner = gateScreen('nutritionLabelScanning', LabelScannerScreen, 'Label scanning');
const GatedMenuScan = gateScreen('menuScanning', MenuScanScreen, 'Menu scanning');
const GatedConnectedHealth = gateScreen(['appleHealthSync', 'androidHealthSync'], ConnectedHealthScreen, 'Connected health');
const GatedVideoSearch = gateScreen('videoSearch', VideoSearchScreen, 'Video search');
const GatedVideoCompare = gateScreen('videoSearch', VideoCompareScreen, 'Video compare');
const GatedTrainerList = gateScreen('trainerDashboard', TrainerListScreen, 'Trainers');
const GatedTrainerDetail = gateScreen('trainerDashboard', TrainerDetailScreen, 'Trainers');
const GatedTrainerSignup = gateScreen('trainerDashboard', TrainerSignupScreen, 'Trainers');
const GatedClientProgress = gateScreen('trainerDashboard', ClientProgressScreen, 'Trainers');
const GatedTrainerDropForm = gateScreen('trainerDashboard', TrainerDropFormScreen, 'Trainers');
const GatedClientMealPlan = gateScreen('trainerDashboard', ClientMealPlanScreen, 'Trainers');
const GatedClientDropSurvey = gateScreen('trainerDashboard', ClientDropSurveyScreen, 'Trainers');

export default function RootNavigator() {
  const reducedMotion = useReducedMotion();
  const { colors } = useTheme();
  const { profile, loading } = useProfile();
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!navigationRef.isReady()) return false;
      const state = navigationRef.getRootState();
      return handleRootHardwareBack(navigationRef, state?.routes[state.index]?.name);
    });
    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={({ route, navigation }) => ({
      animation: reducedMotion ? 'none' : 'default', headerShown: false,
      headerRight: () => <FeedbackButton source={route.name} />,
      // Keep native Back/gestures when history exists; provide an escape for direct entry.
      headerLeft: navigation.canGoBack() ? undefined : () => <Pressable accessibilityRole="button" accessibilityLabel="Back"
        style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}
        onPress={() => backOrFallback(navigation, fallbackTab(route.name))}>
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
      </Pressable>,
    })}>
      {profile ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="LeoHelp" component={GatedLeo} options={{ headerShown: true, title: 'Leo guide' }} />
          <Stack.Screen name="FoodEntry" component={FoodEntryScreen} options={{ headerShown: true, title: 'Log food' }} />
          <Stack.Screen name="WorkoutPlan" component={WorkoutPlanScreen} options={{ headerShown: true, title: 'Workout plan' }} />
          <Stack.Screen name="MuscleExplorer" component={MuscleExplorerScreen} options={{ headerShown: true, title: 'Muscles' }} />
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
            component={GatedWeeklyPlan}
            options={{ headerShown: true, title: 'Weekly Meal Plan' }}
          />
          <Stack.Screen
            name="TrainerList"
            component={GatedTrainerList}
            options={{ headerShown: true, title: 'Find a Trainer' }}
          />
          <Stack.Screen
            name="TrainerDetail"
            component={GatedTrainerDetail}
            options={{ headerShown: true, title: 'Trainer' }}
          />
          <Stack.Screen
            name="TrainerSignup"
            component={GatedTrainerSignup}
            options={{ headerShown: true, title: 'Become a Trainer' }}
          />
          <Stack.Screen
            name="ClientProgress"
            component={GatedClientProgress}
            options={{ headerShown: true, title: 'Client Progress' }}
          />
          <Stack.Screen
            name="TrainerDropForm"
            component={GatedTrainerDropForm}
            options={{ headerShown: true, title: 'Drop Client', presentation: 'modal' }}
          />
          <Stack.Screen
            name="ClientMealPlan"
            component={GatedClientMealPlan}
            options={{ headerShown: true, title: 'Client Meal Plan' }}
          />
          <Stack.Screen
            name="ClientDropSurvey"
            component={GatedClientDropSurvey}
            options={{ headerShown: true, title: 'Leave Trainer', presentation: 'modal' }}
          />
          <Stack.Screen
            name="LabelScanner"
            component={GatedLabelScanner}
            options={{ headerShown: true, title: 'Scan Label' }}
          />
          <Stack.Screen
            name="MenuScan"
            component={GatedMenuScan}
            options={{ headerShown: true, title: 'Scan Menu' }}
          />
          <Stack.Screen
            name="SmartReminders"
            component={SmartRemindersScreen}
            options={{ headerShown: true, title: 'Smart reminders' }}
          />
          <Stack.Screen
            name="ReminderInbox"
            component={ReminderInboxScreen}
            options={{ headerShown: true, title: 'Reminder history' }}
          />
          <Stack.Screen
            name="VideoSearch"
            component={GatedVideoSearch}
            options={{ headerShown: true, title: 'Videos' }}
          />
          <Stack.Screen
            name="ConnectedHealth"
            component={GatedConnectedHealth}
            options={{ headerShown: true, title: 'Connected health' }}
          />
          <Stack.Screen
            name="VideoCompare"
            component={GatedVideoCompare}
            options={{ headerShown: true, title: 'Compare videos' }}
          />
          <Stack.Screen
            name="PortionAdjust"
            component={PortionAdjustScreen}
            options={{ headerShown: true, title: 'Adjust Portion' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen
            name="TrainerSignup"
            component={GatedTrainerSignup}
            options={{ headerShown: true, title: 'Become a Trainer' }}
          />
        </>
      )}
      <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ headerShown: true, title: 'Feedback', headerRight: () => null }} />
    </Stack.Navigator>
  );
}
