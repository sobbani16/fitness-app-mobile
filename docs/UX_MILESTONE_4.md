# Milestone 4: Progress, History, Profile and Settings

Implemented locally October 16, 2026 after owner approval. No production data, remote push/deployment or TestFlight build/submission was performed.

## Before and after

| Before | Now |
| --- | --- |
| Fixed four-week History with surplus/deficit colors, “best day” and on-target streaks | 7/30/90-day Progress with neutral logging coverage, equal-length previous-period comparisons and daily history |
| Only calorie analysis; profile required to render History | Weight, recorded nutrition/macros, water, steps and workout trends from owned records; no profile required for history data |
| History fetches every day before analysis | One bounded bulk progress request; individual diary hydration only when opening a date |
| Missing observations displayed or averaged as zero | Unknown measurements remain null; explicit recorded zeros remain zero; every average/chart group reports coverage |
| Account tab displays daily calorie recommendations and requests weather | Dedicated account/settings, profile and units, appearance, coaching links, privacy/export/delete and sign-out |
| Profile fields start with demo age/height/weight and request location automatically | Blank missing fields, explicit validation and optional user-initiated regional units |
| Unit toggles round stored measurements; save races can duplicate weight history | Canonical measurements survive display toggles; serialized profile writes and a database row lock protect repeat saves |
| Score details present warning/advice strings and rank food contributors | Explicit provisional status, unknown completeness, neutral component explanation and snapshot history; unreviewed advice is not rendered |

## Progress and history

`GET /me/progress?from=YYYY-MM-DD&to=YYYY-MM-DD&timeZone=...` is authenticated through the existing middleware and bounded to 180 days (90 current plus 90 comparison). All five database reads are scoped to `req.userId`; client-supplied user IDs cannot select another account.

Meals, water, weights and workout timestamps are grouped in the viewer's IANA timezone, including DST. Weight is the last recorded measurement per day; it is not carried forward. Steps use the stored calendar date. Duplicate legacy step rows use the maximum daily total rather than adding overlapping snapshots. Workout counts include recorded sessions, including unfinished and legacy sessions, and are not labeled completed workouts.

The UI offers 7/30/90-day windows and older/newer paging. Seven-day and 30-day comparisons cover the immediately preceding equal-length window. Averages include only recorded observations, not gaps. For long ranges, charts use at most ten groups and label observed-day coverage. Changing data coverage can explain differences; no trend is declared a physiological calorie deficit or a successful/failed day.

Daily history uses a month calendar on sufficiently wide layouts and an accessible date list on narrow screens or larger text. Controls preserve 48-point minimum touch targets without horizontal overflow. Opening a day immediately reads device meals, then calls the existing reconciliation path for that day. The diary may include device-only changes that the synced aggregate has not yet included; refresh Progress after synchronization to update charts.

The latest fetched window is cached under the account and timezone, and exported/deleted by existing account-cache lifecycle functions. Offline fallback uses that snapshot or available local meal records. Only the most recent fetched window is cached; other historical windows are not guaranteed offline. There is no invented step, water or weight history from profile defaults. Cache persistence is best effort; a cache-write failure does not discard successful server data.

### Existing data limitations

- Nutrition logs do not have a complete-day flag. The app cannot distinguish a fully logged day from a partial one and does not manufacture completeness percentages.
- Historical explicit fiber zeros cannot be retroactively distinguished from missing values introduced by older clients.
- Existing water/step writes have known local-day/UTC and replacement limitations (F07). This read endpoint groups stored records; it does not repair historical attribution or claim complete sensor coverage.
- Weight history is recorded when profile weight changes. Saving unchanged weight is not a new daily weigh-in. No separate weigh-in feature was invented.
- Counts of days with records describe logging, not actual nutrition intake or physical activity.

## Profile and settings

`Summary` remains the existing navigation route, now shown as Account & settings. EditProfile, TrainerList, TrainerSignup and privacy/migration flows are preserved. Account no longer requests weather/location or generates daily advice.

Profile form retains canonical kg/cm while editing/displaying metric or lb/inches. Switching units alone never changes measurements. Existing account summaries retain feet/inches display. Age, height and current weight are required without fabricated defaults. Goal weight is optional; malformed non-empty input is rejected. Sex/activity/goal require selection on first setup. Location is requested only from the explicit regional-units action, and a stale location response cannot override a later manual unit choice.

