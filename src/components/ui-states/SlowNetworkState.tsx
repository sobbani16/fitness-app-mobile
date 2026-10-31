import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Copy } from '../../design/components';
import { useTheme } from '../../design/theme';
import StateView from './StateView';
import { UIStateBaseProps } from './types';

export interface SlowNetworkStateProps extends UIStateBaseProps {
  /** 0–1 download/upload progress. Omit for an indeterminate bar. */
  progress?: number;
}

/**
 * The request is alive but the network is slow. A real progress bar (or an
 * honest indeterminate one) instead of a frozen spinner, plus an escape:
 * "Load lighter version" hands the user a way out.
 */
export default function SlowNetworkState({
  title = 'Still loading…',
  description = 'Your connection is slow right now. This is working — it just needs a moment.',
  icon = '🐢',
  secondaryCTA = 'Load lighter version',
  progress,
  ...props
}: SlowNetworkStateProps) {
  const { colors } = useTheme();
  const known = typeof progress === 'number' && Number.isFinite(progress);
  const percent = known ? Math.round(Math.min(1, Math.max(0, progress!)) * 100) : null;
  const width = useSharedValue(percent ?? 0);
  const slide = useSharedValue(0);
  const [trackWidth, setTrackWidth] = useState(0);
  useEffect(() => {
    if (known) width.value = withTiming(percent!, { duration: 400 });
    else slide.value = withRepeat(withTiming(1.4, { duration: 1100 }), -1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [known, percent]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slide.value * trackWidth }] }));

  return (
    <StateView title={title} description={description} icon={icon} secondaryCTA={secondaryCTA} {...props}>
      <View accessible accessibilityRole="progressbar"
        accessibilityLabel={percent == null ? 'Loading' : `Loading progress ${percent} percent`}
        accessibilityValue={percent == null ? undefined : { min: 0, max: 100, now: percent }}
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
        style={{ alignSelf: 'stretch', maxWidth: 360, height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' }}>
        {percent == null
          ? <Animated.View accessibilityElementsHidden
              style={[{ position: 'absolute', left: 0, height: 6, width: '35%', borderRadius: 3, backgroundColor: colors.primary }, thumbStyle]} />
          : <Animated.View style={[{ height: 6, backgroundColor: colors.primary }, fillStyle]} />}
      </View>
      {percent != null && <Copy size="caption" tone="muted">{percent}%</Copy>}
    </StateView>
  );
}
