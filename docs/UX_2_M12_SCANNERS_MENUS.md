# UX 2.0 — M12 Scanners, Restaurant Menus, Recipes

Milestone 12 audits the camera-driven food flows and fixes the last
documented trust defect: menu items with no nutrition data were logged
as fabricated zero-macro meals.

## Audit result (kept)

- `LabelScanner` — photo → extracted facts → review screen; uncertain
  fields stay behind review (existing flow, verified in M3 tests).
- `MenuScan` — multi-page OCR → parsed items with three nutrition tiers:
  `user-entered`, `restaurant-reported`, `estimated` (range shown as
  `≈ min–max kcal`), or "Not enough info". Portion selection, section
  filtering, price corrections, and unsaved-work guards all exist.
- `FoodEntry` review remains the gate for all uncertain entries.

## Defect fixed

- **Unknown macros no longer become zeros.** `saveAll` previously
  logged every selected item; an item with neither calories nor an
  estimate was written as `calories: 0` with zero macros — a fabricated
  record indistinguishable from a real 0-kcal entry.
- Now only items with `estimate` or `calories != null` are logged;
  skipped items produce a notice naming them and explaining the fix
  ("Correct the number" to enter calories, or log manually).
- The on-screen total now sums only items that will actually be
  logged — no phantom zero inflating the count.

## Files changed

- `src/screens/MenuScanScreen.tsx` — loggable filter, skip notice,
  corrected total.

## Tests

- Mobile: **59 suites / 318 tests**; typecheck clean; lint 0 errors,
  41 warnings (existing).

## Verification limitations / remaining blockers

- Estimate ranges display mid-values on save (portion-scaled) — the
  `≈` range vs. recorded value distinction is preserved in the
  `source: restaurant estimate:` field.
- A dedicated recipe builder/screen does not exist as its own module;
  recipe-style meals today flow through FoodEntry with multi-item
  names — a first-class recipe feature is a separate product decision.
- Native camera/OCR checks pending a device build.

Paused at the requested M12 review point before M13 (voice MVP).
