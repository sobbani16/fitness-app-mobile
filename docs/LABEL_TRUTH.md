# Label Truth — evidence-linked scanner insights

Implemented locally October 27, 2026. Rule set: `label-truth/1.0.0`. No production data changes, deployment, native build or TestFlight submission for this work.

## User flow

Capture nutrition, ingredients, allergen wording and front-of-pack claims in separate panels. Each panel retains its own editable OCR text/photo while moving between panels. Only the nutrition panel is sent to the existing AI/regex extraction endpoint; other panels are passed verbatim to review. Photos stay on device. Correct the nutrition column, quantities, ingredient text and statements before confirming review. Missing nutrients stay unknown.

Choose the package market (India, U.S. or unknown), solid/liquid form and column explicitly. Optionally use existing saved goals, active conditions and allergies. Tap **Explain this reviewed label**. Each finding has an expandable **Why was this flagged?** action containing the evidence, reasoning, personal relevance where supported, practical recommendation, source URL and versioned rule ID. Editing any input clears the prior findings and invalidates in-flight responses.

**Compare with another label** opens a second scan. Comparison requires two reviewed labels with explicit quantities, matching mass/volume units and the same physical form. Only nutrients present in both are normalized to 100 g or 100 ml. No density conversion or overall winner is inferred. Use similar products for a meaningful choice. **View these findings with Leo** shows the same deterministic cards; it does not send them or conditions to the AI chat service.

## Rules and limits

- Refined wheat: maida/refined wheat/all-purpose flour; whole-grain wording is a separate finding. Plain atta/wheat flour is not automatically whole grain or refined. Ingredient percentages are never inferred.
- Sugar ingredients: named sugars/syrups, gur/gud/jaggery and other supported aliases. Presence alone does not supply grams of added sugars.
- A bounded set of additive names/INS/E-number aliases receives neutral functional education. Unrecognized additives are not classified as harmful or safe.
- Exact allergen statements are retained, including “may contain.” Recognized ingredient allergen names prompt review; this is not exhaustive allergy clearance.
- Sugar-free claims: FSSAI general sugar threshold is checked on explicit solid-g/liquid-ml quantities; FDA check uses the labeled-serving column. A discrepancy is **possible**, never a finding of deceptive advertising. FDA reference amounts, category exceptions, rounding, disclaimers and other eligibility conditions are not fully assessed. A value below the checked threshold never certifies compliance.
- Other claims (including high protein, natural, no added sugar) remain **insufficient evidence**, with the original wording. Additional claim text is not silently treated as verified when a sugar-free phrase is recognized.
- Diabetes guidance considers total carbs, portion multiplier, added sugars and fiber, preserves missing values and does not prescribe targets/doses or subtract fiber automatically. Thyroid alone produces no sodium restriction. Existing goals receive portion/diary context, not a claim that one food meets the daily goal.
- `VERIFIED` means the user confirmed label presence/values, not independent laboratory verification. `ESTIMATED` means unreviewed OCR/typed draft. `INSUFFICIENT_EVIDENCE` means required facts or a complete claim assessment are missing. Every card explains the confidence.
- No new ingredient database, duplicate catalog imports or replacement nutrition values. Existing catalog/USDA search and shared logging calculations are reused unchanged. Generic catalog/USDA nutrition is deliberately not substituted for missing product-label evidence. No automatic branded alternatives are offered without a comparable verified product pair.

## Storage and API

Existing authenticated `/label-scanner` router:

- `POST /insights`: validates label facts; reads only the authenticated user's selected profile fields after explicit personalization opt-in; returns deterministic findings, original facts, version and limitations. No AI calls.
- `POST /compare`: validates two reviewed facts objects and returns sourced, equal-quantity comparisons.
- `POST /save`: backward compatible. Optional `labelFacts` must match logged ingredients/nutrients/portion. Findings are recomputed on the server, never accepted from client-generated insight text. Snapshot is stored in existing `FoodLog.nutritionSnapshot.labelInsights` in the same transaction as the scanned label and meal. No schema migration is needed.

