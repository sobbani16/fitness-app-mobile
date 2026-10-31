# UX 2.0 — M10 Workout Experience

Milestone 10 closes the feedback loop that makes progression personal:
post-session effort/discomfort is captured per exercise and feeds the
next suggestions, and technique help is one tap away during a set.

## What was built

- **Post-workout feedback card** (finished session): "How did
  {exercise} feel?" with RIR chips (0/1/2/3+ reps left in reserve) and a
  No discomfort / Some discomfort toggle. Optional, stored on-device
  only (account-scoped `fitness.workoutFeedback.v1`), and the copy says
  exactly where it goes: "improves your next plan suggestions."
- **Per-exercise suggestion input** — `GET /personal-plans/suggestions`
  now accepts a `feedback` JSON map (`exerciseId → {rir, discomfort}`).
  Per-exercise values take precedence over the legacy global `rir`/
  `discomfort` params, so a hard squat day doesn't mislabel the pull-up
  suggestion. Malformed JSON degrades safely to `{}`.
- **In-session technique help** — "Technique videos" action inside the
  active-workout card opens the existing curated video search for that
  exercise (same "proper form tutorial" query used in the picker).

## Safety guardrails

- Feedback never auto-applies — it only refines the advisory text
  produced by `workoutProgression` (discomfort → reduce, low RIR → no
  increase), which still requires user action.
- Feedback is device-local and account-scoped; `ownAccount()` guards
  account switches; save failures surface the existing local error
  banner, not a silent drop.
- RIR/discomfort are self-reported — suggestions phrase them as
  "You reported…", never as measurements.

## Files changed

Backend: `src/routes/personalPlans.js` (`feedback` query param,
per-exercise precedence).

Mobile: `src/api/personalPlans.ts` (`feedback` param),
`src/screens/LogExerciseScreen.tsx` (feedback store + card,
feedback-aware suggestions, technique-videos action).

## Tests

- Mobile: **59 suites / 318 tests**; typecheck clean; lint 0 errors,
  41 warnings (existing).
- Backend: focused plan suites pass (11/11).

## Verification limitations / remaining blockers

- Suggestions pick up feedback on next Workout-tab focus; there is no
  push/instant refresh of an already-rendered card.
- Feedback capture is per finished exercise only — a multi-exercise
  session prompts once per exercise card as each finishes.
- Native checks (RIR chip hit targets, feedback persistence across
  app restart) pending a device build.

Paused at the requested M10 review point before M11 (account/settings).
