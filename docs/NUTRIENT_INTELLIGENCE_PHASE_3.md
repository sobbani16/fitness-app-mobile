# Phase 3: Health Condition Nutrient Rules

October 27, 2026. Implemented and tested locally. No hosted migration, production data changes, scanner UI changes or build submission.

## Schema and compatibility

New tables: RuleEvidence and HealthConditionNutrientRule. Nutrient rules reference existing HealthCondition and Nutrient IDs plus a required evidence record. Amount thresholds use Decimal(18,9), explicit units/basis, structured applicability, review status and version. Approved rules require reviewer identity and date. Foreign keys restrict deletion of referenced evidence/nutrients/conditions.

Existing HealthCondition, UserHealthCondition and IngredientAttribute are reused. Existing ConditionRule is extended with evidence, clinical action/severity, applicability and review fields for non-nutrient rules. No duplicate ingredient-rule table. The clinical_ingredient target isolates these records from the legacy ingredient/supplement validators. Its existing condition/attribute/target uniqueness remains; only one current clinical rule per condition/attribute can be imported. Revisions to drafts require a higher version; approved records cannot be overwritten by this importer. An approved-rule replacement/retirement workflow is a future administrative task.

Migration: backend prisma/migrations/20261027000200_condition_nutrient_rules/migration.sql. It is additive and does not alter existing user assignments, ingredient values or profiles. New shared models are included in the account deletion/export schema classification test.

## Service contract

Backend src/services/nutrients/conditionEvaluation.js exports pure evaluate and database-backed evaluateForConditions. The latter accepts prisma and an object containing conditions (existing conditionId or id, optionally active), profileId, servingGrams, optional context and clinicianLimits. Only active supplied conditions and APPROVED rules are loaded. The calling authenticated service must derive conditions and clinician instructions from authorized records; this is not a public HTTP endpoint.

Results contain condition, nutrient or ingredient attribute, actual serving quantity, profile provenance, rule evidence, rule version, action, severity, explanation, general threshold, separate clinician instruction and personalization requirements. Decimal quantities scale by servingGrams / 100. Null or unverified nutrition stays insufficient; zero remains zero. No overall food safe/unsafe score is emitted. Ingredient rules additionally require trusted ingredientEvidence entries with ingredientId, attribute, evidence and verifiedAt; existing attribute tags alone return INSUFFICIENT_DATA.

Applicability is a closed schema: scope GENERAL, CONDITION, LAB_DEPENDENT, MEDICATION or CLINICIAN; requirements is an array of {key, equals}. Unknown keys/structures fail closed. Missing required facts return PERSONALIZATION_REQUIRED; explicitly nonmatching facts skip the rule. No diagnosis, medication, stage or lab inference occurs.

Optional clinicianLimits contain ruleCode, value, unit, basis, prescribedBy and recordedAt. These instructions remain separate from general thresholds. Multiple instructions require review. PER_SERVING and PER_100G comparisons preserve their basis; DAILY or OTHER limits require additional context and are never treated as per-meal allowances. PRIORITIZE versus LIMIT/AVOID_IF_INDICATED conflicts on the same nutrient/component are returned without selecting a winner. Missing ingredient attributes mean unknown, not absent. Ingredient classifications must be verified upstream before clinical use; legacy attributes are not automatically revalidated here.

## Seed and review status

Fourteen conditions are supported: Type 1/2 Diabetes, Prediabetes, Hypertension, CKD, High LDL Cholesterol, Hypertriglyceridemia, Hypothyroidism, Hyperthyroidism, PCOS, Gout, Celiac Disease, Iron Deficiency and Lactose Intolerance. Existing names are reused case-insensitively; CKD and PCOS long-name aliases are recognized. Multiple existing matches abort for manual reconciliation.

Seventeen source-linked DRAFT rules were seeded locally: three added-sugar rules for diabetes/prediabetes, two carbohydrate-monitoring rules for diabetes, hypertension sodium guidance, two individually prescribed CKD mineral restrictions, celiac gluten avoidance, lactose tolerance monitoring, LDL saturated-fat guidance, two triglyceride rules, confirmed iron-deficiency dietary guidance, two personalized thyroid iodine-review rules and conditional gout HFCS guidance. Twelve authoritative references were checked, including a PCOS reference documenting why no universal nutrient restriction is encoded. All remain DRAFT; zero rules have clinical approval or are active for recommendations. Publication years remain null where not established rather than guessed.

