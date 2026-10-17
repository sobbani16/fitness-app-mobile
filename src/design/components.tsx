import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TextProps, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, radius, typography, useTheme } from './theme';

export function Copy({ tone = 'text', size = 'body', style, ...props }: TextProps & {
  tone?: 'text' | 'muted' | 'primary' | 'danger'; size?: keyof typeof typography;
}) {
  const { colors } = useTheme();
  return <Text {...props} style={[{ color: colors[tone], fontSize: typography[size], lineHeight: typography[size] * 1.4 }, style]} />;
}
export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return <View {...props} style={[elevation, { backgroundColor: colors.surface, padding: 20, borderRadius: radius.card, gap: 12 }, style]} />;
}
export function Action({ label, onPress, secondary = false, disabled = false, selected, hint }: {
  label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; selected?: boolean; hint?: string;
}) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
    accessibilityState={{ disabled, ...(selected === undefined ? {} : { selected }) }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 48, borderRadius: radius.control, padding: 12, justifyContent: 'center', alignItems: 'center',
      backgroundColor: secondary ? colors.accent : colors.primary, opacity: disabled ? 0.55 : pressed ? 0.8 : 1 })}>
    <Copy style={{ color: secondary ? colors.text : colors.onPrimary, fontWeight: '600', textAlign: 'center' }}>{label}</Copy>
  </Pressable>;
}
export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return <View style={{ gap: 8 }}><Copy>{label}</Copy><TextInput {...props} accessibilityLabel={label}
    placeholderTextColor={colors.muted} style={[{ minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control,
      padding: 12, color: colors.text, backgroundColor: colors.surface, fontSize: 16 }, style]} /></View>;
}
export function Progress({ value, target, label }: { value: number | null; target: number | null; label: string }) {
  const { colors } = useTheme();
  const known = value !== null && Number.isFinite(value) && target !== null && Number.isFinite(target) && target > 0;
  const percent = known ? Math.min(100, Math.max(0, value / target * 100)) : 0;
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label}
    accessibilityValue={known ? { min: 0, max: 100, now: Math.round(percent), text: `${Math.round(value!)} of ${Math.round(target!)}` } : { text: 'Not available' }}
    style={{ height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' }}>
    <View style={{ width: `${percent}%`, height: 6, backgroundColor: colors.primary }} />
  </View>;
}
export function Notice({ title, message, error = false }: { title: string; message: string; error?: boolean }) {
  return <View accessibilityLiveRegion="polite" accessibilityRole={error ? 'alert' : undefined} style={{ gap: 4 }}>
    <Copy tone={error ? 'danger' : 'text'} style={{ fontWeight: '600' }}>{title}</Copy><Copy tone="muted">{message}</Copy>
  </View>;
}
export function Skeleton({ label = 'Loading' }: { label?: string }) {
  const { colors } = useTheme();
  return <View accessible accessibilityLabel={label} accessibilityState={{ busy: true }} style={{ gap: 8 }}>
    <View style={{ height: 24, width: '65%', borderRadius: 8, backgroundColor: colors.track }} /><Copy tone="muted" size="caption">{label}…</Copy>
  </View>;
}
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' }}>
      <Pressable accessibilityLabel="Close sheet" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={{ maxHeight: '90%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 24, paddingBottom: Math.max(24, insets.bottom), paddingHorizontal: 24 }}>
        <ScrollView contentContainerStyle={{ gap: 16 }}><Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>{title}</Copy>
          {children}<Action label="Close" secondary onPress={onClose} /></ScrollView>
      </View>
    </View>
  </Modal>;
}
/** Accessible labeled bars; missing values never become zero observations. */
export function BarChart({ points, unit }: { points: { label: string; value: number | null }[]; unit: string }) {
  const maximum = Math.max(1, ...points.map(p => p.value !== null && Number.isFinite(p.value) ? p.value : 0));
  return <View style={{ gap: 12 }}>{points.map((point, index) => <View key={`${point.label}-${index}`} style={{ gap: 4 }}>
    <Copy size="caption">{point.label}: {point.value === null ? 'No data' : `${point.value} ${unit}`}</Copy>
    <Progress label={`${point.label} ${unit}`} value={point.value} target={maximum} />
  </View>)}</View>;
}
