# Feature inventory and production readiness

Review date: 2026-10-09. Repositories: `fitness-app-mobile` and sibling `fitness-app-backend`.

**Release decision: not ready for public production.** Substantial implementation and security fixes are in the working trees, but the release gates below remain open. HTTP coverage does not establish complete UI, device, security, or clinical correctness. No production deployment was performed.

## Features and current status

| Area | Implemented behavior | Verification / limitations |
|---|---|---|
| Accounts | Email/password registration and login, hashed passwords, expiring revocable bearer sessions, SecureStore token storage, logout | Live registration/login/logout/unauthorized checks passed. Recovery, email verification, account deletion and existing device-ID account migration remain unfinished. |
| Profile | Onboarding/editing: age, sex, body measurements, activity and goals; server profile, weight history and default macro targets | Profile API exercised; account-scoped local cache. Adult-only age validation is reflected in the form. |
| Dashboard | Calories, macros, activity, steps, water, sleep, supplements and daily balance | Backend daily stats/summary routes exercised. Device sensor permissions and offline daily-stat writes need device acceptance tests. |
| Food logging | Manual portions, food search, meal photo/description analysis, daily local history and calorie totals | Stable IDs and persistent retry queue prevent duplicate uploads; fiber and timestamps retained. Today’s meals reconcile from the server after pending writes flush; older history hydration remains unfinished. |
| Food catalog | USDA ingredient search with caching, Spoonacular recipe search and nutrition, recipe search by ingredients | Real configured providers returned success during live checks. Rate limits and subscription entitlements still need deployment verification. |
| Label scanning | Apple Vision OCR on iOS / ML Kit on Android, editable text, nutrition parsing, portion adjustment and food-log persistence | Text parsing and portions passed HTTP tests. Optical recognition requires camera/device testing. Regex parsing without AI is real text parsing, not a fabricated result. |
| Food scale | Native BLE connection, weight measurement decoding and portion integration | Simulated fallback removed. Supports standard GATT weight service; proprietary kitchen scales may require a vendor adapter. Physical scale untested. |
| Exercise | Manual sessions/sets, calorie estimates, history, suggested weights | Writes persist in PostgreSQL. API creation/read checks passed. Estimates are heuristic. |
| Camera coaching | VisionCamera + native MediaPipe Pose Landmarker, joint mapping, rep/form logic and speech feedback | Actual model bundled; no simulated runtime fallback. Mapping/rep/posture unit checks and native debug/simulator builds pass; signed release builds and physical-device accuracy remain release gates. Expo Go cannot validate this. |
| Weekly meals | Preferences, recipe-backed generation, alternatives/swaps, confirmation, ingredient shopping list and checked items | API paths exercised. Shopping route ordering fixed. Seed catalog contains estimated recipe nutrition; not a reviewed production nutrition dataset. |
| Scores | Macro score, health score/detail/history, progress tracking | API paths and ownership checks exercised. Heuristic wellness scores; no clinical validation established. |
| Recommendations | BMR/TDEE, energy balance and weather-dependent suggestions | Routes exercised. Some endpoints retain demo defaults if profile parameters are omitted; remove those defaults or require complete profiles before public release. |
| AI assistant | Live OpenAI Responses API with structured output and daily database-backed quota | Missing `OPENAI_API_KEY`; live chat and two meal-analysis routes return explicit service-unavailable errors. No successful AI integration result claimed. |
| Weather | Location-dependent weather endpoint and mobile location integration | Upstream HTTP success observed; device permission flow untested. |
| Supplements and safety | Catalog/logging, condition rules, ingredient safety attributes and plan checks | Routes exercised, but safety seed references dummy ingredient IDs and skips missing catalog entries. Do not launch condition-specific safety claims with this data. |
| Trainers | Enrollment/list/detail, verification, assignments, client progress, workout plans, notes, drop workflows and surveys | Live role/assignment/ownership scenarios passed. End-to-end coach UI review still needed. |
| Nutritionists | Enrollment/verification, client assignments and meal-plan management | Backend routes exercised; not every backend capability has a complete mobile management UI. |
| Administration | Role/permission checks, verification, privileged assignments and audit-log routes | Member denial and authorized admin workflows passed. Initial super-admin bootstrap and ongoing operational access process must be defined. |

