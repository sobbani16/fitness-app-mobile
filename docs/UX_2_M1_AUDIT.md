# Humai UX 2.0 — M1 audit and foundation

Audit date: October 29, 2026. Scope: mobile and backend working trees, including existing uncommitted work. Mobile HEAD `61e26da`; backend HEAD `5b76bdf`. This is the **new UX 2.0 M1**, not the earlier `UX_MILESTONE_1.md` implementation.

**Review status: source audit and foundation ready; visual baseline and device acceptance pending.** No application behavior changed. Stop here for M1 review before M2 implementation.

## Evidence and coverage

Inspected 31 screen modules, 24 unique root route names, seven possible tab routes, authentication/migration gates, inline subflows, native modals, sheets, associated services, tests, schema and release workflow. Role and beta gates mean these routes are not all visible to every account. The complete [route and journey inventory](UX_2_SCREEN_INVENTORY.md) records purpose, steps, estimated tap counts, scroll exposure, defects, backend support and proposed flow.

Evidence is source inspection and the focused checks below, **not observed user testing**. Previous conversation history was not available; repository handoff and earlier UX milestone documents supplied historical context. Current source takes precedence over older completion claims. Tap counts exclude typing, scrolling and OS permissions unless stated. Pixel scroll distances, elapsed task time and rendered dimensions have not been measured.

The user's existing changes were preserved:

- Mobile: `RootNavigator.tsx`, `LogExerciseScreen.tsx`, new `personalPlans.ts` and `WorkoutPlanScreen.tsx`.
- Backend: schema, chat/router/AI changes, personal-plan migration/services/tests and menu-analysis services/tests.
- A locally present file or passing unit test does not establish deployment, migration application, reviewed exercise content or native feature availability.

## What can be reused

The app already has green light/dark tokens, shared controls, accessible progress bars, Quick Add, food search, device favorites, catalog servings, guarded food saves, persistent workout drafts, rest timing, Progress charts/calendar, account appearance, reminder consent, structured label extraction and provenance. Improve these in place.

Mobile uses Expo 54 / React Native 0.81, React Navigation 7 native stack + bottom tabs, React context and account-scoped storage. Backend uses Express and Prisma. Authentication replaces the legacy identity header with the authenticated user on the server; mobile sends a bearer token. Preserve that contract.

Avoid parallel replacements for `MealsContext`, meal synchronization, `useDailyStats`, `useExerciseSession`, ingredient nutrition, label merging, reminder scheduling and account cleanup. [Foundation standards](UX_2_FOUNDATION.md) identify component gaps and the licensed icon family.

## Prioritized findings

“Confirmed” below means a direct source path establishes the behavior; it does not mean reproduced on a physical device. “Needs reproduction” distinguishes layout/navigation hypotheses.

