# UX 2.0 — M4 Today

Milestone 4 restructures Today around the four questions it exists to answer:
what did I log, how am I progressing, what is planned, and what needs
attention — while removing misplaced settings and over-claimed energy math.

## Screens changed

- `Dashboard` (Today tab).

## Old flow → new flow

| Need | Old | New |
| --- | --- | --- |
| Planned workout | buried in reminder settings / LogExercise | top card on scheduled days + one-tap `Start workout` |
| Log 250 ml water | Water card → sheet → Add 250 ml (3 taps) | `+250 ml water` directly on the card (1 tap) |
| Daily guidance | prose "A note for today" + Leo link | structured insight: finding → evidence → reason → action |
| Energy explanation | always-visible card, "est. balance" vs full-day estimate | inside `More about your day`, explicit `How calculated?` expander |
| Appearance | button at bottom of Today | removed — already lives under Summary → Appearance |

## What changed

- **Hierarchy:** greeting/date → meal-sync notice → planned-workout card
  (when `progressPrefs.workoutDays` includes today) → food summary with the
  four macro progress bars → water + movement cards → recent meals →
  insight card → expandable details (energy, provisional health score,
  weight goal, weekly plan, supplements, weather).
- **Insight card** (`src/util/todayInsight.ts`): deterministic rules only —
  empty diary, water behind pace after midday, low logged protein late in
  the day, meals missing nutrition, otherwise a neutral summary. Every
  message names its evidence and states it reflects logged data, never
  inferred intake or health.
- **Water card** now shows the target inline and logs a glass in one tap;
  the sheet remains for −250 ml and sync-retry.
- **Energy card** moved into the expandable details and rewritten: "Logged
  so far", food target range, BMR/TDEE estimates, wearable active energy as
  context only. The `est. balance` figure is gone — logged partial-day
  intake is never compared to a full-day expenditure estimate as a verified
  deficit. `How calculated?` explains Mifflin–St Jeor, the activity
  multiplier, and the no-double-counting rule.
- **Copy trimmed:** two redundant captions removed from the food card; the
  Leo-guide action and Appearance controls left Today.

## Files changed

- `src/screens/DashboardScreen.tsx` — restructure, new cards, Appearance removed.
- `src/util/todayInsight.ts` — new deterministic insight generator.
- `src/util/__tests__/todayInsight.test.ts` — new.
- `src/screens/__tests__/DashboardScreen.test.js` — coverage for the
  workout card, inline water, and the energy explainer.

## Migrations required

None.

## Tests

- Mobile: **56 suites / 302 tests passed**; typecheck clean; lint 0 errors,
  40 pre-existing warnings.

## Verification limitations / remaining blockers

- Native visual checks (card density, sheet layout, screen reader, dynamic
  type) still pending a simulator/device build.
- The weather indicator remains behind the details expander; automatic
  authorized fetch and a top-level summary are M5 scope.
- The planned-workout card reflects the locally stored plan days; showing
  the confirmed plan's actual session content is M7 scope.
- The water quick amount is still the fixed 250 ml preset.

Paused at the requested M4 review point before M5 (weather).
