# Humai UX 2.0 — M2 navigation and selection

Status: implementation and automated checks ready for review; native visual/gesture acceptance pending. This is the new UX 2.0 M2, separate from the earlier `UX_MILESTONE_2.md`.

Scope follows the [M1 audit](UX_2_M1_AUDIT.md): selection, container sizing, Back and notification entry, draft preservation, recoverable initial-load errors. Stop here for review before M3 fast logging.

## Behavior changes

| Surface / old flow | New behavior | Interaction effect |
| --- | --- | --- |
| Food Diary / Recent / Favorites looked identical when selected | Shared Action uses selected fill and border, keeps dimensions constant and exposes selection; Food selectors have equal-width columns | Same one-tap selection; no measured speed claim |
| Caller background style replaced keyboard scroll container's `flex: 1` | Caller and default styles compose; Food explicitly owns full width | Corrected sizing contract; native width/shrink reproduction remains pending |
| Food list switches shared one search and could lose scroll context | Each list retains its query and scroll offset; return from entry retains mounted Food state; saved-food load failure offers Retry | Avoids re-entering search; actual saved taps vary and are unmeasured |
| Selecting a catalog food cleared its search | Query/results remain available during portion review | No extra search entry when choosing another result |
| Favorite/repeat icons nested inside a row could also activate the row | Icon actions stop propagation | One action per tap; native nested-touch check pending |
| Back depended entirely on stack history | Existing native Back stays in use; no-history headers and custom Cancel/Back controls have deliberate Food/Workout/Account/video-search fallbacks | A previously dead end becomes a one-action return |
| Android system Back on a direct root detail entry could exit the app | Root handler applies the same guarded fallback when history is absent; ordinary stack/tab history stays with React Navigation | One Back action; primary-tab exit stays native |
| Tab Back used default first-tab behavior | Tabs explicitly use navigation history | Returns to the previous visited tab |
| Quick Add navigated while its native modal was closing | iOS waits for modal dismissal; Android waits until the nonanimated modal commit; pending destination is consumed once | Same two actions to choose a destination; no added confirmation |
| Cold notification taps could be lost before navigation/profile readiness | Allowed ordinary tab destinations queue until Main is registered; account mismatch/unmount clears pending intent; duplicate response and stale OS response are consumed | No new tap for normal notification entry |
| Scanner/menu/coaching/plan/reminder drafts could disappear on removal | Shared removal guard offers Keep editing / Discard, including router Back/reset; pending operations explain why exit is blocked | One additional discard confirmation only when changes would be lost |
| Label scanner replaced itself when recognizing a menu | Menu opens above the scanner, preserving the capture on Back | One Back returns to capture |
| Video comparison crashed on malformed params and claimed success before persistence | Invalid entry offers return to search; persistence failures show retryable errors; no exercise key means “selected for this comparison,” not “saved” | Recovery without restarting the app |
| Reminder settings/inbox failed initial loads stayed on a spinner | Error + explicit Retry; successful retry renders contents | One retry action |
| Workout plan load failures were hidden; unsaved edits could be activated | Load failure blocks creation until Retry; edits are guarded; local confirmation is disabled until the server-sanitized saved draft is displayed | Save edits is intentionally required before activation |
| Confirmed weekly/client days could mask active-day styling | Selected style wins while confirmed status remains labeled; selection/checked semantics added to legacy filters and coaching choices | Same selection action |
| Hidden-header profile modal omitted top safe area | Profile includes top/bottom safe areas and a working Cancel fallback | No extra actions |

Shared Segmented controls now have 48-point minimum height, stable borders, wrapping labels and checked/selected semantics. Icon actions have 48-point targets and disabled semantics. List names can wrap. Workout weekdays are distinct (`Sun`, `Mon`, etc.), rather than repeated single letters.

Existing FoodEntry, PortionAdjust, Feedback and Profile removal guards and workout-session persistence were retained. The scanner marks a draft handed off to PortionAdjust so a successful downstream save can remove the stack; returning to the scanner restores its protection.

## Screens and files changed

Runtime foundation:

- `App.tsx`: flush/clear queued navigation at container/account lifecycle boundaries.
- `src/navigation/{MainTabs,RootNavigator}.tsx`, `navigationRef.ts`, new `back.ts`: history, direct-entry fallbacks, hardware Back and account-scoped queued destinations.
- `src/hooks/useConfirmLeave.ts`: shared discard/pending-operation guard.
- `src/design/components.tsx`: selected styling, accessible control states, stable target dimensions, sheet dismissal callback and nested-action handling.
- `src/components/{KeyboardAwareScrollView,QuickAdd,IngredientSearch}.tsx`: size composition, modal transition ordering and retained search.

