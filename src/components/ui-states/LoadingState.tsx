import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Copy } from '../../design/components';
import { radius, useTheme } from '../../design/theme';

export interface LoadingStateProps {
  /** Shape of the incoming content: rows of items, one big card, or plain text. */
  variant?: 'list' | 'card' | 'text';
  /** Number of rows (list) or paragraphs (text). */
  rows?: number;
  /** Short phrase announced to screen readers and shown under the skeleton. */
  label?: string;
}

function Block({ style }: { style: ViewStyle }) {
  const { colors } = useTheme();
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.45, { duration: 750 }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View accessibilityElementsHidden style={[{ backgroundColor: colors.track, borderRadius: 6 }, style, animated]} />;
}

/**
 * Skeleton that mirrors the layout of the content on its way — the wait reads
 * as "almost there" instead of "stuck". Keep `label` specific: "Loading your
 * diary" beats "Loading".
 */
export default function LoadingState({ variant = 'list', rows = 3, label = 'Loading' }: LoadingStateProps) {
  return (
    <View accessible accessibilityState={{ busy: true }} accessibilityLabel={label}
      style={{ gap: 14, paddingVertical: 16, alignSelf: 'stretch' }}>
      {variant === 'card' && <>
        <Block style={{ height: 140, borderRadius: radius.card }} />
        <Block style={{ height: 16, width: '65%' }} />
        <Block style={{ height: 14, width: '40%' }} />
      </>}
      {variant === 'list' && Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Block style={{ width: 44, height: 44, borderRadius: 22 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Block style={{ height: 15, width: i % 3 === 2 ? '55%' : '75%' }} />
            <Block style={{ height: 12, width: '40%' }} />
          </View>
        </View>
      ))}
      {variant === 'text' && Array.from({ length: rows }).map((_, i) => (
        <Block key={i} style={{ height: 15, width: i === rows - 1 ? '45%' : '92%' }} />
      ))}
      <Copy size="caption" tone="muted">{label}…</Copy>
    </View>
  );
}
