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
import CoachingRequestsScreen from '../screens/CoachingRequestsScreen';
import ConsentSharingScreen from '../screens/ConsentSharingScreen';
import EditTrainerProfileScreen from '../screens/EditTrainerProfileScreen';
import CoachingHubScreen from '../screens/CoachingHubScreen';
import TrainerPlanListScreen from '../screens/TrainerPlanListScreen';
import TrainerPlanEditorScreen from '../screens/TrainerPlanEditorScreen';
import ClientPlansScreen from '../screens/ClientPlansScreen';
import ClientPlanDetailScreen from '../screens/ClientPlanDetailScreen';
import TrainerNutritionScreen from '../screens/TrainerNutritionScreen';
import ClientGuidanceScreen from '../screens/ClientGuidanceScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import CoachChatScreen from '../screens/CoachChatScreen';
import GroupsScreen from '../screens/GroupsScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import VideoSessionsScreen from '../screens/VideoSessionsScreen';
import LearnScreen from '../screens/LearnScreen';
import SuggestScreen from '../screens/SuggestScreen';
import LearnArticleScreen from '../screens/LearnArticleScreen';
import TrainerScheduleScreen from '../screens/TrainerScheduleScreen';
import BookSessionScreen from '../screens/BookSessionScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import TrainerPackagesScreen from '../screens/TrainerPackagesScreen';
import EntitlementsScreen from '../screens/EntitlementsScreen';
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
import WeeklyReviewScreen from '../screens/WeeklyReviewScreen';
import UnifiedProgressScreen from '../screens/UnifiedProgressScreen';
import CopilotScreen from '../screens/CopilotScreen';
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
  CoachingRequests: undefined;
  ConsentSharing: { relationId: string };
  EditTrainerProfile: undefined;
  CoachingHub: undefined;
  TrainerPlanList: undefined;
  TrainerPlanEditor: { planId?: string } | undefined;
  ClientPlans: undefined;
  ClientPlanDetail: { assignmentId: string };
  TrainerNutrition: undefined;
  ClientGuidance: { assignmentId?: string } | undefined;
  Conversations: undefined;
  CoachChat: { conversationId: string; name?: string };
  Groups: undefined;
  GroupChat: { groupId: string; name?: string };
  Documents: undefined;
  VideoSessions: undefined;
  Learn: undefined;
  Suggest: undefined;
  LearnArticle: { slug: string };
  TrainerSchedule: undefined;
  BookSession: { relationId: string; trainerId: string; trainerName?: string; sessionTypes?: unknown[] };
  MyBookings: undefined;
  TrainerPackages: undefined;
  Entitlements: undefined;
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
  WeeklyReview: undefined;
  UnifiedProgress: undefined;
  Copilot: undefined;
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
const GatedTrainerList = gateScreen('trainerDiscovery', TrainerListScreen, 'Trainers');
const GatedTrainerDetail = gateScreen('trainerDiscovery', TrainerDetailScreen, 'Trainers');
const GatedTrainerSignup = gateScreen('trainerRegistration', TrainerSignupScreen, 'Trainers');
const GatedClientProgress = gateScreen('trainerInsights', ClientProgressScreen, 'Trainers');
const GatedTrainerDropForm = gateScreen('trainerDashboard', TrainerDropFormScreen, 'Trainers');
const GatedClientMealPlan = gateScreen('trainerDashboard', ClientMealPlanScreen, 'Trainers');
const GatedClientDropSurvey = gateScreen('trainerDashboard', ClientDropSurveyScreen, 'Trainers');
const GatedCoachingRequests = gateScreen('trainerCoaching', CoachingRequestsScreen, 'Coaching');
const GatedConsentSharing = gateScreen('trainerCoaching', ConsentSharingScreen, 'Sharing & consent');
const GatedEditTrainerProfile = gateScreen('trainerCoaching', EditTrainerProfileScreen, 'Trainer profile');
const GatedCoachingHub = gateScreen('trainerAdvancedFeaturesEnabled', CoachingHubScreen, 'Coaching');
const GatedTrainerPlanList = gateScreen('trainerWorkoutPlansEnabled', TrainerPlanListScreen, 'Workout plans');
const GatedTrainerPlanEditor = gateScreen('trainerWorkoutPlansEnabled', TrainerPlanEditorScreen, 'Workout plans');
const GatedClientPlans = gateScreen('trainerWorkoutPlansEnabled', ClientPlansScreen, 'My plans');
const GatedClientPlanDetail = gateScreen('trainerWorkoutPlansEnabled', ClientPlanDetailScreen, 'My plans');
const GatedTrainerNutrition = gateScreen('trainerNutritionGuidanceEnabled', TrainerNutritionScreen, 'Nutrition guidance');
const GatedClientGuidance = gateScreen('trainerNutritionGuidanceEnabled', ClientGuidanceScreen, 'Nutrition guidance');
const GatedConversations = gateScreen('trainerMessagingEnabled', ConversationsScreen, 'Messages');
const GatedCoachChat = gateScreen('trainerMessagingEnabled', CoachChatScreen, 'Messages');
const GatedTrainerSchedule = gateScreen('trainerSchedulingEnabled', TrainerScheduleScreen, 'Schedule');
const GatedBookSession = gateScreen('trainerSchedulingEnabled', BookSessionScreen, 'Book a session');
const GatedMyBookings = gateScreen('trainerSchedulingEnabled', MyBookingsScreen, 'My sessions');
const GatedTrainerPackages = gateScreen('trainerPaidCoachingEnabled', TrainerPackagesScreen, 'Packages');
const GatedEntitlements = gateScreen('trainerPaidCoachingEnabled', EntitlementsScreen, 'My coaching');
const GatedGroups = gateScreen('groupMessagingEnabled', GroupsScreen, 'Groups');
const GatedGroupChat = gateScreen('groupMessagingEnabled', GroupChatScreen, 'Group');
const GatedDocuments = gateScreen('trainerDocumentsEnabled', DocumentsScreen, 'Documents');
const GatedVideoSessions = gateScreen('videoSessionsEnabled', VideoSessionsScreen, 'Video sessions');
const GatedLearn = gateScreen('knowledgeAcademyEnabled', LearnScreen, 'Learn');
const GatedWeeklyReview = gateScreen('weeklyHealthReviewEnabled', WeeklyReviewScreen, 'Weekly review');
const GatedUnifiedProgress = gateScreen('leoProgressEnabled', UnifiedProgressScreen, 'Progress');
const GatedCopilot = gateScreen('trainerCopilotEnabled', CopilotScreen, 'Copilot');
const GatedLearnArticle = gateScreen('knowledgeAcademyEnabled', LearnArticleScreen, 'Article');

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
          <Stack.Screen name="CoachingRequests" component={GatedCoachingRequests} options={{ headerShown: true, title: 'Coaching requests' }} />
          <Stack.Screen name="ConsentSharing" component={GatedConsentSharing} options={{ headerShown: true, title: 'Sharing & consent' }} />
          <Stack.Screen name="EditTrainerProfile" component={GatedEditTrainerProfile} options={{ headerShown: true, title: 'Trainer profile' }} />
          <Stack.Screen name="CoachingHub" component={GatedCoachingHub} options={{ headerShown: true, title: 'Coaching' }} />
          <Stack.Screen name="TrainerPlanList" component={GatedTrainerPlanList} options={{ headerShown: true, title: 'Workout plans' }} />
          <Stack.Screen name="TrainerPlanEditor" component={GatedTrainerPlanEditor} options={{ headerShown: true, title: 'Plan editor' }} />
          <Stack.Screen name="ClientPlans" component={GatedClientPlans} options={{ headerShown: true, title: 'My plans' }} />
          <Stack.Screen name="ClientPlanDetail" component={GatedClientPlanDetail} options={{ headerShown: true, title: 'Plan details' }} />
          <Stack.Screen name="WeeklyReview" component={GatedWeeklyReview} options={{ headerShown: true, title: 'Weekly review' }} />
          <Stack.Screen name="UnifiedProgress" component={GatedUnifiedProgress} options={{ headerShown: true, title: 'Progress' }} />
          <Stack.Screen name="Copilot" component={GatedCopilot} options={{ headerShown: true, title: 'Copilot' }} />
          <Stack.Screen name="TrainerNutrition" component={GatedTrainerNutrition} options={{ headerShown: true, title: 'Nutrition guidance' }} />
          <Stack.Screen name="ClientGuidance" component={GatedClientGuidance} options={{ headerShown: true, title: 'Nutrition guidance' }} />
          <Stack.Screen name="Conversations" component={GatedConversations} options={{ headerShown: true, title: 'Messages' }} />
          <Stack.Screen name="CoachChat" component={GatedCoachChat} options={{ headerShown: true, title: 'Chat' }} />
          <Stack.Screen name="Groups" component={GatedGroups} options={{ headerShown: true, title: 'Groups' }} />
          <Stack.Screen name="GroupChat" component={GatedGroupChat} options={{ headerShown: true, title: 'Group' }} />
          <Stack.Screen name="Documents" component={GatedDocuments} options={{ headerShown: true, title: 'Documents' }} />
          <Stack.Screen name="VideoSessions" component={GatedVideoSessions} options={{ headerShown: true, title: 'Video sessions' }} />
          <Stack.Screen name="Suggest" component={SuggestScreen} options={{ headerShown: true, title: 'What should I eat?' }} />
          <Stack.Screen name="Learn" component={GatedLearn} options={{ headerShown: true, title: 'Learn' }} />
          <Stack.Screen name="LearnArticle" component={GatedLearnArticle} options={{ headerShown: true, title: 'Myth vs Fact' }} />
          <Stack.Screen name="TrainerSchedule" component={GatedTrainerSchedule} options={{ headerShown: true, title: 'Schedule' }} />
          <Stack.Screen name="BookSession" component={GatedBookSession} options={{ headerShown: true, title: 'Book a session' }} />
          <Stack.Screen name="MyBookings" component={GatedMyBookings} options={{ headerShown: true, title: 'My sessions' }} />
          <Stack.Screen name="TrainerPackages" component={GatedTrainerPackages} options={{ headerShown: true, title: 'Packages' }} />
          <Stack.Screen name="Entitlements" component={GatedEntitlements} options={{ headerShown: true, title: 'My coaching' }} />
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
