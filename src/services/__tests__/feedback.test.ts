jest.mock('expo-mail-composer', () => ({ isAvailableAsync: jest.fn(), composeAsync: jest.fn() }));
import * as Mail from 'expo-mail-composer';
import { composeFeedback, redactFeedback, feedbackScreen } from '../feedback';
const available = Mail.isAvailableAsync as jest.Mock, compose = Mail.composeAsync as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'support@example.com'; available.mockResolvedValue(true); compose.mockResolvedValue({ status: 'cancelled' }); });
it('redacts structured secrets, contacts and measurements', () => {
  expect(redactFeedback('password=abc Bearer abc.def alex@example.com +1 555 123 4567 75 kg')).not.toMatch(/abc|alex|555|75/);
  expect(feedbackScreen('private-user-id')).toBe('App');
});
it('includes only reviewed text and allowlisted context, with no implicit attachment', async () => {
  const result = await composeFeedback('Bug report', 'Dashboard', 'Email alex@example.com');
  expect(compose.mock.calls[0][0]).toEqual({ recipients: ['support@example.com'], subject: 'Humai · Bug report', isHtml: false, body: expect.stringContaining('Screen: Today') });
  expect(compose.mock.calls[0][0].body).not.toContain('alex@example.com');
  expect(result.completed).toBe(false);
});
it('attaches only the explicitly supplied reviewed file', async () => {
  await composeFeedback('General feedback', 'Chat', 'Issue', 'file:///redacted.png');
  expect(compose.mock.calls[0][0].attachments).toEqual(['file:///redacted.png']);
});
it('does not open composer without an available email account or valid input', async () => {
  available.mockResolvedValue(false);
  await expect(composeFeedback('Bug report', '', 'Issue')).rejects.toThrow('mail account');
  await expect(composeFeedback('Bug report', '', ' ')).rejects.toThrow('Enter feedback');
  expect(compose).not.toHaveBeenCalled();
});
