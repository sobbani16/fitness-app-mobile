# N08 — Food recognition from a meal photo

Implemented safeguards and automated verification October 14, 2026. **Live AI acceptance remains blocked: no server OPENAI_API_KEY was available.** No live success, recognition accuracy or native device acceptance is claimed.

## Server configuration

Set these only in backend `.env` locally or your deployment secret/environment configuration. Never put the key in mobile `.env`, `EXPO_PUBLIC_*`, source control, client bundles or API responses.

```dotenv
OPENAI_API_KEY=<project-scoped server secret>
OPENAI_MODEL=gpt-4o-mini
FOOD_AI_USER_DAILY_LIMIT=30
FOOD_AI_GLOBAL_DAILY_LIMIT=100
```

The existing model default is retained; verify availability with the target project's credentials. Both food routes share the account and global budgets. Budgets count attempts, including provider errors/refusals; rejected invalid input and missing configuration do not consume a reservation. Global rejection can consume an account reservation. Zero disables food AI; invalid configuration fails closed. PostgreSQL counters coordinate concurrent server instances and survive restart. Account counters use UTC dates; global buckets expire at UTC midnight and existing retention maintenance cleans them up. No new migration is required.

This is a **request budget, not a dollar limit**. Each call allows at most one 5 MB image, 4,000 description characters and 1,500 output tokens, with a 30-second timeout and no SDK retries. Model/image token pricing varies; configure project billing alerts and an operational spend limit as appropriate. This food budget does not cover chat or other services using the key. Review model pricing before increasing caps.

## Request and review behavior

Authenticated, email-verified users send base64 JPEG/PNG/WebP image data to `/meals/detect`; external image URLs and photo-only flags are rejected. Validation checks decoded size, canonical base64 and matching file signature; provider decoding still validates full image contents. Responses are `no-store`. The application does not persist raw photo payloads server-side or automatically create food logs. Provider requests set `store:false`; that flag is not a claim of zero provider retention.

Strict structured output includes whether food is identifiable, uncertainty and an uncalibrated confidence assessment. No-food or refusal returns 422; invalid/incomplete output returns 502; provider throttling returns 503; timeout returns 504; local quota returns 429 with Retry-After. Raw provider errors and credentials are not returned. No mock meal is substituted on failure. Bounds reject impossible/unsupported nutrition values before preview.

On both Android/iOS, camera and library selection include JPEG bytes using Expo ImagePicker's base64 contract. Missing/oversized photo data and denied permissions are visible errors. The user sees an upload notice, editable nutrition, uncertainty and a required review action before Save. Removing/replacing a photo, editing its description, selecting a search result or unmounting invalidates stale recognition results. Saving clears photo bytes. A model confidence below 0.7 triggers a caution; this is a product heuristic, not a validated accuracy score.

## Automated verification and remaining acceptance

Passed: 99 mobile tests (17 suites), 239 backend tests (27 suites), 36 authenticated PostgreSQL integration tests (5 suites), TypeScript, and Android/iOS JavaScript exports. Exports are in `/private/tmp/fitness-n08-export-final`; they do not prove native builds or camera behavior on installed devices.

Tests exercise the real detector/provider adapter with only the OpenAI SDK response mocked, plus authenticated HTTP routes and PostgreSQL quotas. They cover image bytes, strict schema, invalid images/inputs, missing key, uncertain/non-food estimates, refusals, invalid numbers, malformed/incomplete output, provider errors/timeouts, concurrent global caps, account caps, UTC-day isolation, kill switch and persistence across limiter instances. Mobile component tests cover both photo sources, review/save, quota messaging, denied permission and stale responses.

Live test, after configuring the key and starting the backend:

1. Sign in with a verified staging account; set its session token locally in `FOOD_SMOKE_TOKEN` and the API origin in `FOOD_SMOKE_API_URL`. Never share tokens in chat or commit them.
2. Prepare three consented photos: a clear meal, an ambiguous/partly obscured meal, and a non-food object. Use actual photos to evaluate recognition; synthetic transport fixtures do not establish accuracy.
3. From the backend run `node scripts/food-photo-smoke.js clear-meal.jpg ambiguous-meal.jpg non-food.jpg`. This makes exactly three requests, prints only status/pass flags, and never saves meals. Inspect the app's food identity/portion/macros separately; the smoke check does not validate nutrition accuracy. Uncertainty may vary; investigate any failed case rather than loosening acceptance automatically.
4. On signed Android and iOS builds, test camera/library permissions, cancellation, supported formats, oversized images, editing portions, required review, saving once, and network loss. Confirm removing/changing a photo during analysis does not display a stale result.
5. With a small staging budget, verify the next request gets 429 and food search remains usable. Recheck after API restart and next UTC day.

Official references: [image inputs](https://developers.openai.com/api/docs/guides/images-vision) and [structured outputs and refusals](https://developers.openai.com/api/docs/guides/structured-outputs).
