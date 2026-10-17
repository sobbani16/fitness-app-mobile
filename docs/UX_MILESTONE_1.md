# UX milestone 1 — audit and Today

Scope: repository audit, shared visual foundation, navigation proposal, and Today. No production data changes, cloud build, submission, or later-milestone rollout is authorized by this change. Audit is based on source, not a claim of observing physical-device usability. Supplied screenshots show deployment tools, not app screens.

## Prioritized audit (before implementation)

| Severity | Evidence / journey | User impact | Proposed treatment |
| --- | --- | --- | --- |
| High | Dashboard recommendations failure replaces the entire screen | Saved meals and logging controls disappear offline | Independent target loading; keep local diary visible (M1) |
| High | Dashboard suggests burning calories and interprets missing logs as undereating | Misleading, guilt-inducing advice; activity may overlap TDEE | Show logged intake and server target separately; remove compensatory advice, no calculation changes (M1) |
| High | HealthScoreCard and History apply rankings/warnings to incomplete logs | Heuristic scores appear authoritative | Today explains provisional data; retain detail access with disclaimer. Audit scoring/finalization and History in M4 |
| High | DailyStats silently catches water/supplement sync errors; tap races | False confidence and possible duplicate/lost updates | Serialize Today water action, expose local/server outcome and retry (M1); durable cross-device conflict handling and supplements remain outstanding |
| Medium | Weather and motion permissions requested on Dashboard mount | Permissions arrive without context | Explicit connect actions (M1) |
| Medium | Dashboard recommendations depend on every step update; hidden catalog fetched | Avoidable traffic and loading | Fetch goals on focus/refresh, isolate optional integrations (M1) |
| Medium | Long dashboard repeats calorie/balance/health/recommendation cards | Key logging action below the fold | One calorie summary, macro grid, quick add, diary preview (M1) |
| Medium | Raw Dashboard/Summary labels and feature-gated tabs | Unclear destinations | Today/Food/Workout/Progress/Account labels; preserve route keys (M1) |
| Medium | Food form combines search, recipes, AI, manual entry | High cognitive load | Entry chooser/recent foods, verified portion review (M2) |
| Medium | Workout has exercise/set/rep and camera flows but no complete session lifecycle | Unclear start/finish and repeated input | Preserve camera integrations; session design (M3) |
| Medium | History has date hydration and score summaries, not complete 7/30/90 trends | Missing days can look successful | Data completeness and trend design (M4) |
| Medium | Hardcoded light colors, uneven targets and typography | Inconsistent accessibility and dark appearance | Shared tokens/primitives and Today adoption (M1); migrate remaining screens in their milestones |
| Medium | Profile/onboarding is a lengthy form; account and trainer settings intermixed | Setup burden, settings discovery | Progressive collection and dedicated settings (M4) |
| Low | No demonstrated privacy-safe product analytics/feedback pipeline | No baseline for task completion | Specify events now, implement consent/redaction pipeline M5–6 |

## Screen / capability inventory

- AuthGate: sign in/register, password recovery, email verification; account lifecycle and legacy migration gates exist. Keep flows unchanged.
- Onboarding / EditProfile: profile, units, goals; existing validation retained.
- Dashboard: meals, water, motion, weather, recommendation and score integrations; rewritten as Today in M1.
- LogMeal / LabelScanner / PortionAdjust: search/manual entries, camera/OCR and quantity review exist. AI photo/text and recipe features require working services. Favorites are not assumed implemented.
- LogExercise: exercise selection, sets/reps/weight, previous-performance assistance, camera rep/posture flows. Full workout templates/session lifecycle not established.
- History: older-day server hydration and local diary exist; broad trends/completeness UX remains M4.
- Summary: profile, unit/weight overview, trainer discovery, privacy/export/deletion/sign-out. Account destination retained.
- HealthScoreDetail: server heuristic breakdown; no finalized-day or reliable completeness contract found. Do not invent a percentage or label scores finalized.
- WeeklyPlan: preferences/catalog integration exists but beta-safe mode hides it; nutrition provenance work is not proof of all catalog quality.
- Chat: existing contextual AI conversation; beta-safe mode hides it. Today insight is explicitly a local diary note, not fabricated Leo output.
- Clients / ClientProgress / ClientMealPlan / TrainerDropForm: role-gated coaching flows retained.
- TrainerList / TrainerDetail / TrainerSignup / ClientDropSurvey: discovery, enrollment and relationship flows retained.
- Supplements: catalog/checklist/quantity controls exist outside beta-safe mode; durable/idempotent offline logging remains pending N16.

## Navigation proposal

Current release routes stay intact. M1 labels: **Today → Food → Workout → Progress → Account**, plus role-gated Clients and feature-gated Leo. A header quick-add opens existing scan, food, exercise, profile/weight, and Today water controls. Search and manual food entry currently share the same existing Food form; do not pretend a new search destination exists.

Future: Today / Plan / Progress / Leo with a global add button, once Plan and Leo meet release acceptance. Plan would group workouts and weekly meals. Moving existing Food/Workout tabs into this structure requires milestone approval and validation; disabled capabilities are not enabled for appearance.

## Visual foundation

Calm green primary, warm neutral background, explicit semantic text and corresponding dark tokens. System fonts with native scaling, 4/8/12/16/24/32 spacing, 12/20 radii, restrained elevation. Ionicons retain familiar native-style symbols. Minimum 48-point controls; wrapping text and bounded fluid content. No decorative motion; static skeletons also respect reduced-motion preferences. Shared card, text, button, input, sheet, progress, chart and state components form the foundation; only Today and navigation chrome adopt it in M1. Legacy screens are not claimed dark-mode complete.