| ID / priority | Finding and evidence | Consequence and next treatment |
| --- | --- | --- |
| NAV-01 / M2 high | Custom Cancel/Back controls in EditProfile, LabelScanner, VideoCompare and ClientDropSurvey call `goBack()` without a deliberate no-history fallback. `navigationRef.navigate` drops requests before readiness; notification setup only adds a response listener. `App.tsx` has no URL linking configuration. | Define per-entry fallback, handle pending/cold notification navigation, and validate missing route parameters. Normal stack Back is provided by React Navigation; do not claim it is universally broken or replace it globally without tests. |
| NAV-02 / M2 high | FoodEntry, PortionAdjust, EditProfile and Feedback use removal guards. Scanner captures, menu orders, workout-plan edits and coaching forms do not. Quick Add closes a Modal and navigates in the same handler. | Preserve existing guards; protect dirty forms and verify topmost-sheet dismissal, iOS gestures, Android Back and keyboard ordering. Close/navigate race remains a device reproduction target. |
| SEL-01 / M2 high, confirmed | `design/components.tsx` `Action` exposes `selected` to accessibility but ignores it in its colors, border and font. Food's three selectors always pass `secondary`. The same pattern appears in workout filters, scanner panels/units, menu filters, reminder options and video filters. | Give selection an unmistakable visual treatment without changing bounds. Some callers already toggle `secondary` or change text and therefore look selected; retain their semantics. |
| LAY-01 / M2 high | `KeyboardAwareScrollView` applies `style={styles.flex}` before `{...rest}`. Caller `style` replaces `flex: 1`; Food supplies only a background. Food also centers a percentage-width content container and uses content-sized wrapping selector buttons. | Style override is confirmed; the reported horizontal shrinking is **not yet reproduced**. Merge container styles and measure parent/content bounds in empty, short, long and filtered states. Do not attribute all shrinking to one cause. |
| NAV-03 / M2 high, confirmed | VideoCompare destructures `route.params.videos` before validating it. It sets a success state before preference storage succeeds; without `exerciseKey`, “Preference saved” can appear with no persistence. | Guard malformed entry; explain storage failures; preserve search results on return. |
| LOAD-01 / M2 high, confirmed | SmartReminders returns loading whenever `!prefs`; ReminderInbox returns loading whenever `!instances`. Initial fetch errors leave those values null and their error UI unreachable. | Render explicit failed initial-load states and Retry. An indefinite spinner prevents completing navigation journeys even when Back works. |
| LOG-01 / M3 | Water is Today → Log water → +250 ml, or global Add → Log water → +250 ml. Quick Add weight opens the full Profile form. Trusted food repeat still opens a long review form. | Reuse existing services for preset water + Undo, explicit weight input and reliable-serving repeats. Notification water bypasses the hook and lacks a durable duplicate-command key; reconcile this path before advertising reliable one-tap logging. |
| FOOD-01 / M3 | Food home favorites are device saved-meal records; IngredientSearch favorites are server catalog selections. Ingredient selection clears the query. FoodEntry exposes all macro fields, source explanations, scale setup and today's meals beneath every entry. | Keep the two data models explicit while presenting coherent saved-food choices. Preserve search context; use portion-first review and optional nutrition editing. |
| ENERGY-01 / M4 + M6, confirmed | Today and History render logged intake minus full-day TDEE as “balance.” Today uses server recommendations for its summary and local `energy.ts` for another target. | Separate recorded intake, target and expenditure; expose calculation source and confidence. Do not imply a measured deficit. Verify target consistency before new graphics. Wearable active calories must not be added to TDEE. |
| HEALTH-01 / health integration blocker, confirmed | Backend `routes/healthData.js` constructs `Date` objects then checks `Number.isFinite(startAt/endAt)`. `Number.isFinite(new Date(...))` is false, so every energy import record is skipped. | Fix and test the import contract before claiming connected energy works. The source-summary screen has no provider connect/disconnect flow; data ingestion endpoints alone are not a wearable integration. |
| WEATHER-01 / M5 | Weather is mounted only after daily details and a local “Connect” toggle. Mount requests foreground permission each time; no saved city, persisted opt-in, response cache or forecast timestamp. Missing upstream readings can fall through to “pleasant.” | Automatically retrieve only with existing authorization/saved city; cache with timestamps and unknown/stale states. Missing weather must not generate favorable-condition advice. |
| SCORE-01 / M6, confirmed | `healthScoreEngine.scoreConditionCompliance` returns 100 when no active condition is recorded. Day boundaries use server-local timezone. UI has provisional warnings and component bars but no separate completeness contract. | Treat missing as unknown; define coverage/source semantics before a score ring or stronger recommendations. Coordinate backend and client; preserve clinically unvalidated status. |
| PROGRESS-01 / M6, confirmed | `HistoryCalendar` uses seven columns only if `width - 80 >= 7 * 48` and font scale ≤1.3. Thus widths below 416 points become a vertical list. It renders only dates supplied by a rolling history window. Calendar appears after energy, consistency and trends. | Calendar-first full-month navigation with accessible date controls; select a day into a concise summary. Keep large-font accessibility without silently turning the primary phone calendar into a long list. |
| PROGRESS-02 / M6 high, confirmed | `dayAssessment.ts` returns red for a small partially logged meal and can return green with unknown protein. Several missing workout days can become red without a confirmed schedule. Overall can inherit green while another category is missing. Calendar fallback also assigns red to no logs when no assessment is supplied. | Missing or partial evidence must remain gray. Define sufficient data per view and show symbols/text, not color alone. Existing tests are not acceptance evidence for these new requirements. |
| PLAN-01 / M7 high | New personal-plan work exists, but Workout still runs the seven-value `EXERCISE_TYPES` list and single-exercise sessions. Confirm sends only an ID; unsaved on-screen changes can differ from the stored plan activated. `saveEdits` does not adopt the sanitized plan response. | Review, save validated final revision, then explicitly activate that revision; show the confirmed plan on Workout and Today. Preserve session infrastructure rather than replacing it. |
| PLAN-02 / M7 high | Suitability checks equipment with `some`, so bench-only can satisfy bench press's barbell + bench requirement. “Floor” only excludes `position === 'floor'`, leaving lying floor movements. Catalog lacks review/source metadata and primary/secondary taxonomy. | Validate all required resources and explicit capabilities using reviewed metadata. Version and test rules; do not interpret existing labels as clinically reviewed contraindications. |
| MOBILITY-01 / M9 | Warm-up/cool-down arrays pass through the AI plan sanitizer as free text. Neither is required. The plan screen renders warm-up names but not cool-down instructions. | Reuse plan storage but introduce reviewed movement IDs and validation, alternatives, dosage, skipping and discomfort feedback before guided execution. |
| POSE-01 / M10 | Real model/frame/landmark integration and manual logging exist. Positioning messages depend on `dbg`, which is populated only when a hidden debug toggle is enabled. Pose modal always slides and flip/audio controls have no accessibility labels. | Surface ordinary tracking failures independently of debug mode; verify real frames and rep transitions on devices. Keep audio output distinct from voice input. |
| MENU-01 / M12 high, confirmed | Menu save uses 200 g by default without a portion editor. Unknown nutrition becomes zeros. Estimated calories are scaled twice in `itemMacros`, while the order summary is not scaled. Each retry creates new IDs per dish, allowing partial-save duplicates. | Add explicit review/portion and missing-value handling before faster logging. Preserve stable IDs across retries and reconcile partial success. Do not derive exact macros from a dish name. |
| MENU-02 / M12 | After the first successful page parse, capture controls disappear; “Scan another menu” clears the previous pages. Denied-permission “Open settings” still requests permission. Scanner/menu draft exits are unguarded. | Keep Add page available within the order, preserve pages across navigation and open real OS settings. A new `/menu-analysis` backend exists but the mobile scanner currently calls `/label-scanner/menu`. Do not implement a third pipeline. |
| A11Y-01 / cross-cutting | Shared Action is 48 pt, IconAction 44 pt, Segmented 40 pt. Emoji/Unicode icons coexist with Ionicons. Older auth, recipes, weekly and coaching screens retain fixed light colors and incomplete control labels/selected state. ListRow truncates names to one line. | Adopt the foundation incrementally; test dynamic type, full labels and native accessibility. Neither current component tests nor theme tokens prove rendered accessibility. |
| VOICE-01 / M13 | No food/water recording/transcription/confirmation flow or billing entitlement implementation found. `expo-speech` is output; camera microphone configuration is false. AI quota/accounting helpers exist. | Add push-to-talk later through existing logging services; measure provider costs before limits/billing. No paid calls were made in this audit. |

