import { trackEvent } from '../analytics/events';
import * as MailComposer from 'expo-mail-composer';
import { Platform } from 'react-native';
export type FeedbackKind = 'Bug report' | 'Feature suggestion' | 'General feedback';
const screens: Record<string, string> = { Dashboard: 'Today', LogMeal: 'Food', FoodEntry: 'Food entry', LabelScanner: 'Label scan', PortionAdjust: 'Portion review', LogExercise: 'Workout', History: 'Progress', Summary: 'Account', EditProfile: 'Profile editor', Chat: 'Leo', LeoHelp: 'Leo guide', Onboarding: 'Profile setup', HealthScoreDetail: 'Score details', TrainerList: 'Trainer discovery', TrainerDetail: 'Trainer details', TrainerSignup: 'Trainer enrollment', ClientProgress: 'Client progress', WeeklyPlan: 'Meal plan' };
export const feedbackScreen = (route?: string) => screens[route || ''] || 'App';
/** Best-effort structured-secret/contact redaction; no claim to detect all health details or names. */
export function redactFeedback(text: string) {
  return text
    .replace(/\bBearer\s+[\w.\-]+/gi, '[token removed]')
    .replace(/\b(?:sk-proj-|sk-|re_|ghp_)[A-Za-z0-9_\-]{16,}/g, '[key removed]')
    .replace(/\b(?:password|token|secret|api[_ -]?key)\s*[:=]\s*\S+/gi, '[credential removed]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]')
    .replace(/(?:\+?\d[\d ()-]{7,}\d)/g, '[number removed]')
    .replace(/\b\d+(?:\.\d+)?\s*(?:kg|lbs?|kcal|calories|mg\/dl|mmol\/l|bpm)\b/gi, '[measurement removed]');
}
export async function composeFeedback(kind: FeedbackKind, route: string | undefined, message: string, approvedAttachment?: string) {
  const recipient = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('Support email is not configured in this build. Use TestFlight feedback instead.');
  if (!message.trim() || message.length > 4000) throw new Error('Enter feedback between 1 and 4000 characters.');
  if (!await MailComposer.isAvailableAsync()) throw new Error('Set up a mail account on this device, or use TestFlight feedback. Your draft is still here.');
  const result = await MailComposer.composeAsync({ recipients: [recipient], subject: `Humai · ${kind}`, isHtml: false,
    body: `Type: ${kind}\nScreen: ${feedbackScreen(route)}\nPlatform: ${Platform.OS}\n\n${redactFeedback(message.trim())}`,
    ...(approvedAttachment ? { attachments: [approvedAttachment] } : {}),
  });
  trackEvent('feedback_composer_opened');
  // Android reports a sent status on handoff, not delivery. Never turn it into a delivery receipt.
  const messageText = Platform.OS === 'android' ? 'Email app opened. Send or discard your message there; delivery is not confirmed.'
    : result.status === 'sent' ? 'Your email app reports that the message was sent. Delivery is not confirmed.'
    : result.status === 'saved' ? 'Feedback saved in your email drafts.' : 'Email composer closed. You can review and try again.';
  return { message: messageText, completed: Platform.OS === 'android' || result.status === 'sent' || result.status === 'saved' };
}
