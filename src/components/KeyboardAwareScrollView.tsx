import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from 'react-native';

/**
 * Cross-platform keyboard-aware scroll container.
 *
 * iOS: `automaticallyAdjustKeyboardInsets` insets the scroll content by the
 * keyboard height and auto-scrolls the focused input into view — no fragile
 * offset math needed.
 *
 * Android: relies on `windowSoftInputMode=adjustResize` (set in app.json),
 * which shrinks the window so the ScrollView scrolls the focused field up.
 * A thin KeyboardAvoidingView guards edge-to-edge layouts.
 *
 * Uses no native modules, so it is safe in Expo Go and won't affect builds.
 */
export default function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  ...rest
}: ScrollViewProps) {
  const scroll = (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator
      {...rest}
    >
      {children}
    </ScrollView>
  );

  if (Platform.OS === 'android') {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior="height">
        {scroll}
      </KeyboardAvoidingView>
    );
  }

  return scroll;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