## Interaction baseline and target

Counts start at the stated surface, with valid defaults and permissions already granted. “+edit” means additional field focus/entry actions; successful save acknowledgement is counted separately.

| Task | Current source-traced flow | Proposed target / owner |
| --- | --- | --- |
| Preset water from Today | Log water → +250 ml: **2 taps**, one screen + sheet; sheet remains open | **1 tap**, confirmation + Undo / M3 |
| Preset water from another tab | Add → Log water → +250 ml: **3 taps**, tab transition + two sheets over time | **1 preset tap** if exposed directly, otherwise Add → preset **2 taps**; report entry cost honestly / M3 |
| Repeat trusted food from Recent | Repeat → reviewed → Save: **3 taps**, Food + entry; +1 acknowledgement | **1–2 taps** when prior serving/provenance are reliable, review otherwise / M3 |
| Search after results appear | Select → optional serving → reviewed → Save: **3–4 taps**, same entry screen; +1 acknowledgement | **3–4 or fewer** without losing portion accuracy; reduce scroll / M3 |
| Complete a set | Save set: **1 tap** when reps/weight valid; field input otherwise | Preserve **1 tap** / M10 |
| Start workout | Selected exercise → Start: **1 tap** for current default, **2** to choose another; no confirmed-plan start | **1 tap on today's confirmed session** / M7–10 |
| Review historical day from Today | Progress tab → date: **2 taps** within loaded window, plus substantial scrolling; older windows/months cost extra | **2 taps** for visible month, explicit older-month cost / M6 |
| See macros | Already on Today, no navigation; position varies with content/font | Visible in first useful dashboard region / M4 |
| Change theme | Account → appearance option: **2 taps + scroll**; Today also has an Appearance sheet | Account → Appearance → option, clear settings hierarchy / M11 |
| Log weight globally | Add → Update weight → weight field → Save: **4 taps + input/scroll**, full profile validation | Add → Weight → value → Confirm; dedicated compact input / M3 |
| Voice food | Unavailable | Record → Review/correct → Save; start/stop actions measured separately / M13 |

