# Humai UX 2.0 implementation review — October 29, 2026

## Review decision

**The submitted change was not ready for an “everything works / no bugs” sign-off.** Review found reproducible correctness defects despite its green mobile test suite. The corrections listed below are now in the local working trees, with regression coverage. Several requested capabilities remain incomplete and native acceptance is pending. Passing automated checks does not establish complete UX 2.0 delivery.

Scope: the original staged changes across **82 mobile files and 27 backend files**, compared with mobile HEAD `61e26da` and backend HEAD `5b76bdf`, including the implementation prompt, milestone reports, production paths, API contracts, schema/migrations and tests. The audit followed affected calls into existing storage, authentication, workout persistence, nutrition, navigation and approved condition-rule code. It is a source and automated verification review, not observed user testing or a device certification.

The original staged snapshot remains intact in the index. Review corrections and additional tests are unstaged/untracked for inspection. No commit, push, deployment, database migration, paid AI request or store build submission was performed.

## Verified defects corrected

| Priority | Defect and trigger | Correction / evidence |
| --- | --- | --- |
| P1 | Most generated exercises, such as `goblet-squat`, could be selected but never started: the only Start control was nested under the old seven-exercise library. Planned Play merely selected. | Planned Play starts the existing durable session directly; the library includes returned catalog entries. Planned sets/reps are shown/prefilled, and plan rest time is used. Screen regression covers an exercise outside the old picker. |
| P1 | Equipment suitability used `some`: owning a barbell could approve a bench press without a bench, or a squat without a rack. Chair/box needs were ignored and those resources could not be selected. | Require all listed resources, expose support equipment in preferences, preserve explicit empty equipment lists in the catalog API. Tests cover incomplete setups. |
| P1 | The floor-access restriction missed supine floor exercises such as glute bridge. | Check floor requirements as well as position. Regression reproduces the missed classification. |
| P1 | Omitting experience used beginner wording in the AI prompt but did not apply beginner filtering to candidates. | Use the same beginner default in candidate rules; reject malformed preference arrays, weekdays and time values. |
| P1 | Edited plans accepted duplicate/invalid/unavailable weekdays, malformed shapes and mutated caller-owned exercise objects. | Validate shape and weekday availability, bound lists, preserve caller data, and apply dislikes on both generation and editing. Invalid client edits return 400. Six initial review regressions failed before correction; additional cases cover default experience and malformed preferences. |
| P1 | Nested workout/menu JSON schemas omitted properties from `required` while the provider request uses strict structured output, causing provider schema rejection. Unknown menu calories also lacked a nullable representation. | Make nested object requirements complete and nullable where appropriate. A structural contract test checks the actual schemas passed to the mocked provider. Checked against [OpenAI's strict output contract](https://developers.openai.com/api/docs/guides/structured-outputs). No live request was made. |
| P1 | AI quotas were checked before awaiting but consumed only after successful JSON parsing. Concurrent calls and repeated failures bypassed limits; paid incomplete/refused responses were unaccounted. | Reserve attempt/token budgets synchronously; retain reservations for failures; reconcile returned usage before interpreting the result. Tests cover simultaneous requests, failures and account isolation. Old day entries are pruned. Limits remain process-local, see open items. |
| P1 | Plan confirmation could reactivate archived plans, skipped rule revalidation, and two concurrent confirmations could leave multiple active plans. | Activate draft status only, revalidate stored content, serialize activation under a user-row lock, and guard draft edit writes with a draft-status condition. Tests cover request behavior and transactional locking calls; real PostgreSQL concurrency remains untested. |
| P1 | Suggestions fetched the oldest 20 sessions and replaced hyphens only in the plan ID, while persisted exercise names retain hyphens. Valid history was missed. | Fetch the newest 20, reorder chronologically, normalize both sides. Route regression uses canonical stored names. |
| P1 | Stable rep counts alone triggered progression without comfort feedback, and changed/lowered loads were treated as comparable performance. Device feedback was reused indefinitely for future sessions. | Require explicit finite comfortable RIR and matching load before increase; associate per-exercise feedback with its completed session and ignore older feedback. Tests cover absent feedback, changed load and stale session feedback. This is still a heuristic, not a validated coaching system. |
| P1 | A saved condition with no food records still produced perfect condition compliance. Removing the last underlying record left a stale score in trends. | No food means unavailable condition scoring; remove an existing snapshot when no component remains scoreable. Regression tests cover both. |
| P2 | Nullable-component migration left old zero defaults in place although the Prisma schema removed them. | Uncommitted migration now drops both NOT NULL constraints and defaults. Schema validates; SQL has not been applied to a database. |
| P1 | Repeat trust accepted generic, partially source-backed or missing provenance whenever an ingredient/recipe ID existed. | Require explicit `SOURCE_BACKED_FULL` and retain all portion/edit/conflict checks. New tests require review for partial, generic and missing verification. |
| P1 | Parsed Quick Add saves could reject without any error UI; unitless weight ignored imperial preference; negative/negated/multiple-amount commands could be interpreted as positive writes. | Catch failures without clearing user input, honor preferred weight units, and reject those ambiguous commands. Tests cover failure retention and parsing. Water sync errors/retry are visible in Quick Add. |
| P1 | Today and Quick Add each held independent water state. Quick Add could save while Today remained stale; concurrent total-replacement requests could arrive out of order. | Publish local daily-stat writes to account/day subscribers and serialize server replacements across hook instances, with an account check before send. Integration-style hook test verifies both totals update and server writes remain 250 then 500. |
| P2 | Manual weather Refresh returned fresh cache without fetching; the detail card created a second hook so saved-city edits did not update Today's header. Stale requests could overwrite cache, and freezing/unknown conditions could get comfortable-weather advice. | Explicit refresh bypasses cache, Today/detail share one hook, obsolete responses are ignored before persistence, unmount invalidates requests, and unavailable/freezing/stale conditions avoid comfortable-weather advice. Regression coverage added. |
| P2 | `posterior` was displayed as “Traps & neck” for deadlift-type movements. | Use “Posterior chain.” This corrects the label; it does not make the component an anatomical diagram. |
| P1 | Menu calorie estimates were scaled twice while other nutrients were scaled once; displayed total differed from the saved total. | Extract one shared portion calculation and use it for both display and saving. Tests check a half-sized serving and restaurant-reported calories. |
| P1 | Menu retry generated new IDs and re-saved dishes that had succeeded before a later failure; rapid submits had no synchronous guard. Skipped unknown dishes could mark the whole order Saved and had no reachable correction action. | Keep stable pending entry IDs, skip acknowledged dishes, lock submissions synchronously, leave skipped dishes editable, and expose correction controls. Screen tests cover partial failure/retry/double press and unknown-data skipping. |
| P2 | New menu analysis accepted malformed/unbounded page/preferences payloads and ignored all but the first image in its image-only fallback. | Validate bounded page/preferences inputs and process each fallback image. Input rejection tests run without provider calls. |

## Baseline test issue investigated

The submitted backend had one failure in `tests/labelInsights.access.test.js`: it expected legacy `DIABETES_PORTION_001` guidance. The identical failure was reproduced in an isolated `git archive HEAD` checkout, using the existing dependencies. Production code already deliberately routes condition guidance through the approved rule engine and suppresses the old name-based heuristic.

The stale test now verifies that the heuristic stays suppressed, the opted-in authenticated account's profile is loaded, and the approved food-intelligence path receives the authenticated account and returns its result. No disease heuristic was re-enabled and the test was not skipped.

Provider failure tests now reset provider module state between cases so the intentional new failed-attempt quota behavior does not contaminate otherwise independent test cases. Dedicated quota tests exercise accumulation and concurrency explicitly.

## Remaining acceptance blockers and known limitations

These are substantive findings, not a claim that every item was introduced by this patch. Several were already documented in M1 and remained unresolved while later reports claimed milestone completion.

| Priority | Remaining issue | Evidence / required follow-up |
| --- | --- | --- |
| P1 | Warm-up/cool-down content is unrestricted AI text, not a reviewed mobility catalog. | `workoutPlanner.js` accepts optional string arrays; there is no movement-ID whitelist, dosage, source/review record or capability validation for those strings. Reviewed generation must precede claims of completing M9. |
| P1 | Personalization remains partial. | Preferred days are enforced, but session-duration feasibility, total session volume, movement duration vs reps, exercise substitution context and comprehensive capability metadata are not deterministically enforced. Full multi-exercise execution/next-exercise orchestration is absent. |
| P1 | Missing-data semantics remain incomplete outside the corrected paths. | `dayAssessment.ts` can return green overall when nutrition is absent, and red for an unscheduled streak of missing workout records. Low partial nutrition is yellow rather than required gray. Health score still treats null nutrient fields as zero during arithmetic and uses server-local day boundaries. Source confidence and full-day completeness are not established by “N of 5 components.” |
| P1 | Menu macros and portions are still incomplete. | Calorie-only restaurant dishes retain fabricated zero protein/carbs/fat in the existing non-null mobile macro contract. Default 200 g is still used without a serving editor; multi-page capture controls disappear once items are shown. The standalone `/menu-analysis` endpoint is not used by the mobile scanner, which calls `/label-scanner/menu`. A coordinated nullable-nutrition/portion contract is required. |
| P1 | Connected energy ingestion remains broken in existing code. | `routes/healthData.js` checks `Number.isFinite` on Date objects, which skips valid energy records. This file is outside the submitted diff; the M1 audit flags it, but no fix is included. Existing provider summary UI does not establish actual provider connection capability. |
| P1 | AI operational behavior needs explicit configuration and durable budgets. | New `AI_ENABLED` gate defaults off, so an existing server with only `OPENAI_API_KEY` configured will return 503 for existing AI features. `.env.example` now documents this opt-in and caps. Quotas are process-local and reset on restart; replicas do not share them. Fixed estimated reservations do not constitute measured dollar-cost tracking. |
| P2 | Calendar requirement is not implemented for most phones. | `HistoryCalendar.tsx` requires width >=416 pt at normal text size for seven columns and shows only dates from the rolling loaded window. At typical 375/390/393 pt widths it remains a long list, not a full monthly calendar. |
| P2 | M8 anatomy/media is not complete. | MuscleMap renders region boxes with equal emphasis. No anatomical body paths, primary/secondary taxonomy, reviewed movement animation, media source/license/review/version records or offline media fallback were added. |
| P2 | M13 is not the requested voice MVP. | Keyboard dictation can fill a text field; no app recording/transcription pipeline or recording indicator exists, and food commands are unsupported. The implementation supports water/weight text parsing. OS dictation availability/offline behavior cannot be guaranteed by this app. |
| P2 | Fast logging/settings/reminders remain partial. | Water preset is fixed; supplements have no unified Taken/Skipped/Snoozed Quick Add path. Account remains large cards/actions. Notifications and idle-workout reminders still need cross-account, consent, durable deduplication and real delivery validation. |
| P2 | Exact plan revision confirmation is not guaranteed across devices. | Confirmation carries only plan ID; no optimistic revision token binds the user's reviewed content to the server revision. Database activation locking prevents concurrent active plans, but does not establish cross-device review consent. Local reminder preferences can fail after server activation and are not a server-authoritative plan schedule. |
| P2 | Native visual/accessibility/pose acceptance is unverified. | No booted simulator was present. This review built JavaScript bundles, not a native app binary. No authenticated device fixture, actual screenshots, iOS swipe-back, Android system Back, keyboard dismissal, permission dialogs, camera/OCR, pose frame/landmark/rep behavior, screen-reader or dynamic-type measurements were exercised. |

The original request said to stop after each major milestone. The local patch instead combines M1–M14. Documentation “Paused at milestone” statements are not evidence that user review occurred. The prior M14 “correctness guarantees” should not be treated as release acceptance.

## Validation

Final commands and counts are recorded below after the final rerun. Provider calls are mocked. Tests use existing in-memory/mocked persistence; they do not verify PostgreSQL migrations or locking against a live database.

- Mobile full Jest suite: **63 suites, 353 tests passed** (submitted baseline: 60 suites, 334 tests).
- Mobile TypeScript: passed.
- Mobile ESLint: **0 errors, 39 warnings** (submitted baseline: 0 errors, 41 warnings).
- Backend full Jest suite: **56 suites, 602 tests passed** (submitted baseline: 51 passing suites and 578 passing tests; 1 failing suite/test).
- Prisma schema validation: passed, with existing package-config deprecation warning. Migrations were not executed and environment migration status was not queried.
- Expo production JS/Hermes bundle export: **iOS and Android passed**, final artifacts under `/tmp/humai-review-export-final`. This is not a native compilation or store build.
- Git whitespace checks: passed for submitted staged changes and review corrections.

Both schema migrations must be evaluated with the backend release: `20261204000000_user_workout_plans` and `20261206000000_health_score_nullable_components`. Generate the Prisma client from the final schema as part of deployment. If any version of an edited migration has already been applied elsewhere, use a new forward migration there; do not silently replace an applied migration's checksum.

## Review map

- Navigation/selection: root/tab navigators, fallback actions, pending notification destinations, removal guard, shared controls, keyboard container, coaching selectors and form exits.
- Food/fast logging: saved-food selectors and search retention, repeat trust/identity, water storage/hook/sync, explicit weight endpoint/profile recalculation, parsed entry, menu and label-scanner handoffs.
- Today/weather: macro/energy copy, optional details, insights, plan-day context, permission-aware location/city persistence, geocoding and forecast freshness.
- Score/progress: nullable API/schema, source score paths and persistence, contribution rendering, assessment colors, calendar presentation.
- Workout: catalog/requirements, candidate rules, strict provider schema, draft editing/confirmation, history/progression, actual session-start connection, metadata labels, checklists, feedback and video comparison.
- Operations/evidence: provider configuration/accounting, migrations, implementation reports, original/regression tests, build output and baseline failure reproduction.

No static review can prove the absence of all bugs. This report distinguishes corrected, tested defects from requirements and runtime paths that still need implementation or direct validation.
