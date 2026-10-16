# A05 — Existing device-ID account migration

Implemented October 14, 2026. **Implemented — acceptance pending**, with a deliberately restricted migration policy. No real user account was migrated.

## Policy and ownership proof

The previous app generated `dev-<timestamp>-<random>` in AsyncStorage under `fitness.deviceId.v1`. The backend created a passwordless User with that ID and `<device-id>@device.local`. Requests supplied the ID as authorization. There was no separate installation secret, verified email, cryptographic device key or password with which to establish ownership retroactively.

**A device ID is an identifier, not proof.** Possession of the app installation, cached health records, screenshots, knowledge of old records, or verification of a newly supplied email alone must not authorize a claim. The new API never restores device-header authorization and does not expose account lookup by legacy ID.

Legacy records are retained and remain inaccessible to unauthenticated requests. Migration requires an operator to independently establish historical ownership, then issue a code bound to a verified destination account. Acceptable evidence is a genuinely preexisting verified contact channel from an independent authoritative record, or an independently substantiated support review. The operator must record a non-sensitive ticket/reference in the grant; the service cannot itself validate that external evidence. A code is not issued merely because the claimant requests it.

If there is no independent evidence, **decline the migration and preserve the account in quarantine**. Do not invent evidence or treat the code workflow as proof of historical ownership. Establishing a real support review process and approved evidence sources is a release requirement; this implementation does not create a staffed support service or a historical proof source that never existed.

## Supported path

1. Register a new account and verify its email. Do not complete onboarding or create new data yet.
2. On an upgraded installation, the migration screen appears before onboarding when the old device-ID key is present. It displays the reference ID for the ownership review. Skipping leaves old records separate and does not transfer them.
3. After independent review, an authorized operator issues a 30-minute, single-use code for this specific verified destination account. The code is delivered through the independently established channel.
4. The user enters the code and their current account password. The server checks verified email, current session, password, grant binding, expiry, eligibility and destination emptiness inside a transaction.
5. The server upgrades the legacy User **in place** with the verified email and password hash. The empty destination registration is removed; all legacy record IDs and dependent references remain intact. All preexisting sessions and queued auth emails for both accounts are revoked. A new bearer session is returned with the legacy account ID. The only resulting role is MEMBER.
6. The app scopes matching local records to the now-authenticated legacy account ID. If the response or secure-storage write is lost, sign in again with the same verified email/password and select “Finish importing old device records.”

For a replacement device, the manual entry is available under **Account privacy → Restore an old device account**. Only independently approved server records are restored; the old device’s local-only data cannot be fetched from a replacement device.

Only passwordless, unverified `dev-*` accounts with the exact generated `@device.local` address qualify. Privileged roles, trainer/nutritionist/creator profiles, and destination accounts with existing profile/data/relationships require a specialist review and are rejected by this automated path. No automatic merge, role inheritance, destructive overwrite or cross-account conflict resolution is performed. A separately reviewed merge implementation would be required to support those cases.

Existing historical data came from a system that trusted device IDs; ownership review cannot establish that every historical write was authentic. Operators must account for that limitation when reviewing disputed records.

## Operator procedure

Apply migration `20261014100000_legacy_migration` and regenerate Prisma. Use a trusted administrative environment with the intended database configuration. No public HTTP grant-issuance endpoint exists.

After independently completing the review:

```sh
node scripts/issue-legacy-migration.js \
  --legacy-id dev-OLD-INSTALL \
  --target-email verified-owner@example.com \
  --proof-type independent-support-review \
  --evidence-reference REVIEW-TICKET-12345 \
  --attest-independent-review yes \
  --output /secure/operator-location/migration-code.txt
```

Proof types: `preexisting-verified-contact` and `independent-support-review`. These are operator attestations, not automatic evidence validation. Use a real legacy ID; the command above is illustrative. Do not put health data, documents, passwords or other secrets in the evidence reference.

