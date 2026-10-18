# Milestone 6: performance, accessibility, measurement and polish

Implemented locally October 17, 2026 after owner approval. M5 and M6 remain local changes. No new cloud build, submission, analytics collection, backend deployment or production user-data change was performed for M6.

## Before and after

| Before | Now |
| --- | --- |
| Repeated Progress refreshes can duplicate identical HTTP requests | Concurrent reads share one in-flight request per account, date window and timezone; success/failure releases the request for fresh retry |
| Food-entry styles reconstructed on every input change | Styles memoized against theme colors |
| Navigation does not explicitly observe reduced-motion changes | Conservative no-animation startup, OS preference subscription and stale-initial-result protection |
| Sheet has no explicit focus/escape handling | Native heading focus on show, accessibility escape and Android back dismissal; no sheet animation |
| Full feedback text competes with header title and Quick Add | 48-point labeled feedback icon with screen-reader hint |
| No consistent product-event boundary | Small runtime-allowlisted event contract with confirmed-action hooks; disabled adapter and no transport/storage |

Progress coalescing affects reads only. It is not a stale-response cache or mutation deduplication mechanism. Keys include the account and actual server query window/timezone. Old-account responses retain the existing rejection before cache writes. Tests demonstrate two simultaneous identical calls produce one API call, distinct windows/accounts remain separate, and failed requests can retry.

Food, label, onboarding, workout and feedback hooks expose no user-supplied fields. Food-entry and label-review elapsed times are coarse buckets, once per mounted entry after successful save. Existing offline save/retry and review workflows remain authoritative. [Event specification and metric limitations](ANALYTICS_EVENTS.md).

## Changed files

- `src/services/progress.ts`: concurrent-read coalescing; expanded regression tests.
- `src/screens/FoodEntryScreen.tsx`: theme-style memoization and confirmed-entry timing.
- `src/hooks/useReducedMotion.ts`, `src/navigation/RootNavigator.tsx`: OS reduced-motion support.
- `src/design/components.tsx`, `src/components/FeedbackButton.tsx`: accessible sheet focus/escape and compact labeled header control.
- `src/analytics/events.ts`: disabled, property-minimized measurement adapter and coarse duration helper.
- `src/screens/OnboardingScreen.tsx`, `LabelScannerScreen.tsx`, `PortionAdjustScreen.tsx`, `src/context/MealsContext.tsx`, `src/hooks/useExerciseSession.ts`, `src/services/feedback.ts`: confirmed-action instrumentation.
- New analytics/reduced-motion/accessibility tests and expanded Progress tests.
- This report, event specification and production handoff.

## Accessibility review

The redesigned core flows retain native font scaling, wrapping controls, 48-point actions, selected/disabled semantics, textual errors and unknown-data labels. Existing light/dark text contrast tests remain in the regression suite. Sheets stay motion-free, expose a heading, request accessibility focus on opening and support escape/back. Stack transitions follow the OS preference, including changes while the app is open. No automatic private-screen capture or animated chart transitions were added.

Automated assertions do not prove VoiceOver/TalkBack behavior, focus restoration to the opener, keyboard traversal, large-font clipping or native-stack animation on devices. Test these on a narrow phone, landscape, 200% text and both themes. Legacy trainer/admin/native-camera screens still require their own full visual/accessibility audit; full-app compliance is not claimed.

## Verification and remaining gates

- 196 mobile tests across 45 suites passed (11 additional cases since M5), including account-isolated concurrent reads, retry after failure, runtime analytics filtering, failure isolation, confirmed workout completion, duration deduplication, reduced-motion races and sheet accessibility semantics.
- TypeScript, release configuration and whitespace checks passed.
- ESLint: zero errors, 30 existing warnings.
- Beta-safe iOS/Android Hermes exports succeeded under `/private/tmp/humai-ux-m6-export-final`.
- Backend unchanged; prior backend/database tests were not rerun.

 No simulator was booted and no native screenshots were captured. Request-count regression tests establish fewer duplicate calls, not measured interaction-latency, memory or startup benchmarks. Profile a signed iOS/Android build with realistic long diaries and rapid navigation before claiming performance targets.

Analytics is intentionally not enabled: provider/consent, identity, retention/export/deletion, native crash reporting and received-feedback resolution evidence remain outstanding. Retention/unique-user metrics are not calculated from anonymous action counts. The event specification states these gaps explicitly.

M5 introduced native mail-composer/view-capture dependencies; M5/M6 need a later native build and signed-device acceptance. Existing build 7 contains only M1–M4. Live AI, supplement durability, legacy activity attribution, dependency audits and automatic Railway migration configuration retain their existing blockers. No public-release readiness is inferred from this milestone.
