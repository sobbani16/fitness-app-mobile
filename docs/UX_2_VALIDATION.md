# UX 2.0 baseline and validation plan

October 29, 2026. **This is a test plan and recorded tooling check, not a claim that usability/device testing occurred.**

## Baseline evidence and limitations

| Check | Observed result |
| --- | --- |
| iOS tooling | Xcode `simctl` available. iOS 26.4 iPhone 17 Pro simulator booted successfully |
| Tooling cleanup | Simulator returned to its original shutdown state after inspection |
| Installed simulator app | No Humai app found on that simulator |
| Existing native artifacts | Discovered Humai `.app` artifacts in Xcode DerivedData under Debug/Release **iphoneos**, not iphonesimulator |
| Android | adb available; no attached device/emulator |
| Running app/backend preview | No listener found on checked common app/backend ports 8081, 8082, 3000, 4000, 19006 at audit start |
| Native prerequisites | README requires a native build for OCR/pose/Bluetooth; existing native build document is historical evidence, not an installed current binary |
| Test account/data | No authenticated, isolated screenshot account was prepared in this audit. User's account/data was not used |
| Capture result | **No baseline PNGs captured.** No current simulator build was attempted during this source-audit milestone. No UI screenshot, mockup or generated data image is presented as implemented UI |
| After screenshots | N/A for M1 documentation-only changes; mandatory pending evidence for each modified screen beginning in M2 |

Simulator access itself is available. The blockers are an installed **current simulator build**, controlled authenticated fixture state and native interaction/capture setup. A physical-device build cannot substitute for a simulator app. This is not a claim that screenshots are impossible; the visual-baseline gate is explicitly **pending**.

Use an isolated local backend/test account with known non-sensitive fixtures and real app screens. Do not bypass production authentication, seed a hosted database or call paid AI to obtain screenshots. Use existing isolated test setup where suitable; document fixture identity without credentials. The backend endpoint smoke harness mutates data and must not be run against production.

## Before/after capture protocol

Before editing each screen:

1. Record mobile/backend revisions **and working-tree changes**, build identifier, platform/OS, actual viewport in logical units and pixels, font scale, locale, timezone, theme, reduced-motion setting, navigation entry, fixture IDs and connectivity.
2. Capture the real screen at top, the main-action position, and relevant modal/empty/error/selected states. Record scroll offset and content/viewport height when instrumentation permits. Save images locally without unrelated personal information.
3. Perform the identical task and capture the same states after the change. Do not substitute a happy populated “after” for an empty “before.” Account for OS chrome/clock differences rather than treating them as application changes.
4. Compare card/parent bounds, horizontal position, wrapping, touch target sizes, keyboard overlap, safe areas, selected states, error recovery and return position. Include both themes. Record exact unresolved differences.
5. Retain a screenshot manifest with status `captured`, `pending` or `not applicable`, plus the reason and owner. “Looks good” without images/measurement is not visual acceptance.

Suggested names: `ux2-m2-food-recent-before-ios-light.png`, `ux2-m2-food-recent-after-ios-light.png`. Keep corresponding manifests together. A `simctl io <device> screenshot <path>` capture is valid only after the current Humai screen and fixture state are verified; a simulator home screen is not a Humai baseline.

Required viewport categories, with exact dimensions recorded at execution:

- Small phone near 360–393 logical units wide, normal text.
- Large phone at least 430 wide, normal text.
- Both sizes with large accessibility text; test approximately 200% where supported, recording the OS text category rather than assuming a fixed multiplier.
- Android gesture and three-button navigation; iOS native swipe-back.
- Supported landscape/tablet layouts, keyboard open, screen reader, and reduced motion.

Do not claim any of these configurations passed based on source or React test-renderer output.

## Screenshot/state matrix

All entries below are **pending**.

| Screen family | Comparable before/after states | Main acceptance question |
| --- | --- | --- |
| Main/Quick Add | Five tabs; beta Leo; role Clients; sheet open/closed; large font header | Header/tab labels fit; close top sheet before destination navigation |
| Food | Diary/Recent/Favorites, empty/one/20 rows, filtered/no-results, long name, loading/error | Selected state obvious; parent/content width stable; scroll/query preserved |
| FoodEntry | Search/results, natural portion, reliable repeat, unknown serving, manual, pending retry | Save reachable; source/uncertainty visible; no discarded query/draft |
| Today/water | Empty/partial/full log, independent goal failure, water busy/offline/retry, Undo | Primary macros/actions visible; one save; no inferred physiological deficit |
| Weather/health/energy | Authorized, denied, city, offline/stale/unknown; multiple providers | Honest timestamp/source; no reconnect ritual or double-counting |
| Progress/Health Score | Full month crossing year, missing/partial/zero, 7/30/90 range, large text | Monthly layout and evidence-based statuses; confidence separate from score |
| Workout | No plan/draft/confirmed, active/paused/resumed, pending set/finish, history | Start/complete-set actions clear; session survives media and app switch |
| Anatomy/mobility/media | Primary/secondary muscles, missing/unreviewed/offline media, reduced motion | Accurate reviewed mapping; static fallback; no obstructed controls |
| Scanners/menu/recipes | Denied permissions, uncertain fields/conflicts, multiple photos, partial save | Review preserves source; unknown not zero; append page and retry safe |
| Account/reminders/health | Settings groups, all theme states, failed initial fetch, no provider data | Reachable Retry/Back; readable selected state and consent |
| Coaching/weekly plan | Role differences, selected+confirmed day, empty alternatives, dirty forms | No silent loss; clear locks; useful error/empty distinction |
| Feedback/privacy/voice | Draft, canceled OS handoff, reviewed image; future recording/review/error | Privacy review retained; no automatic sends or saves |
| Auth/onboarding | Login/register/forgot/verification, errors, keyboard, modal profile | Theme/readability; accessible inputs; valid browser return behavior |

