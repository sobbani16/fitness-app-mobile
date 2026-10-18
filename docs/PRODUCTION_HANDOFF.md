# Production feature status and handoff

**Status date: October 17, 2026 (mobile UX milestones 1–6, C09 admin provisioning and beta build 7; earlier feature/API evidence retains its recorded dates)**
**Scope:** fitness-app-mobile and fitness-app-backend  
**Overall decision: NOT READY for public production deployment.** Public App Store release has not been performed; the existing Railway backend serves the TestFlight beta. This document summarizes the implementation and verification from the readiness work; A03 implementation was added October 13; A04–A05, N04 and N08–N09 were updated October 14 with automated verification. Latest M6 regression: 196 mobile tests across 45 suites, TypeScript and Android/iOS Hermes exports passed October 17. Latest C09 backend regression: 266 tests across 31 suites plus dedicated real PostgreSQL/HTTP administrator provisioning checks. Earlier M4 progress/profile integrity evidence retains its date. The earlier 37 authenticated PostgreSQL integration tests were not rerun for this milestone. N08–N09 live AI acceptance remains blocked by the absent server key. Signed-device acceptance and remaining feature evidence have not been renewed.

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

**UX milestone 1 — October 16, 2026:** Audited existing screens and delivered shared light/dark tokens, appearance selection, preserved-route quick add and redesigned Today. Local meal display survives target failures; unknown nutrients stay unknown; motion/weather permissions are contextual; water has tap guarding and explicit sync feedback/retry. No compensatory exercise advice or inferred physiological deficit on Today. 130 mobile tests, TypeScript, release check and both platform JS exports passed; lint has zero errors/33 existing warnings. Native visual/accessibility acceptance remains pending. No production user data changed, TestFlight build or submission triggered. [Audit, navigation proposal, changed files and evidence](UX_MILESTONE_1.md). M2 requires approval.

**GitHub automation configuration — October 16, 2026:** Manual-only TestFlight workflow and setup guide added locally. It checks release config/types/lint/tests before EAS build with exact-build auto-submission. Not pushed/run; repository EXPO_TOKEN secret setup and cloud acceptance remain pending. No automatic push trigger. [Setup](GITHUB_TESTFLIGHT_WORKFLOW.md).

**UX milestone 2 — October 16, 2026:** Food home now separates search/manual/photo/recipe paths, with recent foods, local favorites and review/repeat. Label capture supports camera-denied manual entry, corrected OCR text, explicit portion units and unknown nutrients. Stable scan IDs, transactional writes and a nullable-nutrient migration prevent duplicate/partial label saves and preserve unknown fiber. 148 mobile tests, 256 backend tests, five disposable-database integrity checks, TypeScript and both platform JS exports passed; lint has zero errors/32 existing warnings. All 20 migrations applied locally. **Deploy the compatible backend/migration before distributing this app.** Favorites are device-only; label retry state is not process-durable. No production data, deployment or TestFlight build touched. [Implementation, changed files, evidence and acceptance](UX_MILESTONE_2.md). M3 requires approval.

**UX milestone 3 — October 16, 2026:** Workout search/categories, recent exercises, local favorites/templates, explicit kg/lb conversion, start/log/finish/review and timestamp timers implemented. Account-scoped durable pending operations and stable IDs protect retries; PostgreSQL row locks protect concurrent appends/finish. 159 mobile tests (32 suites), 257 backend tests (28 suites), eight real-database integrity scenarios, TypeScript, release checks and both platform Hermes exports passed. ESLint: zero errors/32 existing warnings. All 21 migrations applied only to disposable localhost data. **Deploy the compatible backend/migrations before distributing the mobile app.** Single-exercise workouts; favorites/templates remain device-local; native visual/camera/accessibility acceptance is pending. No production data, deployment or TestFlight build touched. [Implementation, files, scope and evidence](UX_MILESTONE_3.md). M4 requires owner approval.

