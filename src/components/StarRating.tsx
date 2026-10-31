import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Copy } from '../design/components';
import { useTheme } from '../design/theme';

/** Read-only 5-star rating with an optional numeric label and rating count. */
export default function StarRating({ rating, count, size = 14 }: { rating: number | null; count?: number; size?: number }) {
  const { colors } = useTheme();
  const stars = rating ? Math.round(rating) : 0;
  const label = rating === null
    ? (count === undefined ? '' : 'No ratings yet')
    : count === undefined ? rating.toFixed(1) : `${rating.toFixed(1)} (${count})`;
  return <View accessibilityLabel={rating === null ? 'No ratings yet' : `Rated ${rating.toFixed(1)} out of 5${count !== undefined ? ` across ${count} ratings` : ''}`}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Ionicons key={i} name={i <= stars ? 'star' : 'star-outline'} size={size} color={colors.warning} />
    ))}
    {!!label && <Copy size="caption" tone="muted" style={{ marginLeft: 4 }}>{label}</Copy>}
  </View>;
}
