// Client-side feature keys — camelCase twins of the backend registry in
// fitness-app-backend/src/config/featureRegistry.js. Keep in sync.
// Safe defaults: core/manual features on, everything else off — so a first
// launch with no network and no cache fails closed for AI/costly features.
import { betaFeatures } from './betaFeatures';

export type FeatureKey =
  | 'manualFoodLogging'
  | 'manualExerciseLogging'
  | 'foodPhotoScanning'
  | 'nutritionLabelScanning'
  | 'menuScanning'
  | 'aiCoach'
  | 'aiFoodRecommendations'
  | 'aiWorkoutRecommendations'
  | 'voiceFoodLogging'
  | 'voiceExerciseLogging'
  | 'poseDetection'
  | 'weeklyMealPlans'
  | 'weeklyPlanAiGeneration'
  | 'appleHealthSync'
  | 'androidHealthSync'
  | 'trainerDashboard'
  | 'trainerRegistration'
  | 'trainerDiscovery'
  | 'trainerCoaching'
  | 'trainerInsights'
  | 'trainerAdvancedFeaturesEnabled'
  | 'trainerWorkoutPlansEnabled'
  | 'trainerNutritionGuidanceEnabled'
  | 'trainerMessagingEnabled'
  | 'trainerSchedulingEnabled'
  | 'trainerPaidCoachingEnabled'
  | 'trainerWorkoutPlanAiEnabled'
  | 'trainerNutritionAiEnabled'
  | 'smartReminderSuggestions'
  | 'supplements'
  | 'videoSearch'
  | 'aiEmergencyShutdown'
  | 'groupMessagingEnabled'
  | 'trainerDocumentsEnabled'
  | 'videoSessionsEnabled'
  | 'callRecordingEnabled'
  | 'knowledgeAcademyEnabled'
  | 'healthPriorities'
  | 'actionLoop'
  | 'coachingIntakeEnabled'
  | 'sharedOutcomePlansEnabled'
  | 'trainerCopilotEnabled'
  | 'trainerFormFeedbackEnabled'
  | 'trainerPartnershipEnabled'
  | 'weeklyHealthReviewEnabled'
  | 'leoProgressEnabled';

export type FeatureMap = Partial<Record<FeatureKey, boolean>>;

export const DEFAULT_FLAGS: Record<FeatureKey, boolean> = {
  manualFoodLogging: true,
  manualExerciseLogging: true,
  foodPhotoScanning: false,
  nutritionLabelScanning: false,
  menuScanning: false,
  aiCoach: false,
  aiFoodRecommendations: false,
  aiWorkoutRecommendations: false,
  voiceFoodLogging: false,
  voiceExerciseLogging: false,
  poseDetection: true,
  weeklyMealPlans: false,
  weeklyPlanAiGeneration: false,
  appleHealthSync: false,
  androidHealthSync: false,
  trainerDashboard: false,
  trainerRegistration: false,
  trainerDiscovery: false,
  trainerCoaching: false,
  trainerInsights: false,
  trainerAdvancedFeaturesEnabled: false,
  trainerWorkoutPlansEnabled: false,
  trainerNutritionGuidanceEnabled: false,
  trainerMessagingEnabled: false,
  trainerSchedulingEnabled: false,
  trainerPaidCoachingEnabled: false,
  trainerWorkoutPlanAiEnabled: false,
  trainerNutritionAiEnabled: false,
  smartReminderSuggestions: true,
  supplements: false,
  videoSearch: false,
  aiEmergencyShutdown: false,
  groupMessagingEnabled: false,
  trainerDocumentsEnabled: false,
  videoSessionsEnabled: false,
  callRecordingEnabled: false,
  knowledgeAcademyEnabled: false,
  healthPriorities: false,
  actionLoop: true,
  coachingIntakeEnabled: false,
  sharedOutcomePlansEnabled: false,
  trainerCopilotEnabled: false,
  trainerFormFeedbackEnabled: false,
  trainerPartnershipEnabled: false,
  weeklyHealthReviewEnabled: false,
  leoProgressEnabled: false,
};

// Build-time gate applied ON TOP of the remote flag. A TestFlight/store build
// (EXPO_PUBLIC_BETA_SAFE_MODE=true) can never light these up, whatever the
// remote config says — the old betaFeatures semantics, preserved.
const BUILD_GATES: Partial<Record<FeatureKey, keyof typeof betaFeatures>> = {
  foodPhotoScanning: 'ai',
  nutritionLabelScanning: 'ai',
  menuScanning: 'ai',
  aiCoach: 'ai',
  aiFoodRecommendations: 'ai',
  aiWorkoutRecommendations: 'ai',
  voiceFoodLogging: 'ai',
  voiceExerciseLogging: 'ai',
  weeklyMealPlans: 'weeklyPlans',
  weeklyPlanAiGeneration: 'weeklyPlans',
  supplements: 'supplements',
};

export function buildGateAllows(key: FeatureKey): boolean {
  const gate = BUILD_GATES[key];
  return gate ? betaFeatures[gate] : true;
}
