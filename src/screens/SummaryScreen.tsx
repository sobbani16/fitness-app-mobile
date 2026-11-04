import React, { useRef, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useProfile } from '../context/ProfileContext';
import { Action, Card, Copy, Segmented, Notice, Skeleton } from '../design/components';
import AppearancePicker from '../design/AppearancePicker';
import { useTheme } from '../design/theme';
import DashboardPreferences from '../components/DashboardPreferences';
import AccountPrivacy from '../components/AccountPrivacy';
import { ACTIVITY_LABELS, GOAL_LABELS } from '../components/ProfileForm';
import { formatHeight, formatWeight } from '../util/units';
import { api } from '../api/client';
import { getSession, saveSession } from '../storage/session';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { useRoles } from '../context/RolesContext';
export default function SummaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { isEnabled } = useFeatureFlags();
  const { hasRole } = useRoles();
  const { profile, loading, update } = useProfile();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const lock = useRef(false);
  const run = async (action: () => Promise<void>, success = '') => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(success); }
    catch { setError('Could not complete this action. Check your connection and try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const signOut = () => Alert.alert('Sign out?', 'Your account data stays saved. Device-only favorites and pending logs remain on this device for your next sign-in.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => void run(async () => { const token = getSession()?.token; await api.post('/auth/logout'); if (getSession()?.token === token) await saveSession(null); }) },
  ]);
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
    <Copy size="title" accessibilityRole="header">Account & settings</Copy>
    {loading && <Skeleton label="Loading profile" />}
    {!!error && <Notice title="Please try again" message={error} error />}
    {!!message && <Notice title="Saved" message={message} />}
    <Card><Copy size="heading">{profile?.name || 'Your profile'}</Copy>
      {!!profile && <><Copy>{formatHeight(profile.heightCm, profile.units)} · {formatWeight(profile.weightKg, profile.units)}</Copy>
        <Copy>{GOAL_LABELS[profile.goal]} · {ACTIVITY_LABELS[profile.activityLevel]}</Copy>
      </>}
      <Action label="Edit profile" disabled={busy || loading} onPress={() => navigation.navigate('EditProfile')} />
      {!!profile && <Segmented<'metric' | 'imperial'> label="Display units" value={profile.units as 'metric' | 'imperial'}
        options={[{ value: 'metric', label: 'kg · cm' }, { value: 'imperial', label: 'lb · ft' }]}
        onChange={unit => { if (!busy) void run(() => update({ units: unit }), 'Display units updated. Measurements are unchanged.'); }} />}
    </Card>
    <Card><AppearancePicker /></Card><Card><DashboardPreferences /></Card>
    <Card><Copy size="heading">Workout & plan</Copy>
      <Copy tone="muted">Your plan days drive reminders and Today. Workout weight units (lb/kg) are chosen on the Workout screen while logging.</Copy>
      <Action secondary label="My workout plan" onPress={() => navigation.navigate('WorkoutPlan')} />
    </Card>
    {(isEnabled('leoProgressEnabled') || isEnabled('weeklyHealthReviewEnabled')) && <Card><Copy size="heading">Progress & review</Copy>
      {isEnabled('leoProgressEnabled') && <Action secondary label="My progress" onPress={() => navigation.navigate('UnifiedProgress')} />}
      {isEnabled('weeklyHealthReviewEnabled') && <Action secondary label="Weekly review" onPress={() => navigation.navigate('WeeklyReview')} />}
    </Card>}
    <Card><Copy size="heading">Reminders</Copy><Action secondary label="Smart reminders" onPress={() => navigation.navigate('SmartReminders')} /><Action secondary label="Reminder history" onPress={() => navigation.navigate('ReminderInbox')} />{(isEnabled('appleHealthSync') || isEnabled('androidHealthSync')) && <Action secondary label="Connected health" onPress={() => navigation.navigate('ConnectedHealth')} />}</Card>
    {isEnabled('trainerDashboard') && <Card><Copy size="heading">Coaching</Copy><Action secondary label="Find a trainer" onPress={() => navigation.navigate('TrainerList')} />{!hasRole('TRAINER') && <Action secondary label="Become a trainer" onPress={() => navigation.navigate('TrainerSignup')} />}{isEnabled('trainerCoaching') && <Action secondary label="Coaching requests" onPress={() => navigation.navigate('CoachingRequests')} />}{hasRole('TRAINER') && isEnabled('trainerAdvancedFeaturesEnabled') && <Action secondary label="Coaching hub" onPress={() => navigation.navigate('CoachingHub')} />}{hasRole('TRAINER') && isEnabled('trainerCoaching') && <Action secondary label="Trainer profile" onPress={() => navigation.navigate('EditTrainerProfile')} />}{isEnabled('trainerMessagingEnabled') && <Action secondary label="Messages" onPress={() => navigation.navigate('Conversations')} />}{isEnabled('trainerWorkoutPlansEnabled') && !hasRole('TRAINER') && <Action secondary label="My workout plans" onPress={() => navigation.navigate('ClientPlans')} />}{isEnabled('trainerSchedulingEnabled') && !hasRole('TRAINER') && <Action secondary label="My sessions" onPress={() => navigation.navigate('MyBookings')} />}</Card>}
    <Card><Copy size="heading">Privacy & support</Copy>{isEnabled('aiCoach') && <Action secondary label="Open Leo guide" onPress={() => navigation.navigate('LeoHelp')} />}<Action secondary label="Give feedback" onPress={() => navigation.navigate('Feedback', { source: 'Summary' })} /><AccountPrivacy /></Card>
    <Card><Copy size="heading">Sign-in</Copy><Copy tone="muted">Signing out does not delete your account. Account deletion is under Privacy & support.</Copy><Action label={busy ? 'Please wait…' : 'Sign out'} secondary disabled={busy} onPress={signOut} /></Card>
  </ScrollView>;
}
