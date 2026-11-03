import React, { useCallback, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getTodayActions, sendActionFeedback, TodayAction } from '../api/today';
import { Card, Copy } from '../design/components';
import { useTheme } from '../design/theme';

// "Next up" — the health-priorities card. Renders ≤3 backend-ranked actions.
// Silently hides on error or when the flag is off (403 FEATURE_DISABLED → no card).
export default function TodayActionsCard() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [actions, setActions] = useState<TodayAction[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    getTodayActions()
      .then(r => { if (alive) { setActions(r.actions); setLoaded(true); } })
      .catch(() => { if (alive) setActions([]); });
    return () => { alive = false; };
  }, []));

  if (!loaded || actions.length === 0) return null;

  const dismiss = (a: TodayAction) => {
    setActions(prev => prev.filter(x => x.id !== a.id));
    sendActionFeedback(a.actionKey, 'dismissed').catch(() => {});
  };
  const open = (a: TodayAction) => {
    sendActionFeedback(a.actionKey, 'helpful').catch(() => {});
    if (a.action?.route) navigation.navigate(a.action.route, a.action.params || {});
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Ionicons name="sparkles" size={16} color={colors.primary} />
        <Copy accessibilityRole="header" size="title" style={{ fontWeight: '600', flex: 1 }}>Next up for you</Copy>
      </View>
      {actions.map(a => (
        <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${a.title}. ${a.explanation || ''}`}
            onPress={() => open(a)}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
          >
            <Copy size="body" style={{ fontWeight: '600' }}>{a.title}</Copy>
            {a.explanation ? <Copy size="caption" tone="muted">{a.explanation}</Copy> : null}
            {a.evidence?.length ? <Copy size="caption" tone="muted">{a.evidence.join(' · ')}</Copy> : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Dismiss: ${a.title}`}
            onPress={() => dismiss(a)}
            hitSlop={10}
            style={{ padding: 6 }}
          >
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
      ))}
    </Card>
  );
}
