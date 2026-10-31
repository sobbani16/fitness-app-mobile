import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Action, Copy } from '../../design/components';
import { useTheme } from '../../design/theme';
import { UIStateBaseProps } from './types';

export interface StateViewProps extends UIStateBaseProps {
  children?: React.ReactNode;
  /** 'primary' gives a filled circle for positive confirmations. */
  iconTone?: 'accent' | 'primary';
  /** Extra a11y hint read after the title, e.g. status semantics. */
  accessibilityHint?: string;
}

/**
 * Shared layout for the full-screen states: icon badge that pops in with a
 * spring, headline, supporting copy, optional custom content, then actions.
 * Enter animation is a soft fade-and-rise so the state feels intentional,
 * never like a flash of broken UI.
 */
export default function StateView({
  icon, iconTone = 'accent', title, description, children,
  primaryCTA, secondaryCTA, onAction, onSecondaryAction, accessibilityHint,
}: StateViewProps) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(250)}
      style={{ alignItems: 'center', gap: 12, paddingVertical: 32, paddingHorizontal: 16, alignSelf: 'stretch' }}>
      {!!icon && (
        <Animated.View entering={ZoomIn.springify().damping(14).stiffness(180).delay(60)}
          accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
            backgroundColor: iconTone === 'primary' ? colors.primary : colors.accent }}>
          <Copy style={{ fontSize: 34, color: iconTone === 'primary' ? colors.onPrimary : colors.text }}>{icon}</Copy>
        </Animated.View>
      )}
      {!!title && <Copy size="title" accessibilityRole="header" accessibilityHint={accessibilityHint}
        style={{ fontWeight: '700', textAlign: 'center' }}>{title}</Copy>}
      {!!description && <Copy tone="muted" style={{ textAlign: 'center', maxWidth: 420 }}>{description}</Copy>}
      {children}
      {(primaryCTA || secondaryCTA) && (
        <View style={{ gap: 8, alignSelf: 'stretch', maxWidth: 360, marginTop: 4 }}>
          {!!primaryCTA && <Action label={primaryCTA} onPress={onAction ?? (() => {})} />}
          {!!secondaryCTA && <Action secondary label={secondaryCTA} onPress={onSecondaryAction ?? (() => {})} />}
        </View>
      )}
    </Animated.View>
  );
}
