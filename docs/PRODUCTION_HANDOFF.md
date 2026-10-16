# Production feature status and handoff

**Status date: October 14, 2026 (A04–A05, N04, N08–N09 updated; A03 evidence October 13; remaining feature evidence October 9)**  
**Scope:** fitness-app-mobile and fitness-app-backend  
**Overall decision: NOT READY for public production deployment.** No production deployment has been performed. This document summarizes the implementation and verification from the readiness work; A03 implementation was added October 13; A04–A05, N04 and N08–N09 were updated October 14 with automated verification. Latest regression checks passed: 100 mobile tests, 240 backend tests, 37 authenticated PostgreSQL integration tests, TypeScript and Android/iOS JavaScript exports. N08–N09 live AI acceptance remains blocked by the absent server key. Signed-device acceptance and remaining feature evidence have not been renewed.

**TestFlight-only update — October 15, 2026, 02:48 UTC:** Owner confirmed beta distribution only; public App Store release is deferred. Corrected backend `https://fitness-app-backend-production-c5d4.up.railway.app/health` returned HTTP 200 with `status: ok`. Preview/production build settings now use this URL; the `testflight` profile inherits it. Earlier 404 checks were for the superseded domain. Health success does not verify authentication, database persistence or device flows. Privacy-policy URL is now configured; content corrections remain outstanding (see latest update below). No cloud build, signing credentials or submission performed. [Configuration and remaining gates](TESTFLIGHT_RELEASE.md). Earlier feature test counts are historical, not rerun by this configuration update.

**Privacy-policy update — October 15, 2026 UTC:** Public GitHub Pages policy returned HTTP 200 and is configured for TestFlight. Local TestFlight release configuration check passed. Policy still contains pre-publication placeholders and mismatches involving HealthKit, microphone access, account deletion and beta AI availability; content review remains blocked. See [release notes](TESTFLIGHT_RELEASE.md). No cloud build or submission initiated.

**Policy revision recheck — October 15, 2026 UTC:** Published corrections are live: draft placeholders removed; HealthKit/microphone disabled and deletion implementation accurately qualified. Remaining alignment: distinguish available on-device label OCR/posture processing from disabled server AI; match policy age eligibility to adult-only onboarding. [Details](TESTFLIGHT_RELEASE.md). TestFlight only; no build/submission performed.

**Latest policy verification — October 15, 2026 UTC:** Both requested corrections are live: section 4 distinguishes on-device processing from disabled server AI; section 12 states adults 18+. Earlier policy findings above are historical. Section 5 could use the same “server-based AI” wording for consistency. Native release, authenticated API and signed-device acceptance remain pending. No cloud build/submission initiated. [Evidence](TESTFLIGHT_RELEASE.md).

**Approved TestFlight attempt — October 15, 2026:** Owner authorized build, submission and internal testing. EAS retry reached the service but reports `Not logged in`; local Expo login is required before proceeding. No build/submission/tester setup completed. [Attempt details](TESTFLIGHT_RELEASE.md).

**Latest TestFlight attempt — October 15, 2026:** Expo login confirmed; local configuration passes. EAS created the TestFlight channel/branch and incremented remote build number to 3 across two signing-setup attempts. Build blocked by required Apple Developer login/signing setup; interactive prompt canceled without credentials. No build artifact, submission or internal tester setup completed. [Details](TESTFLIGHT_RELEASE.md).

**Latest build repair — October 15, 2026:** Build 4 failed due to profile-dependent `updates.enabled` causing local/cloud fingerprint mismatch. Static OTA-disabled configuration now resolves identically across profiles; release checks pass. Replacement TestFlight build 5 (`153aa078-235d-4cd9-a777-38384a1cfba0`) uploaded with existing signing credentials; final result/submission pending. [Evidence](TESTFLIGHT_RELEASE.md).

**Signed iOS build — October 15, 2026:** TestFlight build 5 succeeded after the fingerprint configuration fix. Exact-build submission `727256fe-7cb6-42f5-96a3-e802e54a4763` is queued at EAS; Apple processing and internal tester setup are not confirmed. Browser setup connection failed; physical-device acceptance remains pending. [Release evidence](TESTFLIGHT_RELEASE.md).

**Latest TestFlight status — October 15, 2026:** EAS submission FINISHED with no error for build 1.0.0 (5). Owner screenshot confirms internal group `test` and one tester, but zero builds visible/assigned. Apple processing/availability and device installation remain pending; no duplicate upload needed. [Evidence](TESTFLIGHT_RELEASE.md).