Old meals are untouched. Stable IDs, ownership conflicts, deletion tombstones and transactional rollback behavior remain in place. The snapshot holds facts, evidence and the source URLs/version applicable at save time. Local scan drafts/photos and comparison state are not process-durable; verify the diary after an uncertain interrupted save. Scan history does not yet display a historical insight replay UI; snapshots remain in the food-log record/export path.

## Source registry

References were checked October 27, 2026; preserve/bump the rule version when changing an interpretation. FSSAI's cited compendium is the December 14, 2022 edition, an aid to interpreting the regulations, not a comprehensive current legal certification.

- [VA: whole grains and fiber](https://www.nutrition.va.gov/NUTRITION/docs/UpdatedPatientEd/WholeGrainsAndFiberJun2024.pdf)
- [CDC: spotting hidden sugars](https://www.cdc.gov/diabetes/healthy-eating/spotting-hidden-sugars-in-everyday-foods.html)
- [FDA: food ingredients](https://www.fda.gov/food/food-additives-and-gras-ingredients-information-consumers/types-food-ingredients)
- [FDA: food allergies](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies)
- [ADA: carbohydrate education](https://diabetes.org/food-nutrition/understanding-carbs/get-to-know-carbs)
- [FDA: sugar-free claims](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-and-fda-dear-manufacturer-letter-regarding-sugar-free-claims)
- [FSSAI: Advertising and Claims compendium](https://fssai.gov.in/upload/uploadfiles/files/Compendium_Advertising_Claims_Regulations_14_12_2022.pdf)
- [FDA: using the Nutrition Facts label](https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label)

## Files changed for this increment

Backend:
- `src/services/labelInsights.js` — pure rule engine, validation, comparison and opt-in profile context.
- `src/routes/labelScanner.js` — insight/comparison endpoints and save evidence validation.
- `src/services/labelScannerService.js` — evidence snapshots and safer total-vs-added/saturated/net extraction.
- `tests/labelInsights.test.js`, `tests/labelInsights.access.test.js`, `tests/labelScanner.test.js`, `tests/labelScanner.route.test.js`.
- `scripts/test-label-insights.js` — local-only PostgreSQL/HTTP persistence and retry checks.

Mobile:
- `src/api/labelScanner.ts` — typed facts, findings and APIs.
- `src/screens/LabelScannerScreen.tsx` — separate OCR/photo panels.
- `src/screens/PortionAdjustScreen.tsx` — editable facts, review, insights and comparison.
- `src/components/LabelInsights.tsx` — reusable evidence/source cards.
- `src/screens/ChatScreen.tsx`, `src/navigation/RootNavigator.tsx` — Leo guide integration.
- `src/components/__tests__/LabelInsights.test.js` and scanner/portion/Leo screen tests.
- `docs/LABEL_TRUTH.md`, `docs/PRODUCTION_HANDOFF.md`, generated `docs/PRODUCTION_HANDOFF.html`.

## Verification and remaining acceptance

Automated checks cover aliases and negation, jurisdiction thresholds, unknown quantities, confidence, opt-in personalization, thyroid behavior, comparison prerequisites, evidence/source traceability, authentication, edited-input response invalidation, multi-panel separation and evidence expansion. Full mobile suite: **203 tests / 47 suites passed**, TypeScript passed. Full backend suite: **366 tests / 38 suites passed**.

A disposable local PostgreSQL database (`fitness_ux_m2_label_truth`, loopback port 55439) passed HTTP analysis, snapshot round-trip, mismatch rejection, stable retries, ownership and guarded comparison; catalog row count remained unchanged. Existing local label integrity checks also passed concurrent deduplication, rollback, unknown nutrients and deletion retry. An audit-log test failed once in the first full backend run; it passed in isolation and the subsequent full rerun without a code change. That transient failure was outside these scanner files.

Still required before release: signed iOS/Android capture and screen-reader checks with real packaging, broader claim rules if desired, and deployment/build approval. The current bounded rule scope is shown in the UI. No additional credentials or production database access are needed for local implementation.