Real-device review remains required for camera/OCR, MediaPipe frame/rep behavior, Bluetooth scale connection, physical location permissions, notification delivery/actions/cold starts, external YouTube/email/share handoffs, provider health permissions, VoiceOver/TalkBack, background recovery and native gestures. Simulators and JS tests cannot establish these.

## M2 regression cases

Existing tests primarily mock navigation. Add focused cases to suitable existing suites, plus a real navigator harness if no existing test can exercise stack behavior. Avoid a snapshot for every JSX fragment.

| Case | Expected outcome / evidence |
| --- | --- |
| Today → Food → search → review → Back → keep editing | Same field values and selected serving; no API write |
| Dirty review → Back → discard | Exactly one removal; returns to intended Food/search origin |
| Profile save pending / profile dirty Cancel | Saving cannot duplicate; dirty exit confirms; clean no-history fallback works |
| Quick Add / water sheet / pose modal + Android Back | Topmost overlay closes first, underlying screen/session retained |
| Food selector transitions with keyboard open | Stable parent/content width, obvious active option, exposed selected state; no horizontal jump |
| Switch list → detail → Back | Query and appropriate scroll context retained; tab not reset unintentionally |
| Empty/short/long Food states across themes/font sizes | Bounds comparison within 1 logical unit for unchanged container; no clipping/overlap |
| VideoCompare with absent/malformed params | Recoverable prompt and functional fallback Back, no render crash |
| Video preference storage rejection | No false “saved” state; action recoverable |
| Cold/warm notification entry before navigation ready | Correct destination once ready; no lost request or duplicate stack entries |
| Entry while signed out/unverified/no profile | Respect gates, retain only safe intended destination, no premature account action |
| Scanner/menu/plan/coaching dirty exit | Keep/discard choice or durable draft; gestures/system Back follow same rule |
| SmartReminders/Inbox first request fails | Error and Retry visible, Back remains usable; no infinite skeleton |
| Start workout → navigate to video/search → OS app switch → return | Active session/set values and pending IDs retained; no re-created session |
| iOS swipe-back interrupted/canceled | Draft remains; guard does not leave a disabled visible Back control |

Use layout instrumentation or a native UI runner for bounds; source style assertions alone do not prove width stability. Exercise actual navigation state as well as mocked handler calls.

## Subsequent functional coverage map

| Milestone | Reuse existing tests/services | Missing acceptance coverage |
| --- | --- | --- |
| M3 fast logging | `QuickAdd`, `FoodHome`, `LogMealScreen`, `IngredientSearch`, `useDailyStats`, `foodCalories`, `labelPortion`, mealSync tests | Trusted/untrusted repeat, natural serving provenance, exact-event Undo, concurrent/notification duplicate prevention, weight explicit input/offline |
| M4 Today | DashboardScreen tests, energy/profile/recommendation contracts | Partial-day intake vs target/expenditure, consistent target source, wearable dedup, configured card placement |
| M5 weather | Backend weatherService tests | Existing permission auto-fetch, denied/manual city, timestamps/cache/stale/unknown conditions, rest/accessibility-aware suggestions |
| M6 score/progress | HistoryScreen, HealthScoreDetailScreen, dayAssessment/progress tests; backend healthScore/healthData tests | Missing condition ≠100; unknown vs zero; complete-month timezone/DST; partial food ≠red/green; accessible status labels; energy Date validation |
| M7 personalized plans | Backend exerciseSuitability/workoutPlanner/workoutProgression tests; session tests | Exact validated revision confirmation; all equipment requirements; capability gaps; draft/active editing; schedule consent; multi-exercise execution bridge |
| M8 muscles/media | Existing videoCompare service tests | Reviewed taxonomy mapping, primary/secondary anatomy, asset license/review metadata, failure/offline/reduced-motion fallback |
| M9 mobility | Existing plan sanitizer | Reviewed movement IDs, session-specific selection, dosage/alternatives, optional skipping, capability/discomfort rules |
| M10 execution | LogExerciseScreen, useExerciseSession/useExerciseDetection, realEngine/rep tests | Full warm-up/main/cool-down session, one-tap set retention, native model/frame problems, manual corrections, background/restart |
| M11 account/settings | Summary/ProfileForm/AccountPrivacy tests; reminderPlan/backend reminders | Native groups, theme/units persistence, providers genuinely connected, inbox failure/retry, consent on idle reminders, role flows, offline schedules |
| M12 scanner/restaurant/recipes | LabelScannerScreen, PortionAdjust, LabelInsights, menuCorrections; backend documentScan/label/menu/recipe tests | Multi-photo append, unknown macros, accurate portion scaling, stable batch retry IDs, persisted source/conflict, recipe detail/save/log |
| M13 voice | Existing backend rate/AI quota helpers and food/water services | Record lifecycle, permission denial, transcription/cost failure, correction, replay dedup, no background capture/raw retention, account isolation |
| M14 QA | All relevant preceding suites | Signed/current native devices, performance, deep links, screen readers, actual visual baselines and usability sessions |