**Latest Apple TestFlight evidence — October 15, 2026:** Owner screenshot confirms build 1.0.0 (5) processed, Ready to Submit, assigned to the internal group with one invitation. Internal installation can proceed; no installs/sessions or device acceptance evidenced yet. Public release remains deferred. [Details](TESTFLIGHT_RELEASE.md).

**Device acceptance blocker — October 15, 2026:** TestFlight register/login fail. Live POST auth probes return 404; Railway runs legacy commit `da84fab` without auth routes. Required auth/email settings are absent. Compatible backend deployment/migrations/configuration are needed before a usable beta account can be created. No credentials issued or production data changed. [Diagnosis](TESTFLIGHT_RELEASE.md).

**Backend push — October 15, 2026:** Commit `8c6a99a` pushed to backend main; Railway deployment `be9f0aaf-5dd7-4cea-8919-3e62575bfd11` is BUILDING. 240 unit/API and 37 local PostgreSQL tests passed. Auth secret/origin configured; Resend key/sender still absent at last check. Deployment/auth acceptance and test-account creation remain pending. [Details](TESTFLIGHT_RELEASE.md).

**Latest deployment result:** Owner screenshot confirms Railway deployment `be9f0aaf` CRASHED at startup because RESEND_API_KEY/AUTH_EMAIL_FROM are missing. Pre-deploy protection was not verified effective; deployment configuration/migration execution require inspection. Backend login remains blocked. [Details](TESTFLIGHT_RELEASE.md).

**Restart prerequisite check — October 15, 2026:** Active production/backend settings still lack RESEND_API_KEY. Owner-selected sender saved directly without deployment. Restart not triggered because the required key is absent; latest deployment remains crashed. [Details](TESTFLIGHT_RELEASE.md).

**Latest live auth result — October 16, 2026 UTC:** Database backed up; 11 missing migrations and RBAC seed applied successfully. Registration 201 and login 200 verified for owner-requested beta account; verification email/inbox and device acceptance pending. Earlier 404/500 findings are historical. No passwords/tokens recorded here. Railway automatic migration/proxy configuration still needs review. [Evidence](TESTFLIGHT_RELEASE.md).

**Mobile repository checkpoint — October 16, 2026:** Owner requested committing all pending mobile project work. Source, native OCR module, pose model asset, tests, release configuration and handoff documentation are included in the local checkpoint. Credential-pattern and large-file checks found no flagged files; git whitespace check passed. Ignored dependencies/build outputs and credentials are excluded. This source-control checkpoint does not revalidate feature acceptance; N13/N16 and signed-device checks retain their existing status. No remote push requested.

**Backend repository checkpoint — October 16, 2026:** Remaining historical endpoint verification reports committed locally; backend implementation was already committed in 8c6a99a. No push or cloud build requested by this checkpoint. No .github or .eas workflow files found in either repository; dashboard-only triggers were not inspected. Local commits do not trigger iOS builds.

Use this file as the work tracker. Assign an owner to each open item, record evidence when it is completed, and update the status before release.

## Status definitions

| Status | Meaning |
|---|---|
| IMPLEMENTED — acceptance pending | Code exists and the recorded automated/API checks passed where applicable. Staging/device acceptance and the shared release gates still apply. |
| PARTIAL | A material implementation, data-quality or synchronization gap remains. |
| BLOCKED | The feature cannot currently be accepted for production because a required service, dataset or validation is missing. |
| MISSING | Required capability is not implemented or has not been established. |

**No feature is labeled production-approved.** Passing a unit test, HTTP request or native build does not establish complete end-to-end correctness. Priority P0 means resolve before public launch; P1 means resolve before enabling the affected feature, or explicitly defer and disable it.

## 1. Accounts, profile and personal data