**UX milestone 4 — October 16, 2026:** Progress now supports 7/30/90-day nutrition, weight, water, step and workout trends, previous-period comparisons and daily history. Authenticated bulk reads preserve unknowns and timezone boundaries; cached fallback and selected-day meal hydration remain. Account/settings replaces the old daily summary; profile editing removes demo defaults and automatic location prompts, preserves unit conversions and guards concurrent weight history writes. Score details explicitly remain provisional; unreviewed advice is not rendered. **173 mobile tests, 262 backend tests, six real-database/HTTP scenarios, TypeScript, release checks and both platform exports passed**; lint has zero errors/31 pre-existing warnings. M4 adds no migration, but compatible backend deployment and prior M2/M3 migrations are required before mobile distribution. Native accessibility/visual acceptance, clinical scoring review and historical water/step attribution remain open. No production data, deployment or TestFlight build touched. [Changes, files, evidence and limits](UX_MILESTONE_4.md). M5 requires owner approval.

**Approved UX beta release — October 16, 2026:** Owner authorized pushing both repositories, an iOS build and then Milestone 5. Release checkpoint contains completed M1–M4 work and the manual-only GitHub workflow. Secret-pattern scan and whitespace checks passed; latest verification remains 173 mobile/262 backend tests with local integrity checks. Expo authentication confirmed; no active EAS build found. Backend migration/deployment and cloud build results are pending and will be recorded after verification. Public App Store release is not authorized by this action.

Use this file as the work tracker. Assign an owner to each open item, record evidence when it is completed, and update the status before release.

## Status definitions

| Status | Meaning |
|---|---|
| IMPLEMENTED — acceptance pending | Code exists and the recorded automated/API checks passed where applicable. Staging/device acceptance and the shared release gates still apply. |
| PARTIAL | A material implementation, data-quality or synchronization gap remains. |
| BLOCKED | The feature cannot currently be accepted for production because a required service, dataset or validation is missing. |
| MISSING | Required capability is not implemented or has not been established. |

**No feature is labeled production-approved.** Passing a unit test, HTTP request or native build does not establish complete end-to-end correctness. Priority P0 means resolve before public launch; P1 means resolve before enabling the affected feature, or explicitly defer and disable it.

