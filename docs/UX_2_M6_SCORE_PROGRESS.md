# UX 2.0 — M6 Health Score and Progress

Milestone 6 fixes the two documented correctness defects and upgrades the
score screen into a visual, explainable dashboard. The rule: missing data is
unknown — never a fabricated measurement.

## Screens changed

- `HealthScoreDetail` (score dashboard).
- `History` (Progress calendar cells).

## Correctness defects fixed

- **Health Score, missing condition = perfect 100 (30% weight):** the
  condition component now returns `score: null, available: false` when no
  active conditions are recorded.
- **Fabricated defaults removed everywhere:** macro adherence with no food
  records → unavailable (was 0-vs-target scoring of absent logs); food
  quality with no logs → unavailable (was a fixed 50); activity with no
  records → unavailable (was a penalizing 40 plus a "walk to boost your
  score" nudge, removed); recovery now scores only recorded parts —
  missing sleep or water is unknown, not a default 70.
- **Partially logged days no longer red:** a very low logged calorie total
  is ambiguous — usually incomplete logging — so `dayAssessment` now
  returns yellow with an explicit "partial logging is more likely" reason
  and a `complete-day confirmation` missing marker. Still never green.
- **Unscoreable days are not persisted:** when no component has data, the
  overall score is `null`, status `insufficient_data`, and nothing is
  written — no fake-zero days in trends.

## New contract behavior

- The overall score is the weighted mean of **available** components only
  (weights renormalize), reported with
  `coverage: { available, total }`.
- Each component carries `available` so clients distinguish *unavailable*,
  *unknown*, and *measured* values.
- `HealthScore` component columns are now nullable — `NULL` means no
  records, instead of a misleading 0. Migration
  `20261206000000_health_score_nullable_components` (file only — not
  applied to any environment).

## Screen changes

- **Data coverage card:** "N of 5 score parts have recorded data" replaces
  the static "completeness unknown" text.
- **Components:** each shows score /100 with its progress bar, or
  "No records — excluded from today's score".
- **Strengths / Worth reviewing:** structured rule-generated contributors
  split by impact direction. Raw provider-written `insights` strings are
  still not rendered (existing safety test).
- **Progress calendar:** every day cell now shows a status glyph
  (✓ / ! / ✕ / ·) in addition to color, and the accessibility label names
  the state ("on track", "review", "outside plan", "insufficient data").

## Files changed

Mobile: `src/api/healthScore.ts`, `src/screens/HealthScoreDetailScreen.tsx`,
`src/services/dayAssessment.ts`, `src/components/HistoryCalendar.tsx`,
tests for the screen and day assessment.

Backend: `src/services/healthScoreEngine.js`, `prisma/schema.prisma`,
`prisma/migrations/20261206000000_health_score_nullable_components/`,
`tests/healthScore.test.js`.

## Tests

- Mobile: **58 suites / 315 tests passed**; typecheck clean; lint 0 errors.
- Backend: **574/575** — only the pre-existing `labelInsights.access`
  failure from earlier uncommitted work.
- `prisma validate` passes.

## Verification limitations / remaining blockers

- The nullable-component migration is authored but **not applied** anywhere;
  applying it to dev/prod awaits approval (`db:migrate` / `db:deploy`).
- Historical rows keep their stored 0s — pre-existing records can't be
  retroactively distinguished as unavailable vs measured.
- Visual score-ring polish and real device checks remain pending.

Paused at the requested M6 review point before M7 (personalized workouts).
