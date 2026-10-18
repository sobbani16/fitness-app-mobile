# Milestone 5: Leo, personalization and feedback

Implemented locally October 17, 2026 after owner approval. Milestone 5 is not in the already completed iOS build 7 and has not been pushed or submitted. No production user records were changed for this milestone.

## Before and after

| Before | Now |
| --- | --- |
| Leo is only a chat tab, hidden in safe beta builds | A Leo guide is reachable from Today and Account even with AI disabled; AI remains disabled in TestFlight |
| Generic chat and hard-to-discover next steps | Saved goal/protein target explanation and direct links to Progress, food search and workouts |
| No explicit saved-context choice | AI-enabled builds offer opt-in sharing of the displayed goal/protein target; no automatic profile, logs or conversation-history upload |
| Fixed Today cards | Account settings can hide daily note, water, steps and meal preview; food totals and quick logging remain available |
| Plain email feedback link | Bug, feature and general feedback with current-screen context, review, native email draft and optional manually redacted screenshot |

## Behavior and privacy

Leo uses only loaded server targets and saved goals, labels estimates and incomplete records, and reports unavailable data without inventing values. The beta guide is local explanatory copy, explicitly identified as not AI. It routes to existing features rather than fabricating trend analysis or meal/workout plans. In AI-enabled builds, each question is independent. Dynamic server quota, explicit send, repeated-tap guarding and retryable failures replace assumed success. Failed requests may consume quota. Questions and replies are kept only while the screen is mounted. No automatic retry, logging of suggestions, chat persistence or new upstream integration was added.

Personalization builds on existing unit/theme settings and activity-based Today copy. Optional cards are account-scoped on this device, validated on load and changed only after successful storage. Existing account export/deletion covers their storage key. No dietary preferences, fitness experience or health conditions are inferred where reliable data is unavailable.

Feedback opens a user-controlled email composer; opening it is not proof of delivery. Only a mapped screen name and platform are added. Text receives best-effort credential/contact/measurement-pattern redaction, then requires explicit review. Names and arbitrary health narratives cannot be automatically detected. Raw drafts remain in memory only; no automatic analytics, profile/log attachment or server feedback database was added.

The optional image picker is user initiated. Sixteen accessible horizontal-strip controls mask selected areas. Only the selected image plus opaque masks is flattened into a PNG; the app screen is never captured automatically. The flattened preview needs separate approval, then the whole message needs review. Removing/changing an attachment revokes review. Cancelled iOS email drafts retain the in-app text and discard warning. Picker copies owned by this feature and generated images receive best-effort cache cleanup; OS email drafts already saved by the user are outside app control.

## Changed files

- `src/screens/ChatScreen.tsx`, `DashboardScreen.tsx`, `SummaryScreen.tsx`, `OnboardingScreen.tsx`, new `FeedbackScreen.tsx`.
- `src/context/DisplayPreferencesContext.tsx`; `src/components/DashboardPreferences.tsx`, `FeedbackAttachment.tsx`, `FeedbackButton.tsx`; `src/services/feedback.ts`.
- `src/navigation/RootNavigator.tsx`, `MainTabs.tsx`, `App.tsx`.
- `package.json`, lockfile and `app.json`: SDK-compatible `expo-mail-composer`, its plugin, and `react-native-view-shot`.
- Six test files cover Leo, feedback service/screen/attachment, display preferences and Today card visibility.
- Release evidence, this report and generated production handoff.

## Verification

- 185 mobile tests across 42 suites passed, including 12 new regression cases.
- TypeScript and release configuration checks passed.
- ESLint: zero errors, 30 warnings in existing code.
- iOS and Android Hermes exports succeeded at `/private/tmp/humai-ux-m5-export`. These are bundle checks, not native builds or device acceptance.
- Backend unchanged for M5; the prior 262 backend tests and six database integrity scenarios were not rerun.
- No simulator was booted; no screenshot or native interaction acceptance is claimed.

The attachment test verifies manual capture and approval gating using mocks. It does not prove native pixel redaction or email attachment delivery. Before distributing M5, build the new native dependencies and test iOS/Android photo selection, masked pixels in the actual received PNG, email cancel/save/send and attachment lifetime, large text, screen readers, dark mode, account switching, offline storage errors and navigation. AI-enabled behavior is mocked; live upstream success remains blocked by configuration and acceptance requirements. The existing dependency-audit release gates remain open.

## Separate approved release checkpoint

M1–M4 were pushed as mobile `ac80be6` and backend `d8c02a4`. EAS iOS build 7 (`6207b65d-51f6-4609-bf7d-787f4be2edd5`) finished successfully. It was not submitted to App Store Connect. Railway deployment succeeded; the two pending schema migrations were applied after a protected backup, and `/health` returned 200. Railway automatic pre-deploy migration execution remains unverified/ineffective in this release; do not assume future migrations run automatically.

Milestone 6 (performance, accessibility, analytics and polish) requires owner approval.