The output file is created exclusively with mode 0600. The secret code is never printed to stdout or stored in plaintext in the database. Deliver it only through the approved channel and remove the operator’s temporary file according to the review procedure. Reissuing invalidates earlier unconsumed grants. Grant issuance locks both accounts and redemption rechecks eligibility. Operator database access is privileged and must be separately controlled and audited in hosting.

API: `POST /me/legacy-migration/redeem` with bearer authentication and `{token, password}`. Requests are limited to five attempts per authenticated account per 15 minutes. A grant cannot be applied to another destination account. Simultaneous redemption permits one success. Errors do not consume the grant unless the transaction succeeds. Auth/account migration requests are excluded from access logging; responses are non-cacheable.

Grant rows contain hashed tokens, source/destination IDs, proof type, non-sensitive evidence reference and timestamps. They are removed seven days after expiry by hourly retention maintenance and immediately when the related account is deleted. The migration rate bucket is included in account deletion cleanup. Backup restoration must account for migrations as well as deletions; do not restore old authentication/session state into live traffic without reconciliation.

## Upgrade and local data handling

The importer recognizes the actual prior-app key formats:

- `fitness.profile.v1`
- `fitness.meals.v1.YYYY-MM-DD`
- `fitness.dailyStats.v1.YYYY-MM-DD`
- `fitness.steps.v1.YYYY-MM-DD`

The authenticated, verified server account ID must match the saved legacy ID before any local copy is permitted. No ID supplied in an API body or local profile is treated as authorization. Copies go to `<authenticated-id>:<old-key>`. All originals are kept until the full copy succeeds. Retries accept identical copies; conflicting or malformed copies are preserved for review rather than overwritten or discarded. Other accounts’ namespaces are untouched.

Old profile goal values use the existing normalization on read. When no server profile exists, the profile provider uses the restored local profile. Local-only meals are tagged `legacy-local`, preserved by reconciliation and not automatically uploaded, avoiding an unreviewed duplicate upload into historical server records. A matching server meal ID becomes a normal synced row. The app does not infer that two different meal IDs describe the same event; existing duplicate representations may require user review.

Account export includes matching, not-yet-imported legacy copies under `legacy-unimported/`. Account deletion removes those copies and the device marker only when they belong to the authenticated migrated account. Unrelated unclaimed device records remain quarantined and are not silently attributed to a new user.

## Verification and release gates

Tests use the dedicated disposable localhost `fitness_auth_readiness` database, which is truncated by the integration suite. Never use production/application data.

```sh
# Backend, Node 22:
npm run db:generate
npm run db:deploy
DATABASE_URL=postgresql://YOUR_USER@127.0.0.1:55432/fitness_auth_readiness npm run test:auth
npm test -- --silent

# Mobile:
npm test -- --runInBand --silent
npx tsc --noEmit
npx expo export --platform ios --platform android
```

Evidence:

- 30 real-database integration tests: six A05 plus all 24 A03/A04 regressions. Covers device-ID denial, explicit proof policy, target binding, password checks, expiry, concurrent redemption/replay, in-place preservation, session revocation, post-migration login, destination conflicts, privileged/unverified rejection, deletion and retention integration.
- 219 backend regression tests passed.
- 86 mobile tests across 15 suites, including prior-app storage fixtures, unrelated-account denial, malformed/conflicting records, interrupted copies, export/deletion coverage and migration screen behavior.
- TypeScript passed; Android and iOS Hermes bundles generated in `/private/tmp/fitness-a05-export`.

The storage fixtures reproduce the previous app’s key layout; they are not a substitute for an installed-app upgrade. Before release, approve and staff the independent ownership-review procedure; inventory legacy accounts and exceptions; rehearse issuance/revocation; and test signed Android/iOS upgrades without uninstalling the prior app. Verify session-response loss, restart during local copy, replacement-device entry, conflicting data and rejection when historical ownership cannot be proven. Native installation upgrades and the real operational proof process remain acceptance pending.
