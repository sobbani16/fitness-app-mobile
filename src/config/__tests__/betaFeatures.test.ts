it('hides unfinished features only when the build explicitly enables beta safe mode', () => {
  const previous = process.env.EXPO_PUBLIC_BETA_SAFE_MODE;
  try {
    process.env.EXPO_PUBLIC_BETA_SAFE_MODE = 'true';
    jest.isolateModules(() => expect(require('../betaFeatures').betaFeatures).toEqual({ ai:false, weeklyPlans:false, supplements:false }));
    delete process.env.EXPO_PUBLIC_BETA_SAFE_MODE;
    jest.isolateModules(() => expect(require('../betaFeatures').betaFeatures).toEqual({ ai:true, weeklyPlans:true, supplements:true }));
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_BETA_SAFE_MODE; else process.env.EXPO_PUBLIC_BETA_SAFE_MODE = previous;
  }
});