## M2 implementation boundary

First address NAV-01/02/03, SEL-01, LAY-01 and LOAD-01. Keep the existing route names, services and data semantics. Add tests for actual navigation transitions and form retention, rather than only asserting mocked `navigate` calls.

1. Reproduce Food bounds and Back scenarios with the baseline protocol; retain known failures as regression cases.
2. Make selected styling and container bounds consistent; audit every `Action selected` consumer and existing segmented control.
3. Add explicit Back fallback per destination, malformed-route handling and pending notification entry. Keep removal guards and active workout persistence; close the top modal before changing routes.
4. Preserve query/scroll/draft state through relevant transitions; ensure failed initial loads offer Retry and Back.
5. Run focused automated checks, then native visual/gesture checks. Report measured improvements and unresolved blockers; stop for M2 review.

Data issues above remain explicit blockers for their owning milestone. M2 does not validate energy ingestion, score meaning, personalized workouts or menu nutrition.

## Verification and milestone report

- Mobile `npm run typecheck`: **passed**.
- Mobile focused Jest: **7 suites / 29 tests passed** (Quick Add, Food home/entry, History, Workout, design accessibility/theme).
- Backend focused Jest: **5 suites / 51 tests passed** (suitability, draft generation, progression, menu analysis, weather). AI generation mocked; menu used supplied OCR/fake database; weather used mocked fetch. No live AI call or database mutation.
- Tests are baseline checks, not new navigation, rendered-layout or complete acceptance coverage. No full release pipeline was run; the existing workflow builds and submits to TestFlight.
- Actual screenshots: **none captured**. Simulator boots but no Humai simulator app is installed; discovered Xcode artifacts target `iphoneos`. No Android device is attached. Details and exact follow-up states: [validation plan](UX_2_VALIDATION.md).
- Screens changed / old → new flows / achieved tap improvement: **none in M1**. Targets above are proposals.
- Visualizations/icons introduced: **none in runtime**; reuse standards and semantic mapping documented.
- Media added: **none**. Existing Ionicons MIT licensing checked; no workout illustrations/animations approved.
- Files changed: this report, screen inventory, foundation, validation plan, and the README link.
- Migrations required by this milestone: **none**. Existing uncommitted plan migration was inspected, not applied.
- Remaining gates: M1 review, authenticated native visual baselines, physical-device checks, anatomy/media review, and documented functional defects. No commits, pushes, deployments, store submissions or production migrations.
