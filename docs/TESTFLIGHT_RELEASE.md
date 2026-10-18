# TestFlight beta release evidence

Latest update October 17, 2026. Earlier dated sections below are historical checkpoints.

## Latest approved build

Mobile `ac80be6` and backend `d8c02a4` were pushed for the approved M1–M4 beta release. [EAS iOS build 7](https://expo.dev/accounts/sobbani16/projects/fitness-app-mobile/builds/6207b65d-51f6-4609-bf7d-787f4be2edd5) finished successfully using the `testflight` profile. No submission of build 7 to App Store Connect has been performed. Public release remains deferred. M5 changes are local and not in this build.

Railway deployment `2860d9ab-87c3-45e3-850d-0cff3e1c25d1` succeeded at `d8c02a4`. Automatic pre-deploy migration execution did not apply the pending migrations. After a protected local database backup, `20261016160000_unknown_label_nutrients` and `20261016190000_workout_finish` were applied using Prisma migrate deploy; all 21 migrations are applied. `/health` returned HTTP 200. This is not signed-device acceptance. Automatic Railway migration configuration remains an open gate.

## Historical preparation checkpoints

## Current scope and latest backend evidence

TestFlight beta only. Public App Store release is deferred until a later, separately approved task. On October 15, 2026 at 02:48 UTC, the corrected backend `/health` returned HTTP 200 and `{"status":"ok"}` (plus a timestamp). This supersedes the old-domain connectivity blocker, but does not establish authenticated API or database acceptance. Historical 404 results below refer to the superseded URL.

Use the `testflight` build and submission profiles. Their inherited `production` profile/environment and `store` distribution are build configuration names; they do not authorize public release. No cloud build or submission has been executed. Privacy-policy content corrections and the remaining beta acceptance gates still apply.

## Confirmed owner values

- App Store Connect name shown in owner screenshot: Humai Fitness App.
- App Store Connect numeric Apple ID: `6822982480` (read from screenshot).
- Apple Team ID: `8FQ5RQS3P8`.
- Existing bundle identifier preserved: `com.sobbani.fitnessappmobile`.
- Support email: `sobbani.prashanth@gmail.com`.
- Owner-selected beta backend (corrected): `https://fitness-app-backend-production-c5d4.up.railway.app`.
- Privacy-policy URL: `https://sobbani16.github.io/humai-privacy/` (HTTP 200, configured in the inherited TestFlight build environment). Content corrections remain required.

`app.json` sets the iOS Apple team. `eas.json` sets the production submission app/team IDs, production support email, and preview/production backend URL. The testflight profile inherits production settings. These are public configuration values, not signing credentials. Existing Expo name/slug/project identity remain unchanged.

## Verification of supplied values

Read-only HTTPS requests to the backend root and `/health` both returned HTTP 404 with an HTML Not Found page. The local Express application mounts `/health`, so the selected deployment has not been verified as this API. Check Railway project/service/environment selection, deployment logs, public-domain routing and service port. A successful health response alone will still not prove authentication or persistence works.

The local TestFlight release configuration check now passes with the supplied public privacy-policy URL. This configuration update does not establish signed-device or live authentication acceptance.

## Remaining release gates

1. Health connectivity now passes. Verify database migrations, email lifecycle configuration and authenticated API flows against the selected beta backend.
2. Correct the published privacy policy to reflect actual beta collection, providers, retention and deletion; resolve the placeholders described below. The URL is now configured.
3. Complete native release validation and signed physical-iPhone acceptance. Prior local tests do not establish TestFlight readiness.
4. Replace/review the existing placeholder app icon and review App Store privacy disclosures, beta review information and reviewer account access.
5. Review dependency audit findings and native-library compatibility warnings before external testing.

## Commands after release gates are satisfied

Run from the mobile repository. EAS is already configured; do not recreate the project.

```sh
npx eas-cli login
npx eas-cli whoami
npx eas-cli project:info
npm run typecheck
npm run lint
npm test -- --runInBand
npm run release:check
```

The privacy-policy URL is set in the production build profile and inherited by TestFlight, including for the local release check.

Only after explicit owner approval, manage signing and start a cloud build:

```sh
npx eas-cli credentials --platform ios
npx eas-cli build --platform ios --profile testflight
```

After reviewing the completed build, and with explicit submission approval:

```sh
npx eas-cli submit --platform ios --profile testflight
```

Select the intended build interactively. Authenticate with Apple directly; never put Apple passwords, verification codes, private signing keys or backend API secrets in this repository.

After Apple processes the upload, use App Store Connect → app → TestFlight to supply test information, create an internal tester group and assign the build. External testing requires the applicable beta review before inviting external testers. Testers install Apple's TestFlight app and accept their invitation. Use TestFlight feedback and the configured support inbox for reproducible reports including build number, iPhone/iOS version, steps, expected result and actual result.

## Follow-up: health recheck and privacy-policy hosting

At 2026-10-15 02:45 UTC, a fresh HTTPS GET to the supplied backend `/health` returned HTTP 404 with an HTML Not Found response. No live backend acceptance established.

Create a reviewed policy describing the app operator/contact, actual data collected and purposes, providers and sharing, retention (including backups), export/deletion, optional permissions, intended age group and policy updates. Do not claim unverified retention periods or describe disabled beta features as active collection.

For a standalone policy page, use a separate public GitHub repository containing only the public policy, with an `index.md` or `index.html` entry file. In repository Settings → Pages, choose Deploy from a branch, main, root, and Save. Use the actual HTTPS URL GitHub provides; verify it opens without signing in. Do not publish the application source or internal handoff docs to host a policy.

Once reviewed and hosted, enter the URL in App Store Connect App Privacy and configure `EXPO_PUBLIC_PRIVACY_POLICY_URL` for production EAS builds. Rebuild to embed the configured in-app link. A policy URL does not replace accurate App Store privacy disclosures.

References: [Apple privacy requirements](https://developer.apple.com/app-store/review/guidelines/#privacy), [GitHub Pages creation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Published privacy-policy verification — October 15, 2026 UTC

The owner-supplied GitHub Pages URL returned HTTP 200 over HTTPS without authentication. `eas.json` now supplies `EXPO_PUBLIC_PRIVACY_POLICY_URL` to production and inherited TestFlight builds; the existing in-app privacy link consumes this value. `EAS_BUILD_PROFILE=testflight npm run release:check` passed. This is configuration validation, not privacy-content approval or signed-device acceptance.

The hosted policy remains a draft in substance:

- It describes Apple Health/HealthKit integration, which is not implemented in the current app; step tracking uses Expo Sensors.
- It discusses microphone/voice interaction although microphone permission is disabled in the current configuration.
- It describes account deletion as under development. In-app export/deletion code exists; live deployment/device acceptance is still pending and must not be claimed complete.
- AI features are hidden by the current beta safe-mode settings; distinguish the released beta behavior from future AI functionality, and describe on-device label OCR separately from server AI processing.
- Several sections explicitly require confirmation before publication (provider transmission, retention, deletion procedures and age eligibility). Resolve these against actual operational practices; do not invent backup deletion guarantees.

The external policy repository and App Store Connect settings were not modified. No cloud build or submission was started.

## Policy revision recheck — October 15, 2026 UTC

The updated public policy is live. Earlier pre-publication placeholders were removed, HealthKit and microphone are described as disabled, and deletion is described as implemented with beta verification pending. The previous findings above are historical.

Remaining implementation-alignment findings: section 4 groups label scanning and exercise posture analysis with disabled AI features, but label scanning remains available with local Apple Vision OCR; exercise posture functionality is not gated by the server-AI beta flag. Clarify on-device processing separately from disabled server AI. Section 12 should reflect the current adult-only onboarding (age 18–120), rather than suggesting supervised minor use. Operational retention/provider disclosures still require owner verification; this check is not legal approval. No cloud build or submission authorized or performed by the owner's “done” message.

## Latest policy recheck — October 15, 2026 UTC

Verified the owner's next published revision: section 4 now distinguishes available on-device label scanning/posture processing from disabled server AI, and section 12 explicitly limits the beta to adults aged 18+. Both requested corrections are live; earlier findings above are historical. Section 5 still uses the broader wording “AI-powered features are hidden or disabled”; qualifying this as “server-based AI features” would keep it consistent with section 4. No change to the hosted policy was made by this task.

The privacy URL remains configured. This review establishes the two requested text corrections, not a comprehensive privacy/legal certification. Native release validation, live authenticated flows and signed-device acceptance remain pending. No build or submission was initiated or authorized by “Done.”

## Approved build attempt — October 15, 2026

Owner explicitly authorized the TestFlight cloud build, submission after success, and internal testing setup. Retried with the installed Node/npm tooling after the temporary Node path caused npm ENOENT. `npx --yes eas-cli whoami` reached EAS but exited with `Not logged in`. The next required step is owner authentication with `npx --yes eas-cli login` in their local terminal, followed by `npx --yes eas-cli whoami`. Do not share credentials or verification codes in chat. No cloud build has been created, no submission performed and no internal tester configured. Existing authorization persists after authentication.

## Authenticated build attempt — October 15, 2026

Expo login verified as `sobbani16`; local TestFlight release configuration check passed. The approved non-interactive iOS build incremented remote build number 1→2 and created the TestFlight update channel/branch, then failed because signing credentials were not configured. An interactive retry incremented 2→3; declining optional Apple login still led to a required Apple Developer login prompt. The prompt was canceled without entering Apple credentials. No cloud build artifact or submission was produced, and internal testing setup remains pending.

Owner must run `npx --yes eas-cli build --platform ios --profile testflight` in their own terminal and authenticate with Apple directly, completing required signing setup. Existing approval for TestFlight build/submission persists. Remote build numbers 2 and 3 were consumed by setup attempts; this is expected with auto-increment. No public App Store release was performed.

## Configure expo-updates failure and fix — October 15, 2026

Build 4 (`61223f62-671f-4e5c-9168-554dad1fdb3c`) failed before native compilation: local runtime fingerprint differed from the cloud fingerprint. EAS logs showed exactly one config difference: `updates.enabled` was absent locally and false on the builder. The profile-dependent branch in `app.config.js` caused the mismatch.

Moved `updates.enabled: false` into static `app.json` and made the dynamic config pass through unchanged. Kept the fingerprint runtime policy; OTA remains disabled consistently across profiles. Verified resolved Expo configs are identical with no EAS_BUILD_PROFILE and with development, preview, production and testflight. Local TestFlight release checks passed. Added a regression guard to `scripts/verify-release.cjs` after the replacement upload, so this additional guard applies to subsequent builds (the replacement already contains the config fix).

Replacement TestFlight build 5 was uploaded using existing remote signing credentials: https://expo.dev/accounts/sobbani16/projects/fitness-app-mobile/builds/153aa078-235d-4cd9-a777-38384a1cfba0 . Build acceptance and submission remain pending until its final result. Public App Store release remains deferred.

## Signed build success and submission — October 15, 2026

Replacement build 5 completed successfully (`153aa078-235d-4cd9-a777-38384a1cfba0`, version 1.0.0). EAS passed Configure expo-updates, CocoaPods, JavaScript bundling and the signed archive build, producing an IPA. Expo Doctor still reports the existing React Native Directory metadata warnings (16/17 checks); physical-device behavior remains unverified.

Submitted that exact build using the owner's existing Apple session. EAS generated and stored an App Store Connect API key with the App Manager role for submission; no private key was written into the repository. Submission `727256fe-7cb6-42f5-96a3-e802e54a4763` is scheduled and waiting for an EAS submission worker: https://expo.dev/accounts/sobbani16/projects/fitness-app-mobile/submissions/727256fe-7cb6-42f5-96a3-e802e54a4763 . Apple processing and internal testing are not yet confirmed.

Browser automation could not initialize (sandbox metadata connection error), so internal tester setup was not performed. After Apple processing, open App Store Connect → Humai Fitness App → TestFlight → Internal Testing; create/select an internal group, add the owner and version 1.0.0 build 5, then accept the invitation in TestFlight on the owner's iPhone. Public App Store release remains deferred.

Submission remained queued for an available EAS submitter during monitoring. The local waiting command was stopped with Ctrl+C; the scheduled cloud submission was not canceled. Use the submission URL above for the final result. Do not create a duplicate submission while this one is queued.

## Upload completion confirmed — October 15, 2026

Read-only EAS SubmissionQuery verified submission `727256fe-7cb6-42f5-96a3-e802e54a4763` status FINISHED with no error. The signed build upload is complete; earlier queued status is historical. The owner's App Store Connect screenshot confirms internal group `test` exists with one tester, but shows No Builds and zero assigned builds. Apple processing/availability is not yet verified. Once build 1.0.0 (5) appears, assign it through the group's Builds tab. Do not rebuild or duplicate the upload solely because the current screenshot shows no builds.

## Apple processing and group assignment confirmed — October 15, 2026

Owner screenshot shows version 1.0.0 build 5 with Ready to Submit status, the TE group badge and one invitation. Apple processing and internal group assignment are now evidenced. No installs or sessions are reported in the screenshot; physical-device acceptance remains pending. Apple's build-status reference confirms Ready to Submit permits internal testing without external beta review: https://developer.apple.com/help/app-store-connect/reference/app-uploads/app-build-statuses . Next: accept the invitation on an iPhone with TestFlight installed and install build 5. Public App Store release remains deferred.

## Physical-device sign-in failure — October 15, 2026

Owner reports registration/login fail with Not found in TestFlight build 5 and requests a production beta test account. Reproduced both POST `/auth/register` and POST `/auth/login` with empty JSON: HTTP 404, `Not found`. No account or session created.

Read-only Railway status identifies active deployment `b8e88bbe-9767-4b39-a55f-93f566f3c968`, commit `da84fabb5a717662b48c0a9200f57f5c0089b178`. Inspection of that commit confirms legacy device-ID ensureUser middleware and no mounted auth routes. Current local code has email/password auth, but has not been deployed. Health 200 was insufficient evidence of API compatibility.

A names-only check of deployed variables found DATABASE_URL and food-provider keys but no authentication lifecycle/email settings. Current backend startup requires AUTH_LINK_SECRET, AUTH_PUBLIC_URL, RESEND_API_KEY and AUTH_EMAIL_FROM; configure the exact required HTTPS origin and verified sender before deployment. Schema migrations must be reviewed/applied safely to retained production data. Do not bypass auth or mark arbitrary email addresses verified to work around absent routes. Account creation and credential sharing remain blocked until compatible backend deployment and verification. No production data/settings changed by this investigation.

## Backend push and rebuild — October 15, 2026

Pushed backend commit `8c6a99acf6d31819dcbe0b8741e667e902d5d67d` to origin/main, including the existing local authentication/ownership/lifecycle code, migrations and guarded Railway deployment configuration. Railway automatically started deployment `be9f0aaf-5dd7-4cea-8919-3e62575bfd11`; observed status BUILDING. 240 backend tests and 37 disposable local database integration tests passed before the push. Native build 5 need not be replaced to pick up server auth routes at its existing URL.

Configured missing AUTH_LINK_SECRET (generated securely) and AUTH_PUBLIC_URL on production backend service with deployment triggering disabled. The last names-only check still showed RESEND_API_KEY and AUTH_EMAIL_FROM absent; owner's screenshot also showed only the original three variables. Those must be entered on the backend service and applied. Pre-deploy validates configuration before migrations/RBAC seed, so missing email settings block activation. No beta credentials issued; live authentication must be verified after successful deployment. No mobile commit/push or new iOS build was performed by this backend repair task.

## Deployment startup failure confirmed by owner screenshot

Deployment be9f0aaf is CRASHED. Startup explicitly reports missing RESEND_API_KEY and AUTH_EMAIL_FROM. The screenshot shows npm start was reached, so the earlier expectation that pre-deploy validation would prevent activation was not established; investigate effective Railway config and migration execution before claiming readiness. Do not bypass verification or insert a user as a workaround. Owner must supply the Resend key and verified sender securely on the backend service, then deployment/migration and live auth checks must be repeated. No usable test credentials have been created.

## Restart prerequisite check — October 15, 2026

Owner requested restart after adding settings. A fresh explicit production/backend variables check still returned RESEND_API_KEY and AUTH_EMAIL_FROM absent, with AUTH_LINK_SECRET and AUTH_PUBLIC_URL present. Project 72ff6426-7542-4d95-8921-89131cd4146d, service f18836f0-d04b-494c-924b-ad3e71c00785; latest deployment CRASHED and effective fileServiceManifest empty. Saved the owner-selected AUTH_EMAIL_FROM sender (Humai Fitness <onboarding@resend.dev>) directly with deploy triggering disabled. API key remains required before a useful restart; no restart triggered in this check. Effective Railway config still needs correction/verification for migrations and healthcheck before claiming successful rollout.

## Live authentication restored — October 16, 2026 UTC

After successful backend startup, auth still returned 500/P2010 because 11 migrations were missing. Created a restricted-permission local database backup at /private/tmp/humai-pre-auth-migrations-v2.dump before changes. Applied all 11 pending migrations using prisma migrate deploy and ran the idempotent RBAC seed (7 roles, 32 permissions, 53 mappings). All completed successfully; no reset or dummy-data seed used.

Live empty-payload login/register now return 400 with Valid email required. Created the owner-requested beta account through normal /auth/register (201), and verified /auth/login (200). Email verification remains required; no verification bypass or administrator privileges assigned. Credentials are not stored in repository documentation. No mobile rebuild required.

Remaining deployment hardening: Railway effective fileServiceManifest was empty despite committed railway.json; automatic pre-deploy migration execution was not verified and migrations were applied explicitly. Logs also reported the forwarded-header/trust-proxy configuration warning; validate the Railway proxy path before configuring trust. Physical-device happy-path acceptance, inbox verification and retention/backup operations remain pending.
