# N04 — Older meal history across devices

Implemented October 14, 2026. Native installed-device acceptance remains pending.

History now hydrates the displayed 28-day window from authenticated server food logs on focus and pull-to-refresh. Older/newer controls move by four weeks without a fixed history cutoff. Saved meal counts and calories display immediately, including when offline; analysis failures leave those totals visible with a retry message. Streaks and weekly statistics are explicitly scoped to the displayed window. Analysis uses the current profile, not a historical snapshot of targets.

Hydration shares today's serialized meal synchronization. Pending additions/deletions upload first; a failed upload leaves the outbox and cache intact. UTC date requests are deduplicated across local days and run at most four concurrently (28–29 requests for a contiguous four-week window). All requests must succeed before cache replacement begins. Local midnight bounds handle daylight-saving changes. Remote deletions remove cached server records; unuploaded `legacy-local` records remain. Account checks and screen request generations prevent stale responses from displaying another account's data. Existing per-day API responses have no record cap, so no pagination truncates a day's meals.

The existing API is reused; no database migration or new environment variable is required. Date validation now rejects nonexistent dates and repeated date query parameters. Server records restore meal identity, timestamps, names, calories, quantities and macros. Device-local photos and feedback are not uploaded by this feature. Unsynced meals lost by uninstalling cannot be recovered from the server. Exercise history and historical target snapshots are outside N04.

## Automated verification

Passed: 94 mobile tests (16 suites, America/New_York timezone), 219 backend regression tests, 32 PostgreSQL integration tests, TypeScript and both platform exports. Final bundles: `/private/tmp/fitness-n04-export-final`.

- Mobile suite: cache-wipe/reinstall simulation, repeated recovery without duplicates, older-window navigation, offline saved totals, failed upload retention, partial fetch failure preservation, remote deletions, legacy records, account switching and DST midnight boundaries.
- PostgreSQL/HTTP integration: create historical meals, obtain a fresh login/session, recover exact UTC day bounds, isolate a second account even with a spoofed device header, reflect deletion from another session, reject invalid dates and read empty days.
- TypeScript check and Android/iOS JavaScript export. These do not constitute native device tests.

## Installed-device acceptance

1. On a signed Android build, log distinct meals today, yesterday and more than four weeks ago (use authorized staging fixtures for older dates). Wait for successful upload; record IDs, dates and totals.
2. Sign in to the same account on a signed iOS build. Open History, navigate older/newer windows and compare dates/counts/calories. Repeat with the platforms reversed.
3. Uninstall/reinstall, sign in again and verify the same history with an empty local cache.
4. Delete a synced meal on another session, refresh and confirm it disappears. Go offline and verify already-viewed saved totals remain; queue a meal, reconnect and verify exactly one upload.
5. Sign out and into a different account. Confirm none of the first account's history appears. Repeat in a timezone west of UTC and across a DST boundary.

Do not mark native acceptance complete until these checks pass on the release artifacts.
