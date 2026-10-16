# A04 — Account deletion, export and retention

Implementation and verification: October 14, 2026. **Implemented — acceptance pending.** No production database was changed. Native-device and hosting/provider retention acceptance remain open.

## User flow and API

“Account privacy: export or delete” is available in the profile editor, onboarding form and unverified-account screen. Both operations require the current password. Deletion also requires typing `DELETE` and confirming a destructive native alert. Unverified users can export/delete without first verifying email.

| Endpoint | Authentication | Behavior |
|---|---|---|
| `GET /me/account/retention` | Bearer session | Returns the versioned retention policy. |
| `POST /me/account/export` | Bearer session + `{password}` | Returns a JSON attachment from a repeatable-read database snapshot. No export file is stored on the server. |
| `POST /me/account/delete` | Bearer session + `{password, confirmation: "DELETE"}` | Atomically deletes account data and revokes sessions; returns completion only after commit. |

The account is always selected from the authenticated session, never a body/query user ID. Reauthentication checks the session again inside the transaction to reject sessions revoked during the request. Operations are limited to five attempts per account/operation per 15 minutes using PostgreSQL counters. Responses have `Cache-Control: no-store`; account routes are excluded from request access logging.

Mobile export adds account-scoped local records, including unsynced meal outbox entries, and opens the native file share sheet. The JSON includes health information; the user chooses its destination. Temporary export files are deleted after sharing (including errors) and on the next app startup. It uses Expo SDK 54 [FileSystem](https://docs.expo.dev/versions/v54.0.0/sdk/filesystem/) and [Sharing](https://docs.expo.dev/versions/v54.0.0/sdk/sharing/), supporting Android and iOS. Adding `expo-sharing` requires rebuilding the native app; an OTA JavaScript update alone is insufficient.

## Data coverage

Export includes profile/health information, allergies, conditions, weight/activity/sleep/water logs, meals, workouts and sets, supplement/ingredient selections and logs, recommendations and safety records, roles, personal coach/creator profiles, recipes and ingredients, macro/health scores and contributors, weekly planning/reviews/shopping/inventory, notifications, scanned label records, usage counters, safe session/email-action metadata, assigned plans and client-visible coach notes. Client-authored drop forms are included.

Password hashes, bearer tokens, token hashes, signing secrets, private coach notes about the user, other clients’ records, and internal administrative audit snapshots are excluded. User-created exports include photo references, not embedded image binaries. Saved copies and copies shared to other apps are controlled by the user.

Deletion removes every registered user-owned model, including indirect children. The tests maintain an explicit schema classification so newly introduced models require review. Special handling covers:

- Restrictive exercise-set dependencies before deleting workout sessions.
- Supplement logs/selections, recommendation violations, health-score contributors, weekly-plan children, shopping lists and review recommendations.
- Trainer/nutritionist/creator profiles, memberships, waitlists, drop forms, assigned plans and authored/client coach notes. Deleting a coach removes their associated assignments/plans/notes from the service; it does not delete client accounts or their independently held health logs.
- Auth sessions and queued email links; account/email-specific rate buckets.
- Audit records where this user was the actor **or subject**, including references in snapshots and owned record IDs. Matched audit rows are removed in full; they are not retained with unreviewed free-text/JSON payloads.
- Authored recipes and ingredients. Other members’ existing weekly meal snapshots remain, with the deleted recipe reference cleared.

Shared food/supplement/ingredient catalogs, safety rules, role definitions and other accounts’ independent records remain. The application has no managed server-side photo bucket in the current schema; deleting a photo URI does not remotely delete an external asset.

PostgreSQL owner guards protect new writes to legacy tables without User foreign keys. In-flight writes take a key-share lock; deletion waits and then removes them, or writes fail after deletion. Additional guards cover waitlist trainer references, non-system recipe creators, late audit writes referencing a deleted user ID and same-ID user restoration. Existing orphan rows from legacy data are not silently migrated to an account. Audit deletion briefly serializes audit writes and can delay concurrent administrative actions. Failures roll back the entire deletion.

## Retention policy v2026-10-14

These are application defaults, not a statement of regulatory compliance. No alternate retention preference was supplied during implementation.

| Data | Rule | Enforcement |
|---|---|---|
| Live account and owned/dependent data | Delete on successful transaction commit; no grace period | Implemented and tested. |
| Deletion receipts | User ID, deletion time, expiry only; 35 days | Implemented; hourly maintenance removes expired receipts. No email, credentials or health data. |
| Server export files | None retained | Export is generated directly in the response. Online exports are limited to 50 MiB and a 60-second transaction; larger exports fail rather than silently truncating. A reviewed operator-assisted export is required for larger accounts. |
| Temporary mobile export | Delete after native share flow; retry cleanup on startup | Implemented. User-saved copies are outside app control. |
| This device’s account caches/outbox | Remove after confirmed deletion; durable cleanup task retries after restart | Implemented. Writes for the removed account are blocked to prevent late persistence. |
| Referenced camera/picker cache images | Delete owned app-created copies, preserving copies referenced by another cached account | Implemented for Expo `ImagePicker` and `Camera` cache directories. Photo-library originals, external URLs and unreferenced OS-managed cache files are not removed. |
| Other devices | Clear caches when the revoked session next contacts the API | Implemented for invalid-session responses. Offline devices and device/OS backups cannot be remotely erased. |
| Expired auth sessions | Remove during hourly maintenance | Implemented. |
| Email action records | Remove seven days after expiry | Implemented; account deletion removes them immediately. Already-delivered/in-flight emails cannot be recalled. |
| Remaining shared abuse-control buckets | Remove one day after expiry | Implemented. IP/subnet counters are not deleted with an individual account. |
| Hosting backups and operational logs | Maximum 30 days; tightly restrict access | **Deployment requirement, not verified or configured here.** |
| Email/AI provider copies | Minimize logging/retention and establish provider deletion procedure | **Provider-specific acceptance pending.** No provider credentials or administrative access were available. |

Maintenance is invoked hourly by the existing backend worker in `src/services/authEmail.js`; the implementation lives in `src/services/accountRetention.js`. It requires the persistent backend process and its valid email configuration. Monitor failed maintenance runs. TTL deletion may run up to an hour after the listed expiry and can be delayed during outages.

Backup restoration procedure: keep an access-restricted copy of the deletion ledger independent of database snapshots, restore into an isolated environment, reconcile **all** post-snapshot deletion receipts and erase the corresponding account/dependent records, and verify no revoked account is present before accepting traffic or restarting workers. Do not restore the deletion ledger from the same stale snapshot and assume it is current. The User insert guard is supplemental protection when the current receipts are present; it is not an automatic backup replay service. Hosting must implement and rehearse this process before release.

## Deployment and validation

Apply backend migrations `20261013140000_account_lifecycle` and `20261013150000_account_dependency_guards`, regenerate Prisma, and deploy the matching backend before releasing the app. The new write guards intentionally reject writes for nonexistent accounts; review existing admin/import jobs that previously wrote orphan IDs.

```sh
# Backend, Node 22:
npm run db:generate
npm run db:deploy
npm test -- --silent

# Dedicated disposable localhost database ONLY; integration tests truncate fixture tables:
DATABASE_URL=postgresql://YOUR_USER@127.0.0.1:55432/fitness_auth_readiness npm run test:auth

# Mobile:
npm test -- --runInBand --silent
npx tsc --noEmit
npx expo export --platform ios --platform android
```

Local evidence:

- Backend regression: 26 suites / 219 tests passed.
- Account/auth integration: 24 tests (11 A04 and 13 A03), using real PostgreSQL/Express and no authentication bypass. Includes all-model ownership coverage, password/confirmation requirements, unverified-account access, export isolation/secrets, deletion and dependent-record removal, coaching/creator cases, rollback, late writes, restoration rejection, rate limits and TTL maintenance.
- Mobile: 13 suites / 77 tests passed, including export sharing/cleanup, confirmation and error handling, isolation, late cache writes, pending cleanup recovery and safe photo-cache cleanup.
- TypeScript passed. Android and iOS Hermes bundles generated successfully in `/private/tmp/fitness-a04-export`.
- Native compilation, real iOS/Android share sheets, physical-device cache/media erasure, OS background/restart behavior and signed builds have **not** been accepted. Bundle generation and mocked native-module tests do not establish native behavior.

The temporary PostgreSQL cluster became unavailable during a final rerun when its data directory disappeared. It was recreated and all migrations and the expanded suite were rerun against a fresh database. No application/production database was used.

Release acceptance: verify both signed platforms; export with unsynced records, cancel/save/fail the share sheet, delete member and coach accounts, retry after network loss, restart during local cleanup, verify another device is rejected, and confirm backup/log/provider retention plus the restoration procedure with the hosting owner.
