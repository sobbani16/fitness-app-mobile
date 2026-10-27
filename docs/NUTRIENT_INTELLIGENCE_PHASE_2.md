# Nutrient Intelligence Phase 2

Validated October 27, 2026. Implemented and populated locally; hosted database was read only. No build or deployment submitted.

## Coverage

All 3,022 existing hosted Ingredient records were copied with original IDs into a fresh local validation database. Every record was processed. 142 USDA source-confirmed profiles cover 142 ingredients (4.70%): 19 explicitly raw and 45 cooked (including baked/cooked descriptions classified OTHER). Other preparations retain the complete source description.

13 matches require review and 2,867 remain pending, leaving 2,880 ingredients without verified profiles. No failed imports or source parsing errors. Pending reasons: 848 product-specific sources required; 1,785 no reliable match; 211 IFCT licensing/matching pending; 23 unavailable source IDs. Review reasons: five source-ID/description conflicts and eight multiple-source matches.

Protein, carbohydrates, fat, sodium, potassium, phosphorus, calcium, iron and zinc are available for all 142 matched ingredients. Added sugar is unknown for every imported profile; iodine is available for one. These gaps are not zeros. [Full coverage report](NUTRIENT_PHASE_2_COVERAGE.json) includes ingredient outcomes, missing nutrients, percentages, preparation/source distribution and review candidates.

## Files and compatibility

Backend src/services/nutrients/sources.js, matching.js and population.js implement versioned adapters, aliases, preparation matching, batching and coverage. src/services/nutrientImport.js adds strict verified-value protection inside the Phase 1 transaction lock. No new migration beyond Phase 1.

Commands: scripts/fetch-nutrient-sources.js, cache-nutrient-dataset.js, populate-nutrients.js and package.json. Raw records/attribution: data/nutrient-sources/. Tests: tests/nutrientPopulation.test.js, tests/nutrientFetch.test.js and scripts/test-nutrient-foundation.js.

Existing Ingredient nutrition, IDs, logging and application reads remain unchanged. This phase populates separate profiles; consumer cutover and health-condition recommendations are outside scope.

## Run and resume

From the backend, set DATABASE_URL securely to the intended local database:

```sh
npm run db:deploy
npm run db:seed-nutrients
npm run nutrients:populate -- --report nutrient-dry-run.json
npm run nutrients:populate -- --apply --report nutrient-population-report.json
```

Repeat the apply command to resume. Persisted values determine completed work; the atomic JSON report is a checkpoint. Batch size defaults to 25 (--batch-size). Network calls never run during startup, migrations or seeds. Cached files support offline population. Optional refresh: `npm run nutrients:fetch -- data/nutrient-sources/fdc-ids.json` with USDA_API_KEY. Fetching stops on authentication/quota failures and retains successful files.

Hosted writes require user approval before --approved-hosted is used. The flag itself is not approval. Phase 1 migrations/seed must exist first.

## Resolve pending data

Pass --matches reviewed-matches.json containing an array of ingredientId, source, sourceFoodId, optional sourceDataset, approved true, ISO reviewedAt and reason explaining identity/preparation. Multiple distinct reviewed source foods can map to one ingredient; profiles stay separate. Conflicting verified values require investigation.

Pass --reviewed-dir for licensed IFCT/other government exports. Each file contains record and review. Record follows the Phase 1 contract: name, source, sourceDataset, sourceFoodId (or sourceRecordKey), sourceCitation, preparationType, preparationMethod, basis PER_100_G and nutrients with code/unit/amountPer100g. Review requires approved true, reviewedAt and licenseEvidence. Preserve original quantity mappings in the export. Available carbohydrate is not total carbohydrate; IU and folate DFE are not silently converted. Missing amounts remain null.

## Validation and remaining inputs

409 tests passed across 41 backend suites. PostgreSQL checks passed: seed/import idempotency, concurrent retries, raw/cooked separation, conversion, nulls, ambiguous matches, verified protection, uniqueness, foreign keys and numeric constraints. Full-catalog rerun imported zero and preserved every profile ID/value/timestamp. All 3,022 Ingredient records matched the hosted snapshot before and after.

Remaining inputs: reviewed mappings for 13 ambiguous/conflicting records, authoritative product-specific sources, legally reusable IFCT data and approval before hosted migration/import. Source confirmation does not imply laboratory measurement of every value. References: https://fdc.nal.usda.gov/api-guide/ and https://fdc.nal.usda.gov/download-datasets/.