**Approved beta release result — October 17, 2026:** Mobile `ac80be6` and backend `d8c02a4` pushed. EAS iOS build 7 [finished successfully](https://expo.dev/accounts/sobbani16/projects/fitness-app-mobile/builds/6207b65d-51f6-4609-bf7d-787f4be2edd5); no App Store Connect submission performed. Railway deployment succeeded. After a protected database backup, migrations `20261016160000_unknown_label_nutrients` and `20261016190000_workout_finish` were manually applied (all 21 applied); health returned 200. Railway automatic migration execution remains an open gate. Build 7 contains M1–M4, not M5.

**UX milestone 5 — October 17, 2026:** Local Leo guide, explicit AI context opt-in in enabled builds, account/device dashboard-card choices and reviewed email feedback with optional flattened screenshot redaction. Beta AI remains disabled. 185 mobile tests/42 suites, TypeScript, release check and both platform Hermes exports passed; lint zero errors/30 existing warnings. New native dependencies require a later build and device acceptance; live AI remains unverified. M5 is not pushed or included in build 7. [Changes and limitations](UX_MILESTONE_5.md). Milestone 6 was subsequently approved; see its update below.

**UX milestone 6 — October 17, 2026:** Account-isolated Progress request coalescing, memoized food-entry styling, OS reduced-motion navigation, sheet focus/escape and compact accessible feedback control. Confirmed-action analytics hooks accept only allowlisted names/coarse duration buckets; collection stays disabled with no adapter, transport, persistence or identifiers. 196 tests/45 suites, TypeScript, release check and beta-safe iOS/Android Hermes exports passed; lint zero errors/30 existing warnings. Signed-device visual/accessibility, native attachment delivery, performance profiling and analytics consent/provider setup remain open. M5/M6 remain local and are not in build 7. [M6 report](UX_MILESTONE_6.md) · [Event specification](ANALYTICS_EVENTS.md).

**C09 administrator provisioning — October 17, 2026:** Added an operator-only, read-only-by-default CLI and recovery runbook. Applying requires an independently reviewed account and exact state confirmation; grant, session revocation and audit commit together. 266 backend tests/31 suites passed; dedicated local PostgreSQL/HTTP checks verify CLI refusal/preview, invalid targets, incomplete RBAC, stale review state, rollback, eight competing bootstraps, fresh-login permissions, rejected old/spoofed credentials and recovery. All 21 migrations/RBAC seed applied only to a dedicated disposable local database for this task. No real administrator, production data, deployment, push or new iOS build changed. [Runbook](C09_ADMIN_PROVISIONING.md).

**Verification-email incident — October 17, 2026:** Read-only investigation found three exhausted verification jobs around 12:44–12:45 PM EDT October 16 and 15 failure entries in previous Railway deployment `2dc96040`. Current deployment logs naturally omit those earlier attempts. Sender remains `onboarding@resend.dev`, which cannot email arbitrary testers. Exact historical provider rejection bodies were not retained. Owner provided prashanthsobbani.com; default Resend DNS records are not yet visible. Domain verification/sender configuration and a fresh resend are required; no email, account mutation or deployment performed. [Evidence and resolution](A03_EMAIL_DELIVERY_DIAGNOSIS.md).

**Email DNS recheck — October 18, 2026, 07:22 UTC:** DKIM TXT is now present and both sending CNAMEs match the owner's Resend configuration. Provider Verified status/full DKIM comparison and inbox acceptance remain unconfirmed. No fresh verification job has been requested; the last job exhausted its retries before DNS correction. Confirm Verified in Resend and request a new verification email. No messages or remote changes triggered. [Evidence](A03_EMAIL_DELIVERY_DIAGNOSIS.md).

**Local commit checkpoint — October 18, 2026:** Owner requested committing all pending mobile/backend changes. Checkpoint includes M5/M6, C09 provisioning and email/DNS diagnosis. Whitespace and credential-pattern review passed (only a deliberate dummy connection string in a backend test). Latest implementation evidence remains 196 mobile tests, 266 backend tests and C09 database/HTTP checks; tests were not rerun solely for committing. No push, deployment, email send or cloud build is part of this checkpoint. M5/M6 remain absent from build 7.

## 1. Accounts, profile and personal data

| ID | Feature | Production status | Evidence / current behavior | Remaining work and acceptance condition | Priority |
|---|---|---|---|---|---|
| A01 | Register, sign in and sign out | IMPLEMENTED — acceptance pending | Live registration/login/logout and invalid-login checks passed. | Verify complete signed-app flows, errors and expired sessions against staging. Depends on A03–A06 and shared security gates. | P0 |
| A02 | Password hashing, bearer sessions and secure token storage | IMPLEMENTED — acceptance pending | Hashed passwords; expiring/revocable server sessions; mobile SecureStore; account-switch/expiry tests. | Review auth security, brute-force controls, multi-instance limits and stolen/revoked-session behavior. | P0 |
| A03 | Password recovery and email verification | BLOCKED — external email sender | Resend queue, hosted link pages, mobile recovery/verification gate, expiring single-use links, shared rate limits and reset session revocation. 13 real-database auth tests; 219 backend and 67 mobile tests passed. [Setup and evidence](A03_AUTH_LIFECYCLE.md). | New accounts@prashanthsobbani.com sender deployed, but its latest job exhausted five attempts with no acceptance. October 18 authoritative DNS now has DKIM TXT and both exact sending CNAMEs. Confirm Resend Verified status, request a fresh verification email, and validate actual inbox delivery. [Diagnosis](A03_EMAIL_DELIVERY_DIAGNOSIS.md). | P0 |
| A04 | Account deletion, data export and retention | IMPLEMENTED — acceptance pending | Password-confirmed export/deletion, dependent-record cleanup, retention maintenance, mobile privacy controls and cache cleanup. 11 A04 database tests; Android/iOS bundles generated. [Policy, setup and evidence](A04_ACCOUNT_LIFECYCLE.md). | Verify signed Android/iOS export and deletion; enforce hosting/provider retention and rehearse backup deletion replay. Native builds must include expo-sharing. | P0 |
| A05 | Existing device-ID account migration | IMPLEMENTED — acceptance pending | Independently reviewed, account-bound single-use grants; in-place member-account upgrade; guarded legacy local import. Six database migration tests; prior-app storage fixtures; Android/iOS bundles. [Policy and evidence](A05_LEGACY_ACCOUNT_MIGRATION.md). | Establish independent ownership review and test signed installed-app upgrades. Unprovable claims remain quarantined; populated destinations and privileged accounts require separate review, not automatic merging. | P0 if existing users/data are retained |
| A06 | Per-account storage and isolation | IMPLEMENTED — acceptance pending | Scoped caches, authenticated server ownership, account-switch checks. | Verify two-account/device flows, logout during requests, reinstalls and absence of cross-account data exposure. | P0 |
| A07 | Onboarding and profile editing | IMPLEMENTED — acceptance pending | M4 themed forms, blank required measurements, explicit region permission, discard warning, canonical unit preservation and serialized owned profile updates. Eight concurrent database saves create one weight entry; unit-only changes create none. [Evidence](UX_MILESTONE_4.md). | Signed iOS/Android keyboard, large-font, screen-reader and offline-edit acceptance. Target formulas retain their existing review requirements. | P1 |
| A08 | Weight history and default macro targets | IMPLEMENTED — acceptance pending | Profile writes update weight history and default targets. | Validate target calculations and custom-target preservation with representative profiles. | P1 |

## 2. Food, nutrition and meal planning

| ID | Feature | Production status | Evidence / current behavior | Remaining work and acceptance condition | Priority |
|---|---|---|---|---|---|
| N01 | Meal logging, portions, calories and macros | IMPLEMENTED — acceptance pending | M2 food entry choices, review/repeat, strict primary-nutrient validation, optional fiber preservation and guarded stable-ID saves; 148 mobile tests passed. [M2 evidence](UX_MILESTONE_2.md). | Deploy compatible backend/schema; verify signed iOS/Android diary, corrections, units and totals. | P0 |
| N02 | Offline meal upload/retry and deletion | IMPLEMENTED — acceptance pending | Ordinary meals retain durable outbox and deletion coalescing; label saves now have stable transactional IDs and same-screen retries. | Test network loss/restart on devices. Label-specific draft/retry state is in memory; check recovered diary after an uncertain interrupted scan save. | P0 |
| N03 | Today's meals across devices | IMPLEMENTED — acceptance pending | Pending changes flush before server reconciliation; failed refresh preserves cache; local-day filtering tests. | Verify real two-device updates/deletions and midnight/DST boundaries. | P0 |
| N04 | Older meal history across devices | IMPLEMENTED — acceptance pending | Server hydration for navigable four-week windows; offline cache, pending changes and account isolation preserved. Automated cache-wipe and fresh-session recovery tests pass. | Run signed Android/iOS reinstall and two-device acceptance; see [N04 validation](N04_MEAL_HISTORY.md). | P1 |
| N05 | USDA ingredient search and caching | IMPLEMENTED — acceptance pending | Existing provider integration retained; M2 adds separate search, themed loading/empty/error states and stale-response protection. | Verify live quotas, attribution and signed-device search; provider acceptance not renewed by mocked UI tests. | P1 |
| N06 | Spoonacular recipe search and nutrition | IMPLEMENTED — acceptance pending | Live recipe and nutrition requests succeeded. | Verify production subscription/quota, attribution and UI result/error flows. | P1 |
| N07 | Recipes by ingredients | IMPLEMENTED — acceptance pending | Feature exists and relevant API paths were exercised. | Accept search relevance, quantity handling and unavailable-provider behavior in staging. | P1 |
| N08 | Food recognition from a meal photo | BLOCKED — live acceptance | Photo validation, uncertain/no-food handling, required review and persistent account/global budgets implemented; automated provider/HTTP/mobile tests pass. Server OpenAI key remains absent. | Configure server key; run three-photo live smoke and signed Android/iOS checks in [N08 validation](N08_FOOD_PHOTO_RECOGNITION.md). | P1 |
| N09 | Meal analysis from text | BLOCKED — live acceptance | Text-only UI now uses /meals/analyze; portion basis, uncertainty and required review preserved. Automated HTTP/provider-adapter/mobile tests pass; server key remains absent. | Run live text smoke with server credentials and signed Android/iOS presentation checks; see [N09 validation](N09_TEXT_MEAL_ANALYSIS.md). | P1 |
| N10 | Label OCR | IMPLEMENTED — acceptance pending | Apple Vision/Android ML Kit retained; M2 contextual camera screen and editable text/manual fallback on denied permission; component tests and both platform JS exports passed. | Real camera/OCR accuracy and visual acceptance still pending; historical native builds do not validate this new UI. | P1 |
| N11 | Editable label text, nutrition parsing and portion adjustment | IMPLEMENTED — acceptance pending | Explicit g/ml/serving/package review; unknown nutrients retained; decimal rounding tested; atomic label+meal save deduplicates eight concurrent requests in local PostgreSQL. [M2 evidence](UX_MILESTONE_2.md). | Deploy nullable-nutrient migration/backend before new app. Verify actual labels, volume mass input, multi-column correction, process death and signed iOS/Android UX. | P1 |
| N12 | Bluetooth food scale | BLOCKED — device acceptance | Native BLE adapter and decoding exist; simulated fallback removed. | Test a named supported scale. Standard GATT support does not establish compatibility with proprietary kitchen scales. | P1 |
| N13 | Weekly meal preferences and generation | PARTIAL | API flow works; catalog contains estimated seeded recipe nutrition. | Replace/review catalog with attributable nutrition data; validate preferences and goal fit. | P1 |
| N14 | Meal alternatives, swaps and confirmations | IMPLEMENTED — acceptance pending | API workflows and ownership exercised. | Verify UI behavior and repeated confirmation/unconfirmation. Depends on reviewed N13 data. | P1 |
| N15 | Ingredient shopping list and checked items | IMPLEMENTED — acceptance pending | API exercised; shopping route interception fixed. | Validate aggregation, portions, units, swaps and checked-state persistence. | P1 |
| N16 | Supplement catalog and logging | PARTIAL | Catalog/logging routes exercised. | Review catalog; add durable/idempotent offline handling; verify repeated taps and retries do not duplicate logs. | P1 |
| N17 | Ingredient/condition safety checks | BLOCKED | Safety seed references dummy ingredient IDs and skips missing entries. | Populate reviewed attributes/rules for actual ingredients; validate coverage and unknown-data handling. Keep condition-specific claims disabled until accepted. | P1 |
| N18 | Recent foods and favorite meal/recipe nutrition | IMPLEMENTED — device-local | M2 adds cached recent foods, account-scoped persisted favorites, explicit review/repeat and account isolation tests. Favorite photos are omitted. | Favorites do not sync across devices or survive reinstall; recent foods use cached history. Validate export/deletion and signed-device repeat flows. | P1 |

## 3. Activity, coaching and dashboard

| ID | Feature | Production status | Evidence / current behavior | Remaining work and acceptance condition | Priority |
|---|---|---|---|---|---|
| F01 | Manual workout sessions and sets | IMPLEMENTED — acceptance pending | M3: explicit start/log/finish/review, kg/lb conversion, durable pending-set retries, stable IDs and owned transactional finish; real PostgreSQL concurrency/replay checks passed. [Evidence](UX_MILESTONE_3.md). | Compatible backend and finish migration deployed for build 7. Verify signed iOS/Android offline/restart, two-device history and camera lifecycle. One exercise per workout. | P0 |
| F02 | Exercise calorie estimates and suggested weights | IMPLEMENTED — acceptance pending | Existing heuristic calculations and unit coverage. | Review representative inputs, limits and estimate wording; do not imply measured accuracy. | P1 |
| F03 | Camera pose detection | BLOCKED — device acceptance | Real bundled MediaPipe model, VisionCamera, landmark mapping; iOS/Android builds pass. | Test orientation, visibility, distance, lighting, permissions, backgrounding and performance on physical devices. | P1 |
| F04 | Automatic rep counting and form feedback | BLOCKED — accuracy acceptance | Rep/posture tests pass; real native frames are integrated. | Compare counts/form feedback against observed exercises; calibrate 2D aspect-ratio/view effects and reject low-confidence observations. | P1 |
| F05 | Spoken coaching feedback | IMPLEMENTED — acceptance pending | Speech feedback feature exists. | Verify timing, repeated prompts, mute/volume behavior and app lifecycle on devices. Depends on F04. | P1 |
| F06 | Step tracking | IMPLEMENTED — acceptance pending | Sensor integration, account-scoped storage and explicit Today Connect steps action; loading/unavailable/retry states. | Test permissions, unsupported devices, lifecycle, day rollover and accuracy on iOS/Android; counts may be partial. | P1 |
| F07 | Water, sleep and daily activity stats | PARTIAL | Today water tap guard, local-save feedback, sync-pending state and explicit retry; mocked failure/retry tests passed. | Complete durable offline outbox, cross-device hydration and local-day/UTC reporting; current warnings do not survive restart. | P1 |
| F08 | Dashboard, calorie balance and daily summary | IMPLEMENTED — acceptance pending | Redesigned Today: logged calories/server targets, unknown macro handling, cached diary on failure, theme and quick add. [M1 evidence](UX_MILESTONE_1.md): 130 mobile tests and both platform JS exports passed. | Signed iOS/Android visual, accessibility and live data acceptance; full-app theme adoption continues in later milestones. | P0 |
| F09 | Macro score | IMPLEMENTED — acceptance pending | API paths exercised. | Validate score explanation/calculations against accepted targets and incomplete data. | P1 |
| F10 | Health score, detail/history and progress | PARTIAL | M4 removes deficit/best-day classifications from Progress; score detail explains provisional status and unknown completeness, suppresses invalid values and unreviewed advice. Numeric formulas unchanged. | Clinical rule review and complete-day/finalization contract remain outstanding. Signed-device visual/accessibility acceptance pending. [M4 evidence](UX_MILESTONE_4.md). | P1 |
| F11 | BMR/TDEE and goal recommendations | PARTIAL | Calculation/recommendation endpoints exist and were exercised. | Remove demo profile/calorie defaults or require complete inputs; validate supported profiles and presentation. | P1 |
| F12 | Weather/location suggestions | IMPLEMENTED — acceptance pending | Existing weather integration preserved behind contextual Connect local weather action. | Test denied location permission, unavailable weather and unit consistency on devices. | P1 |
| F13 | AI chat assistant and daily quota | BLOCKED — live AI | M5 local guide works with beta AI off; enabled builds have explicit context opt-in, server quota and guarded retryable sends. Mocked tests pass. | Configure upstream key/budget and verify real responses; native acceptance pending. [M5 evidence](UX_MILESTONE_5.md). | P1 |
| F14 | Progress trends and daily history | IMPLEMENTED — acceptance pending | M4 7/30/90-day comparisons, owned bulk records, unknown-aware averages and selected-day hydration. | Backend deployed with migrations; signed-device/timezone/two-account acceptance pending; legacy water/step attribution remains limited. [Evidence](UX_MILESTONE_4.md). | P1 |
| F15 | Workout favorites, templates and timers | IMPLEMENTED — acceptance pending | M3 account-scoped device-local favorites and single-exercise templates; timestamp elapsed/rest timers. | Native accessibility/lifecycle acceptance; no cross-device template sync or background timer alerts. | P1 |

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
| C09 | Initial administrator bootstrap | IMPLEMENTED — operational acceptance pending | Operator-only preview/apply CLI; verified existing accounts, review-bound state hash, transaction locks, session revocation and atomic audit. Eight concurrent local attempts create one admin; recovery and fresh-login RBAC tested. | Deploy command and rehearse independent operator/reviewer process; no real admin has been provisioned. No public bootstrap endpoint or default credentials. [Runbook and evidence](C09_ADMIN_PROVISIONING.md). | P0 |
| C10 | Audit logs and operational administration | PARTIAL | Audit-log endpoints exercised. | Review event coverage, retention, access and management workflow. | P0 |

## 5. Shared deployment gates

These apply to every feature retained in the release. Feature-level implementation does not bypass them.

| ID | Gate | Status | Required completion evidence | Priority |
|---|---|---|---|---|
| D01 | Production host and database | NOT ESTABLISHED | Selected host; independent staging/production DBs; verified deployment configuration. Owner corrected the beta domain to `fitness-app-backend-production-c5d4.up.railway.app`; `/health` returned HTTP 200 on October 15. Authenticated API/database acceptance and environment isolation remain unverified. | P0 |
| D02 | Secrets, TLS, CORS and proxy configuration | PARTIAL | Server-only secrets, HTTPS mobile API URL, intended CORS origins and verified proxy settings. USDA/Spoonacular keys found locally; OpenAI key missing. | P0 |
| D03 | Schema migrations and seed data | BETA MIGRATED — automation pending | All 21 migrations applied to the beta database during the approved build-7 release after backup; M2/M3 migrations were applied manually. Automatic Railway migration execution remains unverified/ineffective. C09 dedicated local migration/integrity checks also pass. Rehearse rollback and fix automatic migration configuration. | P0 |
| D04 | Dependency security | OPEN | Snapshot: backend 3 high/1 moderate; mobile 28 high/14 moderate; no critical advisories. Refresh audit, assess reachability and resolve or formally review exceptions. | P0 |
| D05 | API hardening and abuse controls | PARTIAL | Headers, validation, body limits and rate limits exist. Review route-specific errors/logging; use shared/edge limits for multiple instances. | P0 |
| D06 | Backups, restore, monitoring and rollback | NOT VERIFIED | Restore drill, readiness monitoring, alerts, previous release artifacts and named rollback owner. | P0 |
| D07 | Automated release checks | PUSHED — cloud acceptance pending | Manual GitHub workflow checks release configuration/types/lint/tests then EAS iOS build and exact-build submission. Pushed in ac80be6; hosted workflow not run/verified and EXPO_TOKEN setup remains unverified. [Setup](GITHUB_TESTFLIGHT_WORKFLOW.md). | P0 |
| D08 | Signed release apps | IOS BUILD PASSED — acceptance pending | Latest signed iOS build 7 (M1–M4) finished successfully, not submitted. Earlier build 5 uploaded and owner screenshot confirmed processed/assigned to internal group. M5/M6 need a later build; signed-device acceptance and signed Android release remain pending. See TESTFLIGHT_RELEASE.md. | P0 |
| D09 | Physical-device and full UI acceptance | PENDING | iOS/Android happy paths, failure states, permissions, offline recovery and accessibility signed off. | P0 |
| D10 | Privacy, data handling and distribution | PENDING REVIEW | Published/accepted disclosures, deletion/retention process, provider handling, model attribution and applicable store submission requirements reviewed. | P0 |
| D11 | Public deployment and rollout | NOT PERFORMED | Staging sign-off, production readiness probe, monitored staged rollout and rollback availability. | P0 |

## 6. Verification already completed

| Check | Recorded result | Limit |
|---|---|---|
| Backend unit suite | Latest C09: 31 suites / 266 tests passed | Plus dedicated real PostgreSQL/HTTP CLI, concurrency, rollback, recovery and authenticated RBAC checks. Earlier M4 six-scenario evidence retained. |
| Mobile unit suite | Latest M6: 45 suites / 196 tests passed | Does not establish native sensor accuracy, visual/accessibility acceptance or complete UI behavior. |
| Live backend HTTP | 109/109 route signatures exercised; 136 checks; 3 AI checks blocked | Expected rejection tests count as passes; route coverage is not exhaustive input/branch coverage. |
| Database migrations | Latest M3: 21 applied to isolated localhost PostgreSQL | M2/M3 remote deployment not performed; production migration rehearsal still required. |
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

## Milestone 5 additions

| ID | Feature | Status | Evidence | Remaining work | Priority |
| --- | --- | --- | --- | --- | --- |
| UX05A | Dashboard card personalization | IMPLEMENTED — acceptance pending | Account-scoped device choices, persisted confirmation and storage-failure tests. | Native/account-switch acceptance; no cross-device preference sync. [Evidence](UX_MILESTONE_5.md). | P1 |
| UX05B | Reviewed feedback and screenshot redaction | IMPLEMENTED — acceptance pending | Email draft, allowlisted screen context, text redaction and explicit flattened-image approval; mocked tests pass. | New native build, received-image pixel verification and iOS/Android email lifecycle testing. [Evidence](UX_MILESTONE_5.md). | P1 |

## Milestone 6 additions

| ID | Feature | Status | Evidence | Remaining work | Priority |
| --- | --- | --- | --- | --- | --- |
| UX06A | Core-flow performance and accessibility polish | IMPLEMENTED — acceptance pending | Duplicate Progress reads coalesce per account/window; reduced-motion subscription and sheet accessibility regression tests pass. | Signed iOS/Android VoiceOver/TalkBack, large fonts, focus restoration and measured performance profiling. [Evidence](UX_MILESTONE_6.md). | P1 |
| UX06B | Privacy-conscious product measurement | PARTIAL — collection disabled | Allowlisted action hooks and coarse entry duration, no sensitive properties; tests cover payload stripping, failures and confirmed completion. | Consent-aware provider, retention/deletion rules, correlation/unique-user metrics, native crash reporting and support resolution evidence. [Contract](ANALYTICS_EVENTS.md). | P1 |