| ID | Feature | Production status | Evidence / current behavior | Remaining work and acceptance condition | Priority |
|---|---|---|---|---|---|
| A01 | Register, sign in and sign out | IMPLEMENTED — acceptance pending | Live registration/login/logout and invalid-login checks passed. | Verify complete signed-app flows, errors and expired sessions against staging. Depends on A03–A06 and shared security gates. | P0 |
| A02 | Password hashing, bearer sessions and secure token storage | IMPLEMENTED — acceptance pending | Hashed passwords; expiring/revocable server sessions; mobile SecureStore; account-switch/expiry tests. | Review auth security, brute-force controls, multi-instance limits and stolen/revoked-session behavior. | P0 |
| A03 | Password recovery and email verification | IMPLEMENTED — acceptance pending | Resend queue, hosted link pages, mobile recovery/verification gate, expiring single-use links, shared rate limits and reset session revocation. 13 real-database auth tests; 219 backend and 67 mobile tests passed. [Setup and evidence](A03_AUTH_LIFECYCLE.md). | Configure Resend sender/key, signing secret and HTTPS origin; verify staging inbox delivery and signed iOS/Android flows. Browser visual verification was blocked by tool connection failure. | P0 |
| A04 | Account deletion, data export and retention | IMPLEMENTED — acceptance pending | Password-confirmed export/deletion, dependent-record cleanup, retention maintenance, mobile privacy controls and cache cleanup. 11 A04 database tests; Android/iOS bundles generated. [Policy, setup and evidence](A04_ACCOUNT_LIFECYCLE.md). | Verify signed Android/iOS export and deletion; enforce hosting/provider retention and rehearse backup deletion replay. Native builds must include expo-sharing. | P0 |
| A05 | Existing device-ID account migration | IMPLEMENTED — acceptance pending | Independently reviewed, account-bound single-use grants; in-place member-account upgrade; guarded legacy local import. Six database migration tests; prior-app storage fixtures; Android/iOS bundles. [Policy and evidence](A05_LEGACY_ACCOUNT_MIGRATION.md). | Establish independent ownership review and test signed installed-app upgrades. Unprovable claims remain quarantined; populated destinations and privileged accounts require separate review, not automatic merging. | P0 if existing users/data are retained |
| A06 | Per-account storage and isolation | IMPLEMENTED — acceptance pending | Scoped caches, authenticated server ownership, account-switch checks. | Verify two-account/device flows, logout during requests, reinstalls and absence of cross-account data exposure. | P0 |
| A07 | Onboarding and profile editing | IMPLEMENTED — acceptance pending | Server profile persistence; age/body measurements/activity/goals; adult-age form validation. | Verify onboarding/edit errors, units, supported bounds and server/cache consistency on both platforms. | P0 |
| A08 | Weight history and default macro targets | IMPLEMENTED — acceptance pending | Profile writes update weight history and default targets. | Validate target calculations and custom-target preservation with representative profiles. | P1 |

## 2. Food, nutrition and meal planning