Avoid creating tests that certify known incorrect semantics, such as red for an incomplete food day. Update rules and acceptance expectations together in the owning milestone.

## Representative usability sessions

Recruit at least one participant in each group initially; more are needed for useful generalization. Use test accounts, optional recording consent and realistic tasks. This audit recruited nobody and ran no sessions.

| Persona | Tasks and starting state | Measure and observe |
| --- | --- | --- |
| First-time fitness tracker | Sign in/onboard; interpret missing data on Today; log water; log a food with uncertain serving; change theme; decline location | Completion without coaching, field/permission confusion, whether gray/unknown is understood, unnecessary scroll, Back recovery |
| Frequent food logger | Repeat trusted breakfast; choose Indian food alias/preparation; change natural portion; favorite; switch lists; scan conflicting label; correct menu portion; retry offline | Actual taps, input actions, elapsed time, accidental duplicate/incorrect portion, selected-state recognition, abandoned reviews |
| Regular gym user | No-plan onboarding; review/replace plan exercise; confirm exact plan; start planned workout; complete/correct set; view technique and return; report discomfort; review history | Plan agency, time to start/log set, session retention, muscle/media comprehension, timer interference, confusion about pose accuracy |

Include participants using larger text, screen readers and relevant mobility adaptations across those groups rather than treating ability as a separate fitness persona.

Session procedure:

1. Start from the same documented state/build for before/after tasks. Counterbalance order when practical so practice is not mistaken for a UX improvement.
2. Give a goal (“log the breakfast you had yesterday”) rather than naming controls. Record assistance separately; do not silently guide a participant to the expected icon.
3. Measure start-to-confirmed-outcome time, taps, text-entry actions, screen/sheet transitions, scroll distance or screenfuls, retries, errors, abandoned tasks and wrong destinations.
4. Ask the participant to explain calories/score/confidence, icon meanings and whether their workout plan became active. Record misunderstanding without inferring health knowledge.
5. Stop on discomfort, data corruption or unintended write. Preserve relevant reproduction steps without health content or credentials.

Task result record:

```text
Build / platform / viewport / font / theme:
Persona / task / initial fixture state:
Outcome: completed unaided / assisted / failed / abandoned
Elapsed seconds:
Taps / text-entry actions / screen transitions / sheets:
Scroll distance (or screenfuls if pixels unavailable):
Errors / duplicates / back failures / confusing icons:
Data meaning understood:
Before screenshot / after screenshot / pending reason:
Observer notes and follow-up:
```

Targets are those in the M1 audit: water 1 preset tap, trusted repeat 1–2, search 3–4 after results where practical, correct set completion 1, confirmed-plan start 1, visible macros, historical day 2 within current month. Count global entry overhead separately. Do not remove uncertainty review, consent or destructive confirmation to meet a number.

Report medians/ranges, completion and error counts with sample size; never present these targets as achieved metrics. Block milestone acceptance on silent data loss, unintended/duplicate writes, misleading certainty, dead Back, inaccessible controls or reproducible clipping. Minor cosmetic follow-ups can be listed explicitly, but missing before/after evidence must remain marked pending.

## Checks actually run in M1

```sh
# Mobile
npm run typecheck
npm test -- --runInBand \
  src/components/__tests__/QuickAdd.test.js \
  src/screens/__tests__/FoodHome.test.js \
  src/screens/__tests__/LogMealScreen.test.js \
  src/screens/__tests__/HistoryScreen.test.js \
  src/screens/__tests__/LogExerciseScreen.test.js \
  src/design/__tests__

# Backend, in fitness-app-backend
npm test -- --runTestsByPath \
  tests/exerciseSuitability.test.js \
  tests/workoutPlanner.test.js \
  tests/workoutProgression.test.js \
  tests/menuAnalysis.test.js \
  tests/weatherService.test.js
```

Results: TypeScript passed; mobile **29 tests / 7 suites** passed; backend **51 tests / 5 suites** passed. Backend printed its missing-AI-key warning; exercised provider paths were mocked or used supplied OCR, and no live AI request was made. These checks do not establish route integration, native dimensions, real-provider behavior or complete UX 2.0 compliance.

Additional read-only probes confirmed `Number.isFinite(validDateObject)` returns false while its timestamp is finite, bench press with only a bench is classified `suitable`, and glute bridge with a reported floor limitation is classified `suitable`. These substantiate HEALTH-01 and PLAN-02 without calling an API or modifying data. Documentation checks found all 31 screen modules and all navigation route keys represented, with no broken local links.
