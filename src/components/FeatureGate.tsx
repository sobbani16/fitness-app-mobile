import React from 'react';
import { View } from 'react-native';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { FeatureKey } from '../config/featureKeys';
import { Notice } from '../design/components';
import { useTheme } from '../design/theme';

/**
 * Renders children only when `feature` resolves true (remote flag AND build
 * gate). Pass `fallback` to show alternative UI; default hides entirely.
 *
 *   <FeatureGate feature="aiCoach"><CoachCard /></FeatureGate>
 */
export function FeatureGate({ feature, children, fallback = null }: {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isEnabled } = useFeatureFlags();
  return <>{isEnabled(feature) ? children : fallback}</>;
}

/**
 * Full-screen fallback for a route whose feature is disabled — covers users
 * already on the screen when the flag flips, plus any deep entry.
 */
export function FeatureUnavailable({ title }: { title?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 }}>
      <Notice title={title || 'Feature unavailable'} message="This feature is temporarily unavailable." />
    </View>
  );
}

/**
 * Wraps a screen component so a disabled flag renders FeatureUnavailable
 * instead of the screen. Routes stay registered — mid-session flips and
 * deep entries degrade gracefully rather than crashing navigation state.
 * `feature` may be an array: any enabled key shows the screen.
 */
export function gateScreen<P extends object>(
  feature: FeatureKey | FeatureKey[],
  Component: React.ComponentType<P>,
  title?: string,
): React.FC<P> {
  const GatedScreen = (props: P) => {
    const { isEnabled, isLoading } = useFeatureFlags();
    const { colors } = useTheme();
    const keys = Array.isArray(feature) ? feature : [feature];
    if (isLoading) {
      return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }} />;
    }
    if (!keys.some(isEnabled)) return <FeatureUnavailable title={title} />;
    return <Component {...props} />;
  };
  GatedScreen.displayName = `FeatureGated(${Component.displayName || Component.name || 'Screen'})`;
  return GatedScreen;
}
