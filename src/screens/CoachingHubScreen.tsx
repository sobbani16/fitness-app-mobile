import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { FeatureKey } from '../config/featureKeys';
import { getUnreadCount } from '../api/conversations';
import { Card, Copy, ListRow } from '../design/components';
import { useTheme } from '../design/theme';
import Chip from '../components/Chip';
import EmptyState from '../components/ui-states/EmptyState';

interface Section {
  key: FeatureKey | null;
  icon: string;
  title: string;
  subtitle: string;
  navigate: (nav: any) => void;
}

const SECTIONS: Section[] = [
  {
    key: 'trainerWorkoutPlansEnabled',
    icon: '🏋️',
    title: 'Workout plans',
    subtitle: 'Build, publish and assign training plans',
    navigate: (nav) => nav.navigate('TrainerPlanList'),
  },
  {
    key: 'trainerNutritionGuidanceEnabled',
    icon: '🥗',
    title: 'Nutrition guidance',
    subtitle: 'Meal guidance and macro targets for clients',
    navigate: (nav) => nav.navigate('TrainerNutrition'),
  },
  {
    key: 'trainerMessagingEnabled',
    icon: '💬',
    title: 'Messages',
    subtitle: 'Direct messages with your clients',
    navigate: (nav) => nav.navigate('Conversations'),
  },
  {
    key: 'trainerSchedulingEnabled',
    icon: '📅',
    title: 'Schedule',
    subtitle: 'Availability, session types and bookings',
    navigate: (nav) => nav.navigate('TrainerSchedule'),
  },
  {
    key: 'trainerDashboard',
    icon: '👥',
    title: 'Clients',
    subtitle: 'Roster, progress and meal plans',
    navigate: (nav) => nav.navigate('Main', { screen: 'Clients' }),
  },
  {
    key: 'trainerCopilotEnabled',
    icon: '🧭',
    title: 'Copilot',
    subtitle: 'Draft suggestions from shared client data — you confirm',
    navigate: (nav) => nav.navigate('Copilot'),
  },
  {
    key: 'groupMessagingEnabled',
    icon: '👥',
    title: 'Groups',
    subtitle: 'Cohorts, challenges and group chat',
    navigate: (nav) => nav.navigate('Groups'),
  },
  {
    key: 'trainerDocumentsEnabled',
    icon: '📄',
    title: 'Documents',
    subtitle: 'Shared guides and education PDFs',
    navigate: (nav) => nav.navigate('Documents'),
  },
  {
    key: 'videoSessionsEnabled',
    icon: '🎥',
    title: 'Video sessions',
    subtitle: 'Schedule, join and review calls',
    navigate: (nav) => nav.navigate('VideoSessions'),
  },
  {
    key: 'trainerPaidCoachingEnabled',
    icon: '💳',
    title: 'Coaching packages',
    subtitle: 'Pricing and packages you offer',
    navigate: (nav) => nav.navigate('TrainerPackages'),
  },
];

export default function CoachingHubScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { isEnabled } = useFeatureFlags();
  const [unread, setUnread] = useState(0);

  const visible = SECTIONS.filter((s) => s.key === null || isEnabled(s.key));
  const messagingOn = isEnabled('trainerMessagingEnabled');

  useFocusEffect(useCallback(() => {
    let live = true;
    if (messagingOn) {
      getUnreadCount().then((count) => { if (live) setUnread(count); }).catch(() => {});
    }
    return () => { live = false; };
  }, [messagingOn]));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
      <Copy size="title" accessibilityRole="header" style={{ fontWeight: '700' }}>Coaching</Copy>
      <Copy tone="muted">Your trainer tools in one place.</Copy>

      {visible.length === 0 && (
        <EmptyState title="No coaching tools yet"
          description="Advanced trainer features are not enabled on your account right now." />
      )}

      <Card>
        {visible.map((s) => (
          <ListRow key={s.title} title={`${s.icon} ${s.title}`} subtitle={s.subtitle}
            onPress={() => s.navigate(navigation)}>
            {s.key === 'trainerMessagingEnabled' && unread > 0 && (
              <View accessibilityLabel={`${unread} unread messages`}
                style={{ minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 }}>
                <Copy size="caption" style={{ color: colors.onPrimary, fontWeight: '700' }}>{unread > 99 ? '99+' : unread}</Copy>
              </View>
            )}
            <Chip small label="Open" accessibilityLabel={`Open ${s.title}`} />
          </ListRow>
        ))}
      </Card>
    </ScrollView>
  );
}
