# UX 2.0 — M3 Fast Logging

Milestone 3 shortens the four most frequent logging tasks through the existing
services and storage. All fast paths stay inside the Quick Add sheet, keep
local-first sync semantics, and re-open the review flow whenever portions or
nutrition are uncertain.

## Screens changed

- `QuickAdd` bottom sheet (available from every primary tab header).

## Old flow → new flow

| Task | Old flow | New flow | Taps |
| --- | --- | --- | --- |
| Log 250 ml water | Add → Log water → Dashboard sheet → Add 250 ml (4 taps, 2 screens) | Add → +250 ml water (2 taps, one sheet) | 4 → 2 |
| Undo water | Not available | Undo action in the same sheet | — |
| Repeat a trusted saved food | Food → Diary/Recent → open entry → review → save (5+ taps) | Add → tap the food row (2 taps) + Undo | 5+ → 2 |
| Repeat an uncertain food | same review path | Row opens the existing FoodEntry review (`route.params.meal`) | unchanged, still reviewed |
| Update weight | Add → Update weight → full profile form → save (4+ taps, full form) | Add → type value → Save weight (3 taps) | 4+ → 3 |
| Food search | Add → Search food → catalog search → select → review portion → save | unchanged (already 3–4 taps after query) | unchanged |

## Behavior

- **Water:** one tap saves +250 ml locally, syncs the daily total to the
  backend, and offers Undo (−250 ml) in the sheet. Water mutations are now
  serialized at the storage layer, so the Dashboard card and Quick Add cannot
  race the read-modify-write. Sync failures keep the local value and surface
  the existing retry path on Today.
- **Repeat food:** favorites and recent foods (top 3, favorites first,
  deduplicated by name) render as compact rows. A meal only skips review when
  `isTrustedRepeatMeal` passes: weighed portion, finite nutrition, verified
  catalog/recipe source, no user edits or estimated/conflicting
  verification. Everything else navigates to the existing FoodEntry review.
  Trusted repeats get a new id/timestamp, never carry the old photo, and
  offer Undo (removes the created entry).
- **Weight:** preferred units come from the profile (`kg`/`lb`); input is
  validated against the backend range (20–400 kg). A changed value goes
  through the existing serialized `profile.update` (which records a
  `WeightEntry` server-side). An unchanged value now calls the new
  `POST /me/profile/weight`, which records an explicit measurement and keeps
  `profileData`/macro goals consistent — previously, re-saving the same
  weight silently recorded nothing.
- **Duplicate prevention:** a shared busy lock covers every fast action;
  double taps submit once. Navigation actions still wait for sheet dismissal.

## Backend contract

- `POST /me/profile/weight` — `{ weightKg }` → creates `WeightEntry`,
  updates `currentWeightKg` + `profileData.weightKg` (preserving other
  fields), and recalculates the default macro goal when the stored profile
  is complete. Same validation bounds as `PUT /me/profile`.
- `PUT /me/profile` — macro-goal recalculation extracted to a shared
  helper; behavior unchanged.

## Files changed

Mobile:
- `src/components/QuickAdd.tsx` — inline water, repeat, weight sections.
- `src/services/quickLog.ts` — trust rules, repeat builder, weight parsing, choice ordering (new).
- `src/api/weight.ts` — `logWeight` client (new).
- `src/storage/dailyStats.ts` — serialized water/supplement mutations.
- `src/hooks/useDailyStats.ts` — `addWater` returns the updated stats.
- `src/components/__tests__/QuickAdd.test.js`, `src/services/__tests__/quickLog.test.ts` — regression coverage (new/updated).

Backend:
- `src/routes/profile.js` — `POST /weight`, shared `recalcDefaultGoal`.
- `tests/profile.weight.test.js` — new.

## Migrations required

None — uses the existing `WeightEntry` and `WaterLog` tables.

## Tests

- Mobile: **55 suites / 294 tests passed**; typecheck clean; lint 0 errors,
  40 pre-existing warnings.
- Backend: **570/571 tests passed**. One failure is pre-existing inside the
  uncommitted label-insights work (`tests/labelInsights.access.test.js`,
  `DIABETES_PORTION_001`), unrelated to this milestone; it fails on an
  isolated run and was left untouched.

## Verification limitations / remaining blockers

- Native device checks (sheet layout, keyboard, screen reader, Android Back)
  remain pending — no simulator build or device fixture was available.
- Water sync-failure visibility: Quick Add confirms the local save; the
  detailed "sync pending / retry" notice still lives on Today.
- Quick weight entry requires connectivity: on failure it reports an error
  rather than queueing (same limitation as profile edits; a sync queue is a
  candidate for a later milestone).
- Repeat rows reuse the meal's original meal-type slot; slot-aware repeats
  can be revisited when the Food home is redesigned (M-later).
- Water quick-log amount is fixed at 250 ml pending a user-configured preset.

Paused at the requested M3 review point before M4 (Today).
