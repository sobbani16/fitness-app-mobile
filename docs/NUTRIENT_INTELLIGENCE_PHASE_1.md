# Nutrient Intelligence — Phase 1

October 27, 2026. Database/import foundation only. Applied to a disposable local PostgreSQL clone; production unchanged. No existing ingredient nutrition was backfilled or overwritten.

## Tables and compatibility

Existing `IngredientCatalog.preparation` describes one catalog record; it cannot represent multiple nutrient compositions beneath one Ingredient. Existing catalog variants and Ingredient IDs remain separate and unchanged.

New relationships:

`Ingredient → IngredientNutritionProfile → IngredientNutrient ← Nutrient`

- `Nutrient`: UUID, unique stable code/name, standardized unit/category, timestamps. Seed contains 27 definitions and no quantities.
- `IngredientNutritionProfile`: UUID and existing Ingredient FK, explicit preparation type/method, source, source food ID, dataset/edition, record key, citation, nullable verification time and timestamps.
- `IngredientNutrient`: UUID, profile/nutrient FKs, unique pair, nullable `DECIMAL(18,9)` amount per 100 g. Database checks reject negative/nonfinite/out-of-range values. Profile deletion cascades only its composition; referenced Ingredients and Nutrients are restricted from deletion.

A SHA-256 identity over Ingredient ID, preparation type/method, source, dataset and stable source record key prevents importer duplicates. Food IDs become `food:<id>` keys; records lacking food IDs require an explicit stable key. Different editions/methods/preparations are never automatically merged. Indexes cover ingredient/preparation, source/food ID and nutrient lookups.

Existing app logging/search, catalog/USDA fallback and nutrition snapshots continue using their established fields. There is no consumer cutover in Phase 1. The account schema-coverage registry classifies the three tables as shared data.

Future `HealthConditionNutrientRule` can reference existing `HealthCondition.id` and `Nutrient.id`; the composition relation is ready. No rule table, condition limits, recommendations or medical restrictions are introduced now.

## Commands (backend repository)

Set `DATABASE_URL` explicitly to the intended approved database first.

```sh
npm run db:generate
npm run db:deploy
npm run db:seed-nutrients
npm run nutrients:import -- /absolute/path/records.json
npm run nutrients:import -- /absolute/path/records.json --apply
```

Migration: `20261027000100_nutrient_intelligence`. First import command is a read-only dry run. Review its JSON report before applying. Seeds/imports make no network calls. Existing broad seed commands are not required.

## Offline import contract

The service accepts 1–500 normalized records per atomic batch, sourced from reviewed USDA, IFCT, manual or other offline composition files. Source-specific field/code mapping must be explicit before calling it; this phase does not guess mappings from arbitrary vendor spreadsheets or fetch live APIs.

Example shape (placeholders and unknown quantity, not invented nutrition):

```json
[{
  "ingredientId": "EXISTING_INGREDIENT_ID",
  "source": "USDA",
  "sourceFoodId": "SOURCE_RECORD_ID",
  "sourceDataset": "DATASET_AND_EDITION",
  "sourceCitation": "SOURCE_PUBLICATION_OR_URL",
  "preparationType": "BOILED",
  "preparationMethod": "boiled, drained, without salt",
  "basis": "PER_100_G",
  "verifiedAt": null,
  "nutrients": [{"code": "POTASSIUM", "amountPer100g": null, "unit": "mg"}]
}]
```

Match priority: explicit Ingredient ID, explicit catalog ID, existing USDA FDC ID, then exact normalized name/catalog alias. Multiple candidates or no match produce `REVIEW_REQUIRED`; no new Ingredient is silently created. The report retains input indexes and candidate IDs for manual resolution.

Explicit raw/cooked preparation and edible-weight basis are mandatory. No volume-density, cooking-yield or ingredient-order inference. Mass units g/mg/mcg (including µg/μg/ug) and kJ-to-kcal normalize with decimal arithmetic; values round half-up to nine decimal places. Unsupported dimensions, IU, negative/nonfinite amounts and values outside precision are rejected. Unknowns are NULL; explicit zero remains zero. Missing/null import values never erase an existing known quantity.

Stable codes distinguish vitamin A RAE, vitamin E alpha-tocopherol, vitamin K phylloquinone, total folate and total carbohydrate. Do not map IU, DFE, available carbohydrate or other non-equivalent measures to these codes without a separately reviewed conversion. All codes/units are defined in `src/services/nutrientMaster.js`.

Verification is a trusted importer's explicit attestation, never inferred from provider name. Verified profiles reject unverified/older replacements. Conflicting values with the same verification timestamp require review. Promoting an unverified profile requires explicit verification of all its known values, so previous estimates cannot silently become verified. Newer verified updates can amend values within the same identity. Advisory transaction locks serialize concurrent seed/import operations; duplicate identities within a batch fail atomically.

## Files

Backend: `prisma/schema.prisma`, new migration SQL, `prisma/seed-nutrients.js`, `src/services/nutrientMaster.js`, `src/services/nutrientImport.js`, `scripts/import-nutrients.js`, `scripts/test-nutrient-foundation.js`, `tests/nutrientImport.test.js`, account integration schema registry and package scripts.

Mobile documentation: this document and the Markdown/generated HTML production handoff. No mobile application code changed for Phase 1.

## Verification

- Prisma validation/client generation passed.
- Additive migration applied to `fitness_nutrient_phase1` on loopback port 55439; second deploy had no pending migrations.
- 21 focused unit tests passed; full backend suite: **387 tests / 39 suites passed**.
- Local PostgreSQL tests passed repeated seeds, concurrent/idempotent imports, distinct raw/boiled profiles, decimal conversion, NULL preservation, ambiguous matches, verified-data protection, incomplete verification, unique/FK/check constraints and unchanged preexisting Ingredient records.
- Schema diff shows only preexisting auth FK/default and IngredientCatalog timestamp-default drift; no differences for the new tables. Unrelated drift was not changed.
- No database resets, production changes, live source calls or builds. Existing destructive auth fixture suite was not run.

Remaining choices: source-specific mapping/licensing and composition verification before real imports; production migration/seed requires a separately authorized rollout. No additional input is needed to use this Phase 1 foundation locally.
