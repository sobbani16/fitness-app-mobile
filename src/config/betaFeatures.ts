// Public build-time switches, never secrets. Development retains existing features.
export const betaSafeMode = process.env.EXPO_PUBLIC_BETA_SAFE_MODE === 'true';
export const betaFeatures = { ai: !betaSafeMode, weeklyPlans: !betaSafeMode, supplements: !betaSafeMode };
