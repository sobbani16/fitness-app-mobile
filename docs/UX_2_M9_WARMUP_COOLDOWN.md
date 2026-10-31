# UX 2.0 — M9 Warm-up / Cool-down

Milestone 9 surfaces the plan's warm-up and cool-down where the user
actually needs them: inside the workout itself. Steps are checkable,
optional, and never fabricated.

## What was built

- **Warm-up checklist** — during an active workout on a planned day, the
  plan's `warmup` steps appear above the timer as a tap-to-complete
  checklist. Marked steps show `✓` + "Done" and remain tappable.
- **Cool-down checklist** — appears after "Finish workout" with the plan's
  `cooldown` steps, same interaction.
- **Visibility everywhere a plan is read** — "Warm-up:" / "Cool-down:"
  lines now render on the Today's-planned-session card (Workout tab) and
  on every day card in the plan review (draft and active).

## Safety guardrails

- Steps come only from the confirmed plan — none are invented when a day
  has no warmup/cooldown defined.
- Checklist state lives in component memory only — tapping steps never
  writes to the workout record, and the copy says so.
- Steps are explicitly optional ("match it to how you feel" pattern);
  nothing blocks starting or finishing the workout.

## Files changed

- `src/screens/LogExerciseScreen.tsx` — checklist state/UI, warm-up
  during session, cool-down after finish, session-card lines.
- `src/screens/WorkoutPlanScreen.tsx` — cool-down line on day cards.

## Tests

- Mobile: **59 suites / 318 tests**; typecheck clean; lint 0 errors,
  41 warnings (existing).

## Verification limitations / remaining blockers

- Checklist completion is not persisted — a refresh loses check marks;
  acceptable for v1 since it's a guide, not a record.
- Non-plan workouts get no generic checklist (nothing to show unless the
  day is planned) — a built-in default routine could be a later addition.
- Native checks of the checklist during an actual in-progress session
  pending a device build.

Paused at the requested M9 review point before M10 (workout experience).