- [ADA: Tips for Eating Well](https://diabetes.org/food-nutrition/eating-healthy)
- [NIDDK: Healthy Living with Diabetes](https://www.niddk.nih.gov/health-information/diabetes/overview/healthy-living-with-diabetes)
- [AHA: Shaking the Salt Habit](https://www.heart.org/en/health-topics/high-blood-pressure/changes-you-can-make-to-manage-high-blood-pressure/shaking-the-salt-habit-to-lower-high-blood-pressure)
- [NIDDK: Healthy Eating for Adults with CKD](https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease)
- [NIDDK: Celiac Disease Nutrition](https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease/eating-diet-nutrition)
- [NIDDK: Lactose Intolerance Nutrition](https://www.niddk.nih.gov/health-information/digestive-diseases/lactose-intolerance/eating-diet-nutrition)

Additional references: [AHA saturated fats](https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats), [2026 dyslipidemia guideline](https://www.ahajournals.org/doi/abs/10.1161/CIR.0000000000001423), [NIH iron](https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/), [ATA excess iodine](https://www.thyroid.org/american-thyroid-association-ata-issues-statement-on-the-potential-risks-of-excess-iodine-ingestion-and-exposure/), [ACR gout guideline](https://pmc.ncbi.nlm.nih.gov/articles/PMC10563586/), and [PCOS guideline recommendations 3.3.1-3.3.2](https://pmc.ncbi.nlm.nih.gov/articles/PMC10477934/).

CKD restrictions require explicit adult status, a prescribed restriction and an individual limit. No universal numeric thresholds, natural-sugar prohibition, thyroid sodium/potassium restrictions or inferred medication instructions are seeded. Thyroid iodine review requires a care-team review request and individualized instruction. PCOS remains catalog-only: its guideline supports individualized healthy eating but does not justify a universal nutrient restriction. These drafts are initial coverage, not comprehensive treatment guidance.

Null, undefined, nonfinite and incorrectly typed clinical facts return PERSONALIZATION_REQUIRED, rather than silently excluding the rule. Malformed or duplicate applicability criteria fail closed.

## Commands and import format

From the backend, with DATABASE_URL securely set to the intended local database:

```sh
npm run db:generate
npm run db:deploy
npm run db:seed-nutrients
npm run conditions:import
npm run conditions:import -- --apply
npm run conditions:import -- reviewed-rules.json
npm run conditions:import -- reviewed-rules.json --apply --allow-approved
node scripts/test-condition-rules.js
```

The default is dry run. Hosted writes additionally require prior user approval and --approved-hosted. --allow-approved is only for a clinically reviewed dataset containing reviewer identity/date; the flag does not constitute clinical review.

Structured JSON has conditions (names), evidence (code, organization, guidelineTitle, sourceUrl, nullable publicationYear, lastReviewedAt, evidenceNotes), and rules. Rule fields: code, condition, nutrientCode OR attribute, action, severity, rationale, evidenceCode, version, reviewStatus, requiresPersonalization, applicabilityCriteria, and optional reviewedBy/reviewedAt. Nutrient rules also require thresholdBasis and nullable thresholdValue/thresholdUnit. See backend data/condition-rules/initial.js for the complete example; it can be serialized to JSON without changing its schema.

Imports are transactional and serialize using an advisory lock. Unchanged data produces no updates. Evidence is immutable per code; changed evidence needs a new code. Approved records are protected. Nutrient definitions must be seeded first. No network calls or bulk seeding happen at startup.

## Validation and boundaries

Focused unit tests cover condition/ingredient matching, multiple conditions, portions, unknown versus zero, evidence, approval filtering, medication/lab requirements, threshold basis, clinician instructions, conflicts and import validation. Real PostgreSQL checks cover idempotency, approved evaluation, draft exclusion, protected updates, evidence foreign keys, approval constraints and unchanged existing ingredient/profile records.

443 tests passed across 42 backend suites; Prisma schema validation and the local PostgreSQL integration checks passed. Expanded imports remained idempotent and preserved existing ingredients/profiles.

The legacy safety engine still has older unreviewed rules and is not switched to the new evaluator in this phase. Clinical review and a deliberate consumer migration are required before this engine powers production recommendations. Remaining inputs: clinical approval, curated rules for the catalog-only conditions, validated ingredient classifications and authorization before hosted deployment.
