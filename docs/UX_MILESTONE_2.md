# UX milestone 2 — food logging, labels and portions

Implemented locally October 16, 2026, following owner approval of milestone 2. Milestone 3 is not started. No production user data, deployment, GitHub push, TestFlight build or submission was performed.

## Before → after

| Before | After |
| --- | --- |
| One long form mixes food search, recipes, photo analysis and manual entry | Food home provides separate entry paths; recipes have a dedicated discovery path |
| Today’s rows support only long-press removal | Today’s diary has explicit confirmed removal; recent foods and favorites offer review/repeat |
| Re-entering the same meal every time | Recent foods from the last 30 cached days; reusable meal/recipe nutrition favorites |
| Missing manual or OCR values silently become zero | Required primary nutrients must be entered; unknown fiber/sugar remain blank/null |
| Missing label serving weight defaults to 100 g | Unknown mass stays unknown until reviewed |
| Camera denial blocks all label entry | Manual nutrition and typed label text remain available without camera permission |
| Extraction failure interrupts the flow | Corrected text remains available for retry or manual review |
| Portion screen treats everything as grams | Explicit grams, ml, servings or packages; volume requires known/labeled mass, never assumed density |
| Retrying saves can create a second server meal | Stable scan identity, atomic label/meal transaction, concurrent retry deduplication and ownership checks |
| Local save failure after successful label save resubmits upstream | Keeps the upstream result and retries the same local meal ID |
| Per-100-g baselines can overwrite corrections | Edited nutrition updates the portion basis; manual values describe the whole portion |

## Navigation and retained features

Food tab → Scan label / Search food / Manual entry / Photo or description estimate (only when existing AI flag permits). Separate Recent foods / Favorite foods / Today’s diary controls. Discover recipes retains both recipe search and recipes-by-ingredients. A selected recipe is reviewed and logged like other foods; its saved nutrition can then become a favorite. Favorites do not store full recipe instructions.

`LogMeal`, `LabelScanner` and `PortionAdjust` route names remain. Added `FoodEntry` with search/manual/photo/recipes/repeat modes. Global quick add now opens Search food directly. Existing AI review/uncertainty gates and Bluetooth scale controls remain. Beta-safe mode still hides AI estimates; real upstream AI acceptance is not renewed.

## Nutrition and reliability decisions

- A label review explicitly confirms one column, its basis and the selected quantity. Required fields are calories/protein/carbs/fat. Optional fiber and sugar stay unknown when blank; zero is preserved when explicitly supplied.
- Grams scale against the labeled gram basis. Servings multiply per-serving nutrition. Packages multiply explicitly entered servings-per-package. Use per-serving nutrition and serving mass for package mode.
- Milliliters scale against a matching ml basis, but logging also requires known mass for that basis because the existing diary stores grams. Cups, fluid ounces and regional volume definitions are not automatically converted. The app does not infer food density.
- Example: 200 kcal per 100 g and a 150 g portion previews and saves 300 kcal. Nutrients round to 0.1 g. Floating-point halfway rounding is consistent between preview and backend; 3.3 g × 1.5 rounds to 5.0 g.
- OCR/AI extraction is a suggestion, never a calibrated confidence claim. Users can correct nutrition, ingredients and serving information. Multi-column/multilingual labels still require manual review; accurate automatic column selection is not claimed.
- Required fields, finite values, bounds and optional unknowns are validated on the server. Internal database error details are not returned to the UI.
- Label saves use a client-generated stable ID and a transaction. An existing ID cannot expose another account’s record. Retrying a deleted meal returns 410 instead of recreating it. Validation failures reopen editing; network failures retain the reviewed submission for retry.
- Ordinary food logging continues to use the existing durable meal outbox. Repeated taps and same-screen retries reuse an identity. Label-specific retry state is in memory, not a durable background outbox. If the process dies after an uncertain save, check the recovered diary before starting another scan.
- Unsaved food/portion navigation prompts before discarding. Saving controls are guarded during requests. No new analytics transmission, screenshot capture or health-data logging was introduced.

## Storage and backend migration