## Analytics specification (not yet instrumented)

No health values, food names, body measurements, free text, identifiers, screenshots or chat content in event payloads. No new external telemetry SDK in M1.

| Event | Allowed properties | Purpose |
| --- | --- | --- |
| onboarding_completed | schema_version, app_version | Completion rate |
| food_log_started / food_log_completed | entry_method (manual/search/label/photo), duration_bucket, outcome | Task completion and time |
| label_scan_started / label_scan_completed | platform, outcome (saved/cancelled/failed) | Scan funnel |
| workout_completed | app_version, platform | Session completion, once lifecycle exists |
| quick_add_opened | screen enum | Discoverability |
| feedback_submitted | category enum, screenshot_consent boolean | Feedback adoption |

Retention requires an approved pseudonymous identity/consent/deletion policy; DAU/WAU/7-day/30-day metrics are not available yet. Crash-free sessions need a scrubbed crash pipeline. Establish baseline before claiming improvements.

## Before → after / validation

Implementation and test evidence are recorded below after completion. Physical iOS/Android accessibility, large-font, theme and sensor acceptance remain required before a beta build.

## Implemented — October 16, 2026

| Before | After |
| --- | --- |
| Recommendations error hides Dashboard | Saved meals remain visible; target loading/retry is independent |
| Calorie “balance”, burn-food advice and raw recommendation enums | Logged calories and existing server target, with an estimate/incomplete-log explanation; no extra exercise allowance |
| Full health-score card dominates Today | Optional explanatory details; no invented finalized score or completeness percentage |
| Immediate location/motion requests | Connect steps / Connect local weather actions; unsupported motion state and retry |
| Unlabeled missing fiber | Incomplete-data label; known nutrients still shown |
| Water controls silently sync | Local-save feedback, concurrent-tap guard, sync-pending message and explicit retry |
| Dashboard / Summary tabs | Today / Account; all route keys and role/beta gates retained |
| Scattered light styling | Shared light/dark tokens; system/manual appearance; themed Today and navigation |

The contextual note is deterministic diary guidance and is labeled as such. It is not presented as Leo output. The legacy recommendations API remains available in the repository; Today deliberately no longer uses its balance/advice response. Nutrition business rules were not edited. Existing macro-goal API supplies the targets.

### Changed files

- `App.tsx`: theme provider, navigation colors and status bar.
- `src/design/theme.tsx`, `components.tsx`, `AppearancePicker.tsx`: tokens, appearance persistence and reusable controls/states/chart foundation.
- `src/navigation/MainTabs.tsx`, `src/components/QuickAdd.tsx`: labels and quick-add navigation using existing destinations.
- `src/screens/DashboardScreen.tsx`: Today hierarchy, diary fallback, goals, macros, hydration, optional details, local day rollover.
- `src/components/today/StepsCard.tsx`, `OptionalDetails.tsx`: contextual device permissions; preserved weather and feature-gated supplement controls.
- `src/hooks/useDailyStats.ts`, `useStepCounter.ts`: water action guard/retry/error state, optional supplement loading, motion loading state.
- `src/util/todaySummary.ts`: local-day filtering and unknown-value handling.
- Five new test files: Today screen, quick add, theme, daily stats, and Today summary.
- `docs/PRODUCTION_HANDOFF.md` and generated HTML: latest evidence and outstanding acceptance. This audit contains navigation and analytics proposals.

### Verification

- Jest: **130 tests passed across 24 suites**, including existing account, diary, history, exercise and OCR/food-related coverage. New tests cover offline targets/cached meals, missing fiber, date boundaries, rapid water actions, failed local writes, sync retry, contextual motion access, existing quick-add destinations, theme persistence/races and text contrast.
- TypeScript: passed.
- ESLint: zero errors; 33 existing warnings remain (down from 38 before this work).
- Release configuration check: passed; this does not validate live services or Apple distribution.
- iOS and Android Hermes JavaScript exports: passed with beta-safe mode enabled. Artifacts are local under `/private/tmp/humai-ux-m1-export`; no signed native build was created.
- Whitespace validation: passed.
- CoreSimulator inspection: no booted device. No actual app screenshots captured in this pass; source/render tests and bundles are not visual or native acceptance.

### Accessibility review and remaining acceptance

Text is native-scalable, layouts wrap, primary controls have 48-point minimum height, loading/error states include words, and sheets support Android back/dismissal. No decorative animation is introduced. Automated light/dark text pairs meet 4.5:1 contrast. VoiceOver/TalkBack focus movement, sheet focus return, 200% fonts, narrow displays, landscape and real sensor permissions still require device checks. Legacy screens retain their styling until their milestones; full-app dark mode is not claimed.

Water remains device-local with best-effort server synchronization, not a durable outbox: sync warnings do not survive process death, and cross-device reconciliation needs separate work. Supplements retain their existing best-effort behavior and beta restriction; N16 is still PARTIAL. No changes to backend scores, condition restrictions or medical rules were made. History still needs incomplete-log wording and score validation in M4. Step counts are explicitly potentially partial; accuracy/background lifecycle need real-device validation. Weather supports the existing Celsius API presentation; broader unit consistency remains M4.

No new telemetry, production user-data changes, TestFlight build or submission. Milestone 2 (food logging/scanning/portion review) requires user approval before implementation.
