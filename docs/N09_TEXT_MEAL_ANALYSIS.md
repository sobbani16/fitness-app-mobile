# N09 — Meal analysis from text

Implemented October 14, 2026. **Live upstream acceptance is still blocked by the absent backend OPENAI_API_KEY.** Automated tests mock the provider response; they do not prove successful live inference or nutrition accuracy.

## Behavior

With no photo selected, Log a meal shows **Analyze description** and calls authenticated `/meals/analyze`. A selected photo continues to use `/meals/detect`. Both share the N08 provider validation, failure handling and persistent UTC daily account/global attempt budgets.

Analysis now preserves the suggested portion, per-100g nutrition, uncertainty and review flags alongside total calories and portion-scaled macros. Previously the analysis response discarded those details. The preview is explicitly labeled **Estimated nutrition**, shows uncertain assumptions, supports editing portion/nutrition and requires review before an explicit save. Changing the description invalidates an outstanding response. A 4,000-character input limit matches server validation. Empty/non-food descriptions do not generate a fallback meal.

The prompt asks the model to honor stated portion weights, distinguish cooked/raw weights and disclose uncertainty about recipes, hidden ingredients and missing amounts. These instructions are not a guarantee of accuracy. Estimates remain editable; confidence is an uncalibrated model assessment. No food record is saved by the analysis endpoint.

## Verification

Passed: 100 mobile tests, 240 backend regression tests, 37 authenticated PostgreSQL integration tests, TypeScript, and Android/iOS JavaScript exports (`/private/tmp/fitness-n09-export`). Text-specific cases cover:

- Actual analyzer/provider adapter with a mocked SDK response: text-only upstream payload, retained portion/uncertainty and correct macro scaling.
- Authenticated HTTP `/meals/analyze`: empty/oversized input rejection, reviewable estimates, non-food rejection and no automatic food-log creation.
- Mobile: correct text endpoint selection, uncertainty display, editing a 200g portion to 100g, required review and saving adjusted calories/macros.

Shared N08 tests cover missing credentials, invalid responses, timeouts, service failures, quotas and stale request handling. Android/iOS JavaScript exports are checked separately; signed-device acceptance remains pending.

## Live acceptance

Use the server-only configuration documented in [N08](N08_FOOD_PHOTO_RECOGNITION.md). Do not put the key in mobile configuration or paste it into chat.

1. Start the backend with a working project key and model. Sign in with a verified staging account.
2. Set `FOOD_SMOKE_API_URL` and `FOOD_SMOKE_TOKEN` locally to the API origin and that account's session token.
3. From the backend run `node scripts/meal-text-smoke.js`. It makes three real requests: specified-weight cooked rice, an uncertain mixed meal, and non-food. It prints status/pass flags without tokens or response bodies, returns nonzero on failure and creates no food logs.
4. Inspect food identification and nutrition plausibility in the app; smoke assertions alone do not establish dietary accuracy. Compare representative foods/portions against known reference values and record any material deviations.
5. Repeat text entry, uncertain presentation, portion editing, review/save, server outage and quota exhaustion on signed Android/iOS builds. Confirm no image is required and no meal is created on analysis failure.

Do not mark N09 live acceptance complete until the real upstream and native checks succeed.