The edit screen guards repeated submissions and warns before discarding unsaved changes. Errors retain edits. ProfileContext serializes updates against the latest confirmed profile, rejects account changes and ignores stale initial responses. Backend validation checks whole-number adult age, bounded goal weight and name. The user-row lock prevents simultaneous equivalent profile updates from creating duplicate weight entries. Calorie/target formulas and clinical business rules are unchanged.

Appearance, privacy links, export/deletion, migration restoration and sign-out are discoverable in Account. Existing password reauthentication, typed DELETE and destructive confirmation remain. Onboarding still exposes privacy/export/delete without requiring a completed profile. Privacy and support controls now use shared themed, labeled controls. Some advanced legacy screens retain their original appearance.

## Health score presentation

Score details retain score/component and trend integrations. The UI identifies scores as provisional, explains that missing logs change them, and states that completeness/finalization is unavailable. Negative, non-finite or >100 values are displayed as unavailable, without clamping them into a fabricated valid score. Snapshot charts show actual returned observations, not zero-filled dates.

Unreviewed server insights, food rankings, disease restriction advice and improvement-action suggestions are not rendered on this screen. Component weights remain visible with a heuristic explanation. No backend scoring formula was changed, and clinical validation/finalization remains open under F10. The old unused HealthScoreCard component remains in the repository; the current Today route uses its existing provisional-information card.

## Files changed for this milestone

Mobile:

- `src/screens/HistoryScreen.tsx`, `SummaryScreen.tsx`, `EditProfileScreen.tsx`, `HealthScoreDetailScreen.tsx`, `OnboardingScreen.tsx`.
- `src/components/HistoryCalendar.tsx`, `ProfileForm.tsx`, `AccountPrivacy.tsx`, `ReleaseLinks.tsx`.
- `src/context/ProfileContext.tsx`, `src/services/progress.ts`, `src/design/AppearancePicker.tsx`.
- Tests: HistoryScreen, SummaryScreen, HealthScoreDetailScreen, ProfileForm, AccountPrivacy, ProfileContext and progress utilities. Food-entry AI tests now explicitly enable their tested feature flag rather than depending on the export environment; beta-disabled paths retain their separate tests.
- This report and regenerated production handoff Markdown/HTML.

Backend:

- `src/app.js`, `src/routes/progress.js`, `src/services/progressService.js`, `src/routes/profile.js`.
- `tests/progress.route.test.js`, `tests/progressService.test.js`, `scripts/test-progress-integrity.js`, `docs/UX_MILESTONE_4.md`.

## Verification

- **173 mobile tests passed across 37 suites.** Includes range switching/paging, stale-response rejection, cached fallback, selected-day hydration, unknown-versus-zero averages, unit round trips, required/optional profile validation, repeated taps, serialized profile patches, account changes, privacy confirmations, sign-out and safe score presentation.
- **262 backend tests passed across 30 suites.** Includes bounded ranges, invalid zones/dates, owned queries, DST grouping, missing/zero nutrients and legacy duplicate step totals.
- **Six local PostgreSQL/HTTP integrity scenarios passed:** eight concurrent profile saves create one weight entry; unit-only save creates none; fractional age and invalid goal rejected; progress excludes another account's records; missing and zero remain distinct. Uses a fixture authenticated identity on a disposable loopback server, not a live authentication/production probe. Script refuses remote/non-UX databases and deletes only its own fixtures.
- TypeScript and release configuration checks passed. ESLint: zero errors and 31 pre-existing warnings.
- Both Android/iOS Hermes exports passed in beta-safe mode at `/private/tmp/humai-ux-m4-export`. These are JavaScript bundles, not signed native builds.
- Native screenshots were not captured. On-device font scaling, VoiceOver/TalkBack, dark mode, keyboard/discard behavior, account export/share sheet, DST/travel and two-device acceptance remain required.

## Release and next milestone

Deploy the compatible backend before distributing the updated mobile app. M4 adds no migration, but the pending M2/M3 migrations remain required for this combined working tree. Older servers return 404 for the new progress endpoint; the UI falls back to saved data and reports sync failure rather than inventing trends. No provider, production or native-device acceptance was renewed by these tests.

Milestone 5 (Leo UX, personalization and feedback) requires owner approval before implementation.