| ID | Feature | Production status | Evidence / current behavior | Remaining work and acceptance condition | Priority |
|---|---|---|---|---|---|
| N01 | Meal logging, portions, calories and macros | IMPLEMENTED — acceptance pending | Stable IDs, timestamp/fiber preservation and deduplicated API writes. | Verify manual logging/editing flows, units, deletion, invalid inputs and daily totals in the UI. | P0 |
| N02 | Offline meal upload/retry and deletion | IMPLEMENTED — acceptance pending | Persisted outbox, serialized changes and deletion coalescing; retry tests pass. | Test real network loss, app termination/restart, failed writes and retry recovery. | P0 |
| N03 | Today's meals across devices | IMPLEMENTED — acceptance pending | Pending changes flush before server reconciliation; failed refresh preserves cache; local-day filtering tests. | Verify real two-device updates/deletions and midnight/DST boundaries. | P0 |
| N04 | Older meal history across devices | IMPLEMENTED — acceptance pending | Server hydration for navigable four-week windows; offline cache, pending changes and account isolation preserved. Automated cache-wipe and fresh-session recovery tests pass. | Run signed Android/iOS reinstall and two-device acceptance; see [N04 validation](N04_MEAL_HISTORY.md). | P1 |
| N05 | USDA ingredient search and caching | IMPLEMENTED — acceptance pending | Configured provider returned successful live responses; fabricated fallback removed. | Verify production credentials, quota/entitlements, empty/error states and nutritional attribution. | P1 |
| N06 | Spoonacular recipe search and nutrition | IMPLEMENTED — acceptance pending | Live recipe and nutrition requests succeeded. | Verify production subscription/quota, attribution and UI result/error flows. | P1 |
| N07 | Recipes by ingredients | IMPLEMENTED — acceptance pending | Feature exists and relevant API paths were exercised. | Accept search relevance, quantity handling and unavailable-provider behavior in staging. | P1 |
| N08 | Food recognition from a meal photo | BLOCKED — live acceptance | Photo validation, uncertain/no-food handling, required review and persistent account/global budgets implemented; automated provider/HTTP/mobile tests pass. Server OpenAI key remains absent. | Configure server key; run three-photo live smoke and signed Android/iOS checks in [N08 validation](N08_FOOD_PHOTO_RECOGNITION.md). | P1 |
| N09 | Meal analysis from text | BLOCKED — live acceptance | Text-only UI now uses /meals/analyze; portion basis, uncertainty and required review preserved. Automated HTTP/provider-adapter/mobile tests pass; server key remains absent. | Run live text smoke with server credentials and signed Android/iOS presentation checks; see [N09 validation](N09_TEXT_MEAL_ANALYSIS.md). | P1 |
| N10 | Label OCR | IMPLEMENTED — acceptance pending | Apple Vision on iOS; ML Kit on Android; both native builds pass. | Test real labels, rotation, lighting, permissions, unreadable labels and correction flow on devices. | P1 |
| N11 | Editable label text, nutrition parsing and portion adjustment | IMPLEMENTED — acceptance pending | Parsing/portion APIs tested; repeated saves retain fiber and avoid duplicate logs. | Check serving-size units, decimal values, incomplete labels and final saved totals. | P1 |
| N12 | Bluetooth food scale | BLOCKED — device acceptance | Native BLE adapter and decoding exist; simulated fallback removed. | Test a named supported scale. Standard GATT support does not establish compatibility with proprietary kitchen scales. | P1 |
| N13 | Weekly meal preferences and generation | PARTIAL | API flow works; catalog contains estimated seeded recipe nutrition. | Replace/review catalog with attributable nutrition data; validate preferences and goal fit. | P1 |
| N14 | Meal alternatives, swaps and confirmations | IMPLEMENTED — acceptance pending | API workflows and ownership exercised. | Verify UI behavior and repeated confirmation/unconfirmation. Depends on reviewed N13 data. | P1 |
| N15 | Ingredient shopping list and checked items | IMPLEMENTED — acceptance pending | API exercised; shopping route interception fixed. | Validate aggregation, portions, units, swaps and checked-state persistence. | P1 |
| N16 | Supplement catalog and logging | PARTIAL | Catalog/logging routes exercised. | Review catalog; add durable/idempotent offline handling; verify repeated taps and retries do not duplicate logs. | P1 |
| N17 | Ingredient/condition safety checks | BLOCKED | Safety seed references dummy ingredient IDs and skips missing entries. | Populate reviewed attributes/rules for actual ingredients; validate coverage and unknown-data handling. Keep condition-specific claims disabled until accepted. | P1 |

## 3. Activity, coaching and dashboard

| ID | Feature | Production status | Evidence / current behavior | Remaining work and acceptance condition | Priority |
|---|---|---|---|---|---|
| F01 | Manual workout sessions and sets | IMPLEMENTED — acceptance pending | Production data moved from memory to PostgreSQL; creation/read checks passed. | Verify end-to-end logging, app/server restart persistence and history in staging. | P0 |
| F02 | Exercise calorie estimates and suggested weights | IMPLEMENTED — acceptance pending | Existing heuristic calculations and unit coverage. | Review representative inputs, limits and estimate wording; do not imply measured accuracy. | P1 |
| F03 | Camera pose detection | BLOCKED — device acceptance | Real bundled MediaPipe model, VisionCamera, landmark mapping; iOS/Android builds pass. | Test orientation, visibility, distance, lighting, permissions, backgrounding and performance on physical devices. | P1 |
| F04 | Automatic rep counting and form feedback | BLOCKED — accuracy acceptance | Rep/posture tests pass; real native frames are integrated. | Compare counts/form feedback against observed exercises; calibrate 2D aspect-ratio/view effects and reject low-confidence observations. | P1 |
| F05 | Spoken coaching feedback | IMPLEMENTED — acceptance pending | Speech feedback feature exists. | Verify timing, repeated prompts, mute/volume behavior and app lifecycle on devices. Depends on F04. | P1 |
| F06 | Step tracking | IMPLEMENTED — acceptance pending | Sensor integration and account-scoped storage exist. | Test permissions, unsupported devices, lifecycle, day rollover and accuracy. | P1 |
| F07 | Water, sleep and daily activity stats | PARTIAL | Daily-stat endpoints exercised. | Complete durable/idempotent offline sync and consistent local-day/UTC reporting. | P1 |
| F08 | Dashboard, calorie balance and daily summary | IMPLEMENTED — acceptance pending | Summary/stat APIs exercised. | Verify displayed totals match saved meals/activity, refresh correctly and handle unavailable sources. | P0 |
| F09 | Macro score | IMPLEMENTED — acceptance pending | API paths exercised. | Validate score explanation/calculations against accepted targets and incomplete data. | P1 |
| F10 | Health score, detail/history and progress | PARTIAL | API and ownership checks passed; heuristic wellness scoring. | Review calculation/data quality and wording; no clinical validation is established. | P1 |
| F11 | BMR/TDEE and goal recommendations | PARTIAL | Calculation/recommendation endpoints exist and were exercised. | Remove demo profile/calorie defaults or require complete inputs; validate supported profiles and presentation. | P1 |
| F12 | Weather/location suggestions | IMPLEMENTED — acceptance pending | Live weather endpoint succeeded. | Test denied location permission, unavailable weather and appropriate fallback behavior. | P1 |
| F13 | AI chat assistant and daily quota | BLOCKED | Real Responses API and database-backed quota; no configured OpenAI key found. | Configure upstream service and budget; verify real responses, quota enforcement and failures. | P1 |

