# UX 2.0 — M7 Personalized Workouts

Milestone 7 wires the existing personalized-plan stack end to end: the
Workout tab now surfaces the user's confirmed plan, drafts gain exercise
replacement, and conservative progression suggestions appear where sets
are logged. No AI exercise ever activates without user confirmation and
deterministic rule validation.

## What already existed (audited, kept)

- `UserWorkoutPlan` (versioned drafts; only one `active`; confirm
  transactionally archives prior actives).
- `workoutPlanner` — AI proposes structure using ONLY catalog IDs;
  `exerciseSuitability` then classifies every exercise
  (`suitable|adapt|needs-info|review`); unsuitable/invented IDs are
  removed with warnings. `recent-injury`/`rehab`/`medical-restriction`
  always route to `review` — never auto-prescribed.
- `workoutProgression.suggestNext` — maintain/reduce/increase only;
  ≥2 consistent sessions before any increase; discomfort or dropped
  volume → reduce; `intensity: gentle` → maintain; increases capped at
  ~5–10% weekly. Suggestions are advice text — never auto-applied.
- `WorkoutPlanScreen` — optional-preference capture (location, equipment,
  experience, days, minutes, limitations), draft → edit sets/remove →
  save (server re-validates) → confirm flow.

## New this milestone

- **`GET /personal-plans/catalog`** — returns the exercise catalog with
  per-exercise suitability for the caller's equipment/limitations/
  experience. Powers pickers without exposing unreviewed options.
- **Replace in draft editing** — each draft exercise gains a ⇄ action
  opening a chooser of non-`review` alternatives (same movement pattern
  first; `adapt` options show their reason). Saving the draft re-runs
  server-side rule validation, so a swap can't smuggle in anything
  unsuitable.
- **Today's planned session card** on the Workout tab: when an active
  plan schedules today, its warmup, exercises (sets×reps), and
  per-exercise progression notes (`direction · reason`, e.g.
  "reduce · You reported discomfort…") render above the exercise
  library. Each row has a one-tap Start. `missedSessionNote` shows when
  the user missed sessions (recap, not scolding).
- **No-plan state copy** clarified: "Create my plan" + the existing
  browse/search, quick workout, and recent-workout paths remain — the
  four L1 options on one screen.

## Safety notes

- Plan exercises still write sessions through the existing
  per-exercise `start → log sets → finish` flow; nothing auto-logs.
- Suggestions require user action; the API returns advisory text only.
- Progression never exceeds conservative caps and biases downward on
  discomfort, missed sessions, or declining volume.

## Files changed

Backend: `src/routes/personalPlans.js` (catalog route),
`tests/personalPlans.catalog.test.js` (new).

Mobile: `src/api/personalPlans.ts` (CatalogExercise/Suggestion types,
listCatalog), `src/screens/WorkoutPlanScreen.tsx` (replace flow),
`src/screens/LogExerciseScreen.tsx` (planned-session card).

## Tests

- Backend: **578/579** (only the pre-existing `labelInsights.access`
  failure); new catalog suite 4/4.
- Mobile: **58 suites / 315 tests**; typecheck clean; lint 0 errors,
  41 warnings (was 40 — +1 in new code).

## Verification limitations / remaining blockers

- Progression suggestions use session history from completed workouts;
  RPE/discomfort prompts during logging are a later-milestone UX item —
  the API accepts the params already.
- Replace picker offers all non-`review` catalog exercises; a tighter
  per-limitation filtered list could narrow it further.
- Native checks (plan review on device, swap gesture, suggestion
  readability) pending a simulator build.

Paused at the requested M7 review point before M8 (muscle visualization).