Directly changed screens:

- Food (`LogMealScreen`), LabelScanner, MenuScan, EditProfile, VideoCompare.
- SmartReminders, ReminderInbox, WorkoutPlan and LogExercise.
- WeeklyPlan, ClientMealPlan, ClientProgress, TrainerList, TrainerSignup, TrainerDropForm and ClientDropSurvey.
- Dashboard has only a JSX apostrophe escape to clear a lint error; displayed copy/flow is unchanged.

Selection changes in shared controls also reach Today, History, appearance, scanner portions, food filters and video filters. Those require visual comparison even where their screen files did not change.

Tests:

- New `src/hooks/__tests__/navigation.test.js`: real React Navigation stack/tab routers and removal events with a lightweight renderer.
- New `src/screens/__tests__/NavigationReliability.test.js`: malformed video entry, persistence failure, reminder recovery, quiet-hour draft retention and plan edit/save/confirm behavior.
- New `src/services/__tests__/notifications.test.js`: cold navigation recovery, duplicate response and no replay of previous water writes.
- Extended existing QuickAdd, IngredientSearch, FoodHome and design accessibility tests; scanner mock updated to support its new guard.

Documentation: this report and README navigation link. The earlier M1 documents remain historical baseline findings. Existing uncommitted personal-plan integration was extended in place; its API and the backend working tree were preserved.

## Verification

| Check | Result |
| --- | --- |
| Full mobile Jest run | **54 suites / 269 tests passed** |
| Final navigation/notification check after hardware-Back and consumed-response refinements | **2 suites / 10 tests passed**, including one additional hardware-Back test |
| Final TypeScript check | **Passed** |
| Repository lint | **0 errors / 40 existing warnings**; final targeted lint of navigation/notification/guard/plan changes also passed |
| Whitespace/diff check | **Passed** |
| Backend | No M2 backend changes; no backend tests, migrations or services needed for this milestone |

The navigation harness exercises actual router state, history, removal guards and queue readiness; it does not render a native stack. Layout tests assert stable sizing/style contracts, not measured native pixels. No live AI calls were used; plan generation/confirmation APIs are mocked in tests.

## Screenshot manifest and remaining acceptance checks

**No before/after screenshots captured.** M1 had no installed current Humai simulator build or authenticated isolated screenshot fixture. Recheck in M2 found no booted iOS simulator, no attached Android device and no `.app` in the inspected `ios/build` tree. No current native build was attempted. Do not substitute mocked component output for application screenshots.

Use the [M1 validation protocol](UX_2_VALIDATION.md), including actual viewport/font/theme and fixture state, for these pending comparisons:

| Family | Pending states |
| --- | --- |
| Food/search | Three selected lists, empty/short/long names, filtered states, per-list offset restoration, narrow/large phones, keyboard and large fonts |
| All shared control consumers | Both themes, selected/unselected/disabled, wrapping, native touch bounds, screen-reader announcements |
| Quick Add/profile/scanner/menu | iOS modal dismissal/swipe-back, Android Back, keyboard, dirty Keep/Discard, nested review/save return, safe-area bounds |
| Plan/coaching/reminders | Dirty exits, pending saves, retry, confirmed+selected day, asynchronous error recovery |
| Video comparison | Invalid entry, no-history return, narrow/large layout, storage failure, external YouTube return |
| Notifications | Physical cold/warm delivery, onboarding/auth gates, account switch, repeated taps, direct-detail Android Back |

Do not claim the reported horizontal shrinking is fully eliminated until native bounds are measured in the reported states. iOS gestures, OS modal focus restoration, Android keyboard behavior and VoiceOver/TalkBack remain device gates.

## Scope limits and next milestone

- No new chart, anatomy illustration, instructional media or icon package. The fallback arrow reuses installed MIT-licensed Ionicons. No media is newly marked reviewed.
- No migrations, API contract changes, production writes, deployments, store submissions, commits or pushes.
- New guards preserve mounted navigation drafts; they do not promise crash/process-death persistence for scanner/menu/coaching forms.
- Notification handling here covers existing internal tab destinations. External URL/universal-link routing is not introduced. Historical logging actions are not replayed during cold navigation recovery; durable logging-action dedup/recovery remains M3/M11 work.
- Plan confirmation now requires locally saved edits, but cross-device revision concurrency, reviewed suitability rules and complete planned-session execution still belong to M7.
- M1's energy import, incomplete-log score/calendar semantics, menu portion/unknown-macro/retry issues and weather behavior remain open in their owning milestones.
- Next: M3 fast logging, through the existing water, food and weight services. Do not claim one-tap water or trusted repeat was delivered in M2.

Review M2 implementation and the pending native acceptance checks before beginning M3.
