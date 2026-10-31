import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Action, Copy } from '../../design/components';
import { radius, useTheme } from '../../design/theme';

export interface NoInternetStateProps {
  title?: string;
  description?: string;
  icon?: string;
  /** Things that still work offline — shown with a ✓ ("View today's diary"). */
  availableOffline?: string[];
  /** Things that need a connection — shown with a ✕ ("Sync to your account"). */
  needsConnection?: string[];
  /** Label of the retry button. */
  primaryCTA?: string;
  onAction?: () => void;
  /** Cached content stays mounted below the banner instead of a blank screen. */
  children?: React.ReactNode;
}

/**
 * Offline. Rendered as a slim banner, not a takeover — whatever content is
 * already on the user's device stays visible and usable underneath it.
 */
export default function NoInternetState({
  title = "You're offline",
  description = 'Saved content still works. New changes sync when you reconnect.',
  icon = '📶',
  availableOffline = [],
  needsConnection = [],
  primaryCTA = 'Retry connection',
  onAction,
  children,
}: NoInternetStateProps) {
  const { colors } = useTheme();
  return (
    <View style={{ alignSelf: 'stretch', gap: 12 }}>
      <Animated.View entering={FadeInDown.duration(200)} accessibilityLiveRegion="polite"
        style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: radius.control,
          backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.border }}>
        <Copy accessibilityElementsHidden style={{ fontSize: 20 }}>{icon}</Copy>
        <View style={{ flex: 1, gap: 4 }}>
          <Copy style={{ fontWeight: '700' }} accessibilityRole="header">{title}</Copy>
          <Copy size="caption" tone="muted">{description}</Copy>
          {availableOffline.map(item => <Copy key={item} size="caption" tone="muted">✓ {item}</Copy>)}
          {needsConnection.map(item => <Copy key={item} size="caption" tone="muted">✕ {item}</Copy>)}
          {!!onAction && <View style={{ marginTop: 6, alignSelf: 'flex-start', minWidth: 180 }}>
            <Action secondary label={primaryCTA} onPress={onAction} />
          </View>}
        </View>
      </Animated.View>
      {children}
    </View>
  );
}
