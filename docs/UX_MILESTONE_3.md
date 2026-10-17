# Milestone 3: workout logging

Implemented locally on October 16, 2026 following owner approval. No remote push, deployment, TestFlight build/submission or production data changes.

## Before and after

| Before | Now |
| --- | --- |
| Horizontal exercise picker with no search | Search, Push/Pull/Legs categories, recent exercises and local favorites |
| Session disappears from view when exercise changes | Explicit Start → Log sets → Finish → Review; active exercise stays fixed until finished |
| Unitless weights; camera kilograms could be treated as pounds | Explicit lb/kg controls; conversions preserve the backend's existing pound storage. Camera weight estimates no longer overwrite entered weight |
| Tap races and ambiguous network retries | Immediate action guard, durable operation payload before request, stable session/set IDs, transactional replay protection |
| No recoverable active session | Account-scoped local draft restores confirmed sets and pending operation after process restart |
| No finish marker or summary | Authenticated idempotent finish endpoint, persisted finish time, saved sets/reps and elapsed-time review |
| No reuse beyond prefill | Previous-set reuse; unchanged fields retained; locally saved single-exercise templates |
| Hard-coded colors and small controls | Shared theme, labeled fields, textual states, wrapping controls and minimum 48-point actions |

## Behavior and scope

A workout contains **one exercise** and up to 100 sets. Finish it before choosing another exercise. This retains the existing exercise/session model rather than inventing multi-exercise grouping. Templates use the last set's reps/weight plus the workout's set count; they prefill a new workout and never automatically log sets. Favorites and up to 20 named templates are account-scoped on this device, covered by the existing cache export/deletion mechanism, and are not cloud-synced.

The backend stores pounds (`ExerciseSet.weightLbs`). Existing values were not reinterpreted or rewritten. New unit selection converts values; bodyweight is an explicit zero added load. Unknown historical weights are shown as unrecorded. Integer reps 1–1000 and weight 0–2000 lb are validated. Rest uses a 60-second timestamp countdown; workout time uses timestamps, so backgrounding does not accumulate interval drift. There are no background timer notifications. Rest timer state and unsubmitted field edits are not process-durable; the workout and a submitted-but-unconfirmed set are.

Logging persists the operation locally before sending. A failed network response leaves the original set locked for retry. Retry sends the same payload and IDs, including after remount. Confirmed sets remain on the server. Finish also survives an uncertain response and prevents new sets until resolved. The UI never claims an unconfirmed set is saved remotely. This is explicit retry, not a general automatic offline queue. New sessions must start within seven days of the server clock; existing-ID replay is checked before that age restriction. A newly created offline workout left unsynced longer than seven days requires support/reconciliation, not an automatic new identity.

History loads on focus/completion/retry, not every timer tick. The existing server limit is 200 sessions; the home exposes the five newest reviews. A fresh installation can read those server sessions, but cannot reconstruct a missing local pending operation, local templates or unsent workout. Older sessions have no finish marker and are labeled accordingly.

Camera rep counting and posture overlays remain available through their original integration. Counts require user review; no estimated camera weight is automatically saved. Leaving the screen stops detection, and closing during initialization prevents late activation. Native accuracy acceptance remains separate (F04).

## Backend integrity and release order

`20261016190000_workout_finish` adds nullable `WorkoutSession.finishedAt`; legacy sessions are not backfilled as completed. Existing session/set IDs provide idempotency without an additional operation table. Concurrent appends/finish acquire the same owned-session row lock. Finished sessions reject new sets but accept replay of an already committed set. Conflicting payloads or another account's create identity are rejected.

**Deploy the compatible backend and migrations, and generate its Prisma client before distributing the mobile app.** The pending M2 nullable-nutrition migration is also required. Only the disposable local database has been migrated (21 migrations total). Old mobile clients lacking stable IDs do not gain retry guarantees. Do not distribute against the older server: its finish route and ID handling are incompatible with this UI's guarantees.

## Changed files

Mobile:

- `src/screens/LogExerciseScreen.tsx`: themed workout home, search/categories, favorites/templates, active flow, timing, review and camera controls.
- `src/hooks/useExerciseSession.ts`: persisted draft and guarded retry/finish lifecycle.
- `src/hooks/useExerciseDetection.ts`: cancel stale initialization and prevent concurrent starts.
- `src/api/exercises.ts`, `src/types/exercise.ts`: operation identities and finish contract.
- `src/services/exerciseAutofill.ts`: validation, units and timestamp utilities.
- `src/hooks/__tests__/useExerciseSession.test.js`, `useExerciseDetection.test.js`, `src/screens/__tests__/LogExerciseScreen.test.js`, `src/services/__tests__/exerciseAutofill.test.ts`.
- This report and the production handoff Markdown/generated HTML.

Backend:

- `prisma/schema.prisma`, `prisma/migrations/20261016190000_workout_finish/migration.sql`.
- `src/models/persistentExerciseStore.js`, `exerciseSessionStore.js`, `src/controllers/exerciseController.js`, `src/routes/exercises.js`.
- `tests/exercises.route.test.js`, `scripts/test-workout-integrity.js`, `docs/UX_MILESTONE_3.md`.

## Verification and remaining acceptance

- 159 mobile tests passed in 32 suites: includes rapid duplicate taps, process-remount replay, failed local writes, uncertain finish, account changes, validation/units, search/start and canceled camera initialization.
- 257 backend tests passed in 28 suites, including owned finish routing.
- Eight PostgreSQL integrity scenarios passed against disposable localhost data: concurrent create, concurrent append, changed-payload conflict, account isolation, idempotent finish, reject new sets after finish, replay after finish and persistent review. Each concurrency check uses eight simultaneous requests to the real store. This supplements the test-only in-memory route fixture.
- TypeScript and release configuration checks passed. ESLint passed with zero errors/32 existing warnings. Final iOS and Android Hermes exports passed (`/private/tmp/humai-ux-m3-export`); this is not a native build.
- Native screenshots were not captured. Signed iOS/Android acceptance still requires keyboard/large-font/screen-reader checks, camera permissions/count accuracy, background/foreground transitions, process termination while offline, and two-account/two-device history against the deployed compatible backend.
- No claim of full native, offline or accessibility certification is made by JS/component tests.

Owner approval is required before Milestone 4: Progress, History, Profile and Settings.