## 4. Trainers, nutritionists and administration

| ID | Feature | Production status | Evidence / current behavior | Remaining work and acceptance condition | Priority |
|---|---|---|---|---|---|
| C01 | Trainer enrollment, listing, detail and verification | IMPLEMENTED — acceptance pending | Live API/role workflows passed. | Complete trainer/member/admin UI acceptance, including rejected/unverified states. | P1 |
| C02 | Trainer/client assignment and progress | IMPLEMENTED — acceptance pending | Privileged assignment and active-relationship checks; live scenarios passed. | Verify access starts/ends correctly with assignment changes. | P1 |
| C03 | Trainer workout plans | IMPLEMENTED — acceptance pending | API creation/access exercised with relationship checks. | Complete trainer-to-client plan lifecycle in the app. | P1 |
| C04 | Coach notes and visibility | IMPLEMENTED — acceptance pending | Author/client visibility and relationship checks added. | Verify private/client-visible behavior and removed-assignment access. | P1 |
| C05 | Trainer drop workflows and client surveys | IMPLEMENTED — acceptance pending | Routes and associated screens exist; API paths exercised. | Complete both sides of the workflow, repeated submissions and error states. | P1 |
| C06 | Nutritionist enrollment, verification and assignment | PARTIAL | Backend routes exercised; mobile management coverage is incomplete. | Complete required mobile/admin management flows or explicitly limit initial scope. | P1 |
| C07 | Nutritionist meal plans | PARTIAL | Backend plan routes exist and were exercised. | Verify full creation-to-client delivery workflow and reviewed nutrition data. | P1 |
| C08 | Roles, permissions and ownership enforcement | IMPLEMENTED — acceptance pending | Unauthorized/member rejection and authorized administrative scenarios passed. | Review complete role matrix and regression-test role/assignment removal. | P0 |
| C09 | Initial administrator bootstrap | MISSING — operational process | Test harness grants a fixture administrator; no production bootstrap process established. | Define and test controlled initial admin provisioning and recovery; no default/shared credentials. | P0 |
| C10 | Audit logs and operational administration | PARTIAL | Audit-log endpoints exercised. | Review event coverage, retention, access and management workflow. | P0 |

## 5. Shared deployment gates

These apply to every feature retained in the release. Feature-level implementation does not bypass them.