## Changes made

- Replaced client-supplied device identity as authorization with database-backed bearer authentication. Added profile persistence and per-account mobile storage.
- Added session/password schema migration, input validation, ownership checks, security headers, request limits, CORS allowlist and readiness endpoint.
- Restricted trainer/nutritionist assignment to management permissions; checked client relationships before plan access/creation and notes access.
- Moved production exercise storage from memory into PostgreSQL.
- Added stable food-log identity, a persisted mobile outbox with retries/deletion coalescing, and serialized server reconciliation of today’s meals. Prevented label-scan duplicate records and loss of fiber data.
- Replaced fabricated AI/food responses with actual provider calls and explicit unavailable states. Existing deterministic fixtures remain in unit tests; they do not verify the live provider.
- Replaced runtime simulated pose detection with native MediaPipe and bundled model; replaced simulated BLE fallback with explicit native availability checks.
- Fixed weekly shopping-list route interception by the date route.
- Added Node 22 configuration, missing Babel configuration, secure token storage and native plugins. Raised iOS minimum to 15.5. Native linking exposed duplicate Google support symbols between MediaPipe and ML Kit; replaced iOS OCR with a local Apple Vision Expo module, retaining ML Kit on Android.
- Applied compatible dependency security updates. No forced major upgrades were applied.

## Evidence

| Check | Outcome |
|---|---|
| Fresh isolated PostgreSQL migration | 14 migrations applied, including production foundations |
| Backend Jest | 26 suites, 219 tests passed |
| Mobile Jest | 9 suites, 62 tests passed |
| TypeScript | `npx tsc --noEmit` passed |
| Hermes export | iOS and Android JavaScript exports passed |
| iOS generation | Expo prebuild passed and copied pose model |
| iOS simulator native compile | Passed after fixing OCR/MediaPipe linker conflict; no signing/device execution |
| Android native compile | ARM64 debug APK built successfully after repairing local NDK; no device execution |
| Live HTTP | 109/109 discovered route signatures exercised, 136 checks, 3 blocked external AI checks |
| Runtime dependency audit | Backend: 3 high, 1 moderate; mobile: 28 high, 14 moderate; zero critical in either, after compatible fixes |

The endpoint-by-endpoint evidence is in sibling backend `docs/ENDPOINT_RESULTS.md` and `docs/endpoint-results.json`; a copy is included here in `docs/ENDPOINT_RESULTS.md`. A passing negative test means the expected rejection was observed, not a successful operation. Unit tests include mocked dependencies and legacy simulation fixtures. The smoke harness uses real authentication and an isolated local database with synthetic users, not production data. It performs mutations and must never target a production database.

Backend used: `http://127.0.0.1:4401`; isolated database: `fitness_readiness` at localhost:55432. This is a temporary test environment, not a durable deployed service. The existing EAS configuration contains a Railway address; its ownership, availability and deployment revision were not validated or changed.

## Remaining release blockers

1. **Native device acceptance:** complete signed release iOS/Android builds (simulator/debug builds passed); test camera/OCR/pose, front/back orientation, app backgrounding, denied permissions, thermal load, rep accuracy and a real compatible scale. A model integration is not evidence of accurate coaching.
2. **AI configuration:** provision a server-only OpenAI key, budget/alerts and approved model. Run successful text and photo analysis/chat tests, upstream failure and quota scenarios. Alternatively explicitly disable these features for the initial release.
3. **Security advisories:** triage remaining high advisories, distinguish runtime reachability from build tooling, update compatible packages or record reviewed exceptions. Do not blindly use `npm audit fix --force`.
4. **Account lifecycle:** implement and verify recovery/email verification, account deletion and data retention/export. Decide how existing anonymous/device data migrates without allowing account takeover. Never adopt a device ID as proof of identity.
5. **Nutrition/safety data:** replace estimated seed nutrition with attributable reviewed data; populate real ingredient safety attributes. Gate condition-specific recommendations until validated. Remove demo profile/calorie defaults from production routes.
6. **Data consistency:** complete older-history hydration beyond today; unify local-day and UTC-day reporting; test midnight/DST, reinstalls, account switching and multi-device deletion. Add durable/idempotent handling for offline daily stats and supplements.
7. **Operations:** provision production DB, secrets, TLS, migrations, backups/restore test, monitoring, rollback and administrative bootstrap. General IP rate limits are in-process; use a shared store or edge enforcement for multiple instances. Review existing route-specific error responses and logging for information exposure.
8. **Product acceptance:** complete the interactive screen-by-screen flows, accessibility and failure-state tests. Endpoint coverage alone does not prove the app works as expected.