Favorites use `accountKey('fitness.favoriteFoods.v1')`, serial writes and existing account storage. They are device-only, survive ordinary app restarts, omit photo files, and are covered by generic per-account export/deletion. They do not synchronize across devices or survive uninstall unless separately restored. Recent foods use cached history; opening History can hydrate older days through the existing N04 flow.

Migration: `20261016160000_unknown_label_nutrients`. `FoodLog.fiberG` and optional label fiber/sugar/sodium/adjusted fields become nullable, with zero defaults removed. Historical zeros are not guessed or rewritten. Meal upload/hydration preserves null fiber across devices. Other primary nutrition columns remain required.

**Release order:** apply the migration and deploy the compatible backend/client generation before distributing the updated app. Neither happened remotely in this milestone. Old clients may still submit explicit zero for omitted values and lack stable scan IDs; they do not gain these guarantees retroactively. Do not roll back to an old Prisma client that assumes non-null values after unknowns have been written; retain compatible reads during rollback.

## Modified files

Mobile:

- `src/screens/LogMealScreen.tsx`: food entry home, recent/favorites/today diary.
- `src/screens/FoodEntryScreen.tsx`: existing integrations separated by entry mode, reusable review, validation, guarded saves and discard protection.
- `src/screens/LabelScannerScreen.tsx`, `PortionAdjustScreen.tsx`: contextual camera, editable OCR, correction/review, explicit units and final preview.
- `src/components/IngredientSearch.tsx`: themed search/loading/empty/error states and stale-response protection.
- `src/components/QuickAdd.tsx`, `src/navigation/RootNavigator.tsx`: direct search and retained routes.
- `src/storage/favoriteFoods.ts`, `src/services/labelPortion.ts`, `foodCalories.ts`, `mealSync.ts`, `src/api/labelScanner.ts`: account-scoped favorites, scaling, fiber and persistence contracts.
- Tests in screen/component/storage/service test folders cover existing AI behavior plus new food/label paths.
- This report and regenerated `PRODUCTION_HANDOFF.md` / `.html`.

Backend:

- `prisma/schema.prisma` and the nullable-nutrient migration.
- `src/routes/foodLogs.js`, `src/routes/labelScanner.js`, `src/services/labelScannerService.js`.
- `tests/labelScanner.test.js`, `tests/labelScanner.route.test.js`, `scripts/test-label-integrity.js` and `docs/UX_MILESTONE_2.md`.

## Acceptance still required

- Signed iOS/Android camera/OCR, Bluetooth, denied permissions, low-light/rotated labels, large fonts, screen-reader focus, keyboard and navigation gestures.
- Physical offline/restart and two-device checks against the newly deployed backend.
- Visual screenshots were not captured; local JS exports and component tests do not establish native visual acceptance. Recipe-discovery/scale widgets retain some legacy styling; full-app theme consistency remains later-milestone work.
- Favorites are local, label retry drafts are not process-durable, and catalog attribution/review still depends on N05–N07/N13. AI provider success remains independently blocked pending its existing acceptance requirements.

## Verification

Final command results are recorded below. All database writes used a new disposable localhost database, guarded by host/database name. Production was not contacted by these tests.

- **148 mobile tests passed in 29 suites.** Includes retained AI photo/text tests plus food home, favorites/account isolation, review/repeat, unknown nutrients, portion units/rounding, camera denial, extraction recovery, concurrent taps and stable retry identities.
- **256 backend tests passed in 28 suites.** Includes required/optional label validation, extraction, rounding, adjustment and error response coverage.
- **Five real PostgreSQL integrity checks passed** after all 20 migrations applied to the disposable local database. Eight simultaneous save calls produced one meal. A failed label insert rolled back its meal. Ownership conflicts, null persistence and deleted-meal retries behaved as intended.
- TypeScript passed. ESLint: zero errors, 32 existing warnings. Release configuration check passed.
- Both iOS and Android Hermes exports passed in beta-safe mode; local artifacts are `/private/tmp/humai-ux-m2-export`. No native/signed build or real-device test is implied.
- Whitespace checks passed in both repositories. Production data and live provider integrations were not exercised.

Milestone 2 implementation is ready for review with the deployment and acceptance limits above. Obtain owner approval before milestone 3 (workout logging).
