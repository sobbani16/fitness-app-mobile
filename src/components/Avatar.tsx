import React from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Copy } from '../design/components';
import { useTheme } from '../design/theme';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(p => p[0]!.toUpperCase()).join('');
}

/** Round profile image, falling back to initials (or a person glyph) on a surface circle. */
export default function Avatar({ uri, name, size = 48 }: { uri?: string | null; name?: string | null; size?: number }) {
  const { colors } = useTheme();
  const label = name ? `Avatar for ${name}` : 'Avatar';
  const letters = name ? initials(name) : '';
  if (uri) return <Image source={{ uri }} accessibilityLabel={label} accessibilityRole="image"
    style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.track }} />;
  return <View accessibilityLabel={label} accessibilityRole="image"
    style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
    {letters
      ? <Copy style={{ fontSize: size * 0.38, fontWeight: '700', color: colors.primary }}>{letters}</Copy>
      : <Ionicons name="person" size={size * 0.5} color={colors.muted} />}
  </View>;
}