| ID | Gate | Status | Required completion evidence | Priority |
|---|---|---|---|---|
| D01 | Production host and database | NOT ESTABLISHED | Selected host; independent staging/production DBs; verified deployment configuration. Owner corrected the beta domain to `fitness-app-backend-production-c5d4.up.railway.app`; `/health` returned HTTP 200 on October 15. Authenticated API/database acceptance and environment isolation remain unverified. | P0 |
| D02 | Secrets, TLS, CORS and proxy configuration | PARTIAL | Server-only secrets, HTTPS mobile API URL, intended CORS origins and verified proxy settings. USDA/Spoonacular keys found locally; OpenAI key missing. | P0 |
| D03 | Schema migrations and seed data | LOCAL CHECK PASSED | Fresh local DB accepted 14 migrations. Rehearse release migration and rollback/forward-fix; seed RBAC and reviewed catalog data only. | P0 |
| D04 | Dependency security | OPEN | Snapshot: backend 3 high/1 moderate; mobile 28 high/14 moderate; no critical advisories. Refresh audit, assess reachability and resolve or formally review exceptions. | P0 |
| D05 | API hardening and abuse controls | PARTIAL | Headers, validation, body limits and rate limits exist. Review route-specific errors/logging; use shared/edge limits for multiple instances. | P0 |
| D06 | Backups, restore, monitoring and rollback | NOT VERIFIED | Restore drill, readiness monitoring, alerts, previous release artifacts and named rollback owner. | P0 |
| D07 | Automated release checks | MANUAL EVIDENCE AVAILABLE | Repeatable release checks cover migrations, tests, builds and disposable staging API flows. Local execution is not evidence of enforced CI gates. | P0 |
| D08 | Signed release apps | IOS BUILD PASSED — acceptance pending | Signed iOS version 1.0.0 build 5 succeeded on EAS; TestFlight upload completed; internal group/tester created by owner. Build availability/assignment and device acceptance and signed Android release remain pending. See TESTFLIGHT_RELEASE.md. | P0 |
| D09 | Physical-device and full UI acceptance | PENDING | iOS/Android happy paths, failure states, permissions, offline recovery and accessibility signed off. | P0 |
| D10 | Privacy, data handling and distribution | PENDING REVIEW | Published/accepted disclosures, deletion/retention process, provider handling, model attribution and applicable store submission requirements reviewed. | P0 |
| D11 | Public deployment and rollout | NOT PERFORMED | Staging sign-off, production readiness probe, monitored staged rollout and rollback availability. | P0 |

## 6. Verification already completed

| Check | Recorded result | Limit |
|---|---|---|
| Backend unit suite | 26 suites / 219 tests passed | Includes mocked dependencies and fixtures. |
| Mobile unit suite | 9 suites / 62 tests passed | Does not establish native sensor accuracy or full UI behavior. |
| Live backend HTTP | 109/109 route signatures exercised; 136 checks; 3 AI checks blocked | Expected rejection tests count as passes; route coverage is not exhaustive input/branch coverage. |
| Database migrations | 14 applied to fresh isolated PostgreSQL | Production migration rehearsal still required. |
| TypeScript | Passed | Static verification only. |
| iOS/Android JS exports | Passed | Does not verify native runtime behavior. |
| iOS native build | Simulator Debug build passed | Unsigned; no physical-device acceptance. |
| Android native build | ARM64 Debug APK built successfully | No physical-device acceptance or signed-release validation. |
| Food/recipe/weather upstreams | Successful live responses recorded | Production credentials, entitlement and resilience checks remain. |
| AI upstream | Not successfully verified | Missing server OpenAI key. |

## 7. Recommended order to continue

1. **Decide the first-release feature set.** For each P1 feature, either schedule its remaining work or explicitly disable its entry points and backend access. A note in this document alone does not disable a feature.
2. **Resolve launch-wide P0 items:** account lifecycle, existing-data policy, security advisories, admin bootstrap, staging/production setup and data consistency for core logging/dashboard flows.
3. **Complete data/service dependencies:** real AI configuration if enabled; reviewed recipe/supplement/safety data; remove demo recommendation defaults.
4. **Run end-to-end staging acceptance:** register → profile → meals → exercise → dashboard/history → logout/login; repeat with two accounts, two devices, network loss and revoked access.
5. **Accept specialized features:** actual OCR labels, supported scale, pose/rep calibration, coach/nutritionist workflows and score explanations.
6. **Produce signed release builds and rehearse deployment:** migration, backup/restore, health checks, monitoring and rollback.
7. **Approve rollout only after retained features and shared gates have evidence.** Nothing in this report is a production deployment approval.

### Completion record template

Copy this for each open ID:

```text
Feature/gate ID:
Owner:
Decision: enable at launch / defer and disable
Work completed:
Tests and evidence:
Known limitations:
Reviewed by:
Status and date:
```

## 8. Supporting documents

- [Detailed findings and production checklist](PRODUCTION_READINESS.md)
- [Endpoint-by-endpoint HTTP results](ENDPOINT_RESULTS.md)
- [Native build findings and reproduction](NATIVE_VALIDATION.md)
- [Backend advisory snapshot](BACKEND_DEPENDENCY_AUDIT.json)
- [Mobile advisory snapshot](MOBILE_DEPENDENCY_AUDIT.json)
- [Project setup](../README.md)

The backend also contains `scripts/endpoint-smoke.js` and `docs/endpoint-results.json`. The harness mutates data and creates synthetic accounts; run it only against its supported disposable local readiness database, never production. Temporary build artifacts under `/private/tmp` are not durable release assets.
