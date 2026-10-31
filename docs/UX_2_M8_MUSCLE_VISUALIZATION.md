# UX 2.0 — M8 Muscle Visualization

Milestone 8 makes muscle involvement visible instead of requiring the user
to know exercise names. All data comes from the reviewed exercise catalog —
no new assets, no licensing risk, no medical claims.

## What was built

- **`MuscleMap` component** (`src/components/MuscleMap.tsx`) — a two-column
  front/back region schematic (chest, shoulders, biceps, core, quads,
  forearms; traps, back, triceps, glutes, hamstrings). Involved regions are
  filled with the theme accent + `●`; uninvolved stay neutral with `○`, so
  the state is never color-only. Every region exposes
  `"{Region}: involved|not involved"` to screen readers; a caption always
  lists the muscles in words.
- **Selected exercise** (Workout tab): expanding any exercise now shows the
  muscle map before Start, sourced from `GET /personal-plans/catalog`.
- **Plan days** (Workout plan): each day card gets a "Muscles: …" summary
  aggregating its exercises' catalog muscles — visible in draft review and
  on the active plan.

## Copy guardrails

- "Involves: X, Y — a guide to which areas this exercise works — **not a
  measure of effort**." The map never implies intensity, safety, or
  effectiveness.
- Muscle names come from `MUSCLE_LABELS` (exported for reuse); unknown
  catalog keys degrade to the raw id rather than hiding them.

## Files changed

- New: `src/components/MuscleMap.tsx`,
  `src/components/__tests__/MuscleMap.test.js`.
- `src/screens/LogExerciseScreen.tsx` — catalog fetch + map on selection.
- `src/screens/WorkoutPlanScreen.tsx` — catalog prefetch + per-day summary.
- `src/screens/__tests__/NavigationReliability.test.js` — mock updated for
  `listCatalog`/`getSuggestions` (test-only fix).

## Tests

- Mobile: **59 suites / 318 tests**; typecheck clean; lint 0 errors,
  41 warnings (existing style warnings).
- New component suite: involved/not-involved labels, both sides render,
  stable label table.

## Verification limitations / remaining blockers

- Region boxes are a deliberate simplification, not an anatomical atlas;
  precise muscle-part granularity (e.g., upper/lower chest) is out of
  scope for v1.
- Native visual check of the map layout on small screens pending a build.
- Primary-vs-secondary emphasis is not modeled — all involved muscles show
  equally.

Paused at the requested M8 review point before M9 (warm-up/cool-down).