## Production checklist

### Before staging

- [x] Replace anonymous trust headers with authenticated sessions.
- [x] Persist exercise sessions and deduplicate meal writes.
- [x] Remove runtime simulated pose/BLE and fabricated external-service fallback.
- [x] Apply migrations to a fresh local database and exercise every discovered API route.
- [x] Run backend/mobile unit suites, TypeScript and JS exports.
- [ ] Resolve all release blockers above or explicitly remove the affected feature from launch scope.
- [ ] Choose host and authentication lifecycle approach; existing custom auth requires the lifecycle work listed above.
- [ ] Configure independent staging database and server-only provider credentials.
- [ ] Install Node 22, run `npm ci`, `npm run db:generate`, `npm run db:deploy`, and `npm run db:seed-rbac` in backend.
- [ ] Seed only reviewed production catalog data. Do not run `db:seed-dummy` in production; the current weekly recipe seed is also not release-quality nutrition data.
- [ ] Configure `NODE_ENV=production`, `DATABASE_URL`, `PORT`, `CORS_ORIGINS`, provider keys and explicit proxy hop count if required. Never configure `AUTH_TEST_BYPASS` in production.
- [ ] Keep all private keys on the server; `EXPO_PUBLIC_*` values are public in mobile bundles.

### Staging acceptance

- [ ] Set `EXPO_PUBLIC_API_URL` to the staging HTTPS API; build a new native app with updated plugins/model. An OTA update cannot add native modules.
- [ ] Confirm registration → profile → meal → exercise → score/history → logout/login flows on iOS and Android.
- [ ] Confirm separate accounts cannot read/edit each other's data and coach access ends when assignments end.
- [ ] Test offline writes, retries, denied permissions, expired sessions, upstream errors and daily quotas.
- [ ] Verify all enabled AI paths succeed using configured credentials.
- [ ] Test app upgrade from the prior build and account-data migration.
- [ ] Validate privacy disclosures, provider data handling, permission strings, model attribution and store submission requirements.

### Release and rollback

- [ ] Back up DB and prove restore into an isolated environment.
- [ ] Apply reviewed migrations as a release job before starting the compatible server build.
- [ ] Verify `/health/ready`, TLS, monitoring, alerting and production smoke tests with disposable accounts.
- [ ] Deploy internal mobile builds; approve them before store rollout.
- [ ] Use staged rollout with crash/error and provider-cost monitoring.
- [ ] Record previous server image/mobile release and rollback owner. Database rollback needs a reviewed restore/forward-fix plan; do not blindly reverse applied migrations.

## Follow-on feature priorities

Engineering/product proposals, not a benchmark claim: prioritize reliable cross-device history, recovery/deletion, explainable nutrition provenance and permission-aware offline behavior first. After launch reliability is established, consider HealthKit/Health Connect import with deduplication, barcode lookup, coach messaging with consent/access controls, and confidence-based camera coaching that asks users to reposition rather than reporting uncertain reps.

## Configuration found and test reproduction

The backend `.env` contains USDA and Spoonacular configuration. Both providers returned successful live responses. No OpenAI key was found in the reviewed backend configuration. Secret values are deliberately excluded from this report. The user has not selected a production host or managed sign-in provider.

Run backend unit tests with Node 22 using `npm test -- --silent`. The live harness is `scripts/endpoint-smoke.js` in the backend, invoked through `npm run test:api` with `DATABASE_URL` set to a disposable local database whose name includes `readiness`, and `SMOKE_API_URL` set to the local running backend. Start the server with production authentication enabled and seed RBAC/catalog fixtures in that disposable database first. The harness creates accounts and performs writes; it is not a production-health probe.

Dependency audit snapshots, including advisory details, are saved in `BACKEND_DEPENDENCY_AUDIT.json` and `MOBILE_DEPENDENCY_AUDIT.json` alongside this report. Counts reflect package trees at the review time and should be refreshed before release.
