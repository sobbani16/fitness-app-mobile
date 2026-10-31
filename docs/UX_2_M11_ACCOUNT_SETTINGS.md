# UX 2.0 — M11 Account & Settings

Milestone 11 audits and completes the Summary (Account & settings)
surface. The screen was already well-structured; this milestone closes
the remaining navigation gap rather than reworking what works.

## Audit result (kept as-is)

- Profile card: name, height/weight in preferred units, goal, activity
  level; metric ↔ imperial `Segmented` updates display units only.
- Appearance picker and Dashboard (optional-card) preferences.
- Reminders: smart reminders, history inbox, connected health.
- Coaching: trainer discovery + signup.
- Privacy & support: Leo guide, feedback, and `AccountPrivacy` —
  data export (password-gated), permanent deletion with an explicit
  no-undo alert, and legacy-account restore.
- Sign-out with clear "does not delete your account" copy; destructive
  deletion lives separately under Privacy & support.

## Gap closed

- **Workout & plan section** — the confirmed plan was only reachable
  from the Workout tab. Summary now links to `WorkoutPlan` and states
  that plan days drive reminders and Today, plus where workout weight
  units (lb/kg) live. Settings users can now find every personal
  program from one place.

## Files changed

- `src/screens/SummaryScreen.tsx` — new "Workout & plan" card.

## Tests

- Mobile: **59 suites / 318 tests**; typecheck clean; lint 0 errors,
  41 warnings (existing).

## Verification limitations / remaining blockers

- Settings structure is intentionally list-based; a future pass could
  group Reminders/Coaching/Privacy under collapsible sections if the
  list grows.
- Native navigation checks pending a device build.

Paused at the requested M11 review point before M12
(scanners/restaurant/recipes).
