# UX 2.0 foundation and reuse standards

M1 design decisions, October 29, 2026. These are implementation standards for subsequent milestones; M1 changes no runtime components or assets. See the [audit](UX_2_M1_AUDIT.md) for confirmed defects.

## Reuse before adding components

| Existing implementation | Keep | Targeted improvement |
| --- | --- | --- |
| `design/theme.tsx` / ThemeProvider | Green light/dark palette, system theme, serialized preference writes and error state | Use tokens in remaining legacy screens; retain preference storage |
| `Copy`, `Card`, `Field`, `Action`, `Notice`, `Skeleton` | System fonts/scaling, field labels, loading/error conventions | Make Action selection visible; offer compact card/row composition without reducing targets; avoid a new competing component kit |
| `Segmented` | Fixed equal-width options, accessible selected state | At least 48 pt targets; wrap labels safely; replace emoji with family icons; consistent radio semantics |
| `IconAction`, `ListRow` | Explicit action labels, flexible content/action region | Ionicons rather than Unicode; disabled/selected accessibility state; allow meaningful names to wrap; verify nested interaction behavior |
| `Sheet` | Safe-area bottom padding, scrollable contents, focus-on-show, Android close, accessibility escape | Verify focus restoration, keyboard occlusion and dismissal-before-navigation; protect dirty drafts at the correct owner |
| `KeyboardAwareScrollView` | Existing platform keyboard behavior | Compose caller style with default flex instead of replacing it; measure layout before further changes |
| `Progress`, `BarChart`, `HistoryCalendar` | Labeled values, null handling, existing date/source services | Match visual form to data; full-month calendar, non-color status, source/completeness contract first |
| `MealsContext`, `mealSync`, favoriteFoods | Account isolation, local save/reconciliation, stable retry IDs | Trusted repeat and precise Undo through existing storage; preserve immutable source snapshots |
| IngredientSearch / foodCalories / labelPortion | Per-100-g references, validated servings, unit-aware scaling | Natural portion-first review; optional manual edits; retain unknown values and provenance |
| `useDailyStats`, profile context | Existing water and weight services | Consistent pending state across app/notifications; explicit user-entered weight; no silent repeat measurement |
| `useExerciseSession`, exerciseAutofill | Persistent draft/pending sets, previous performance, unit conversion | Connect confirmed multi-exercise plans; keep one-tap completion and manual correction |
| `useReducedMotion`, pose loader | Reduced-motion subscription; graceful unavailable native module handling | Apply to all native modals and future media; keep operational tracking independent of debug display |
| Reminders / health-data / label scanner | Consent, server-owned data and existing contracts | Fix documented correctness gaps before introducing richer visualization |
| FeedbackAttachment / AccountPrivacy | Explicit review, flattened redaction, reauthentication, cleanup | Compact disclosure without removing consequential privacy or deletion explanations |

## Visual and interaction rules

- Retain palette: light primary `#137C63`, background `#F7F9F8`, surface `#FFFFFF`; dark primary `#7ADDB9`, background `#101916`, surface `#1B2923`. Use existing semantic text, muted, danger, warning, border and track tokens. Do not hardcode new light surfaces inside dark screens.
- Retain system typography scale: caption 13, body 16, title 20, heading 28, display 40. Default body 16; use display only for a useful primary metric. Keep native font scaling; allow multiline labels and layout growth. A card should not depend on a fixed text height.
- Retain spacing 4/8/12/16/24/32 and radius 12 controls / 20 cards. Prefer 16 pt page padding and 12–16 pt compact card interiors when redesigning; do not migrate every existing 20 pt inset during M2.
- One main task per screen region. Use text + icon for unfamiliar or consequential actions. Use icon-only repeat/favorite/edit/more only where context is clear. Routine settings use disclosure rows; Save/Confirm stays explicit.
- Minimum interaction box: 48 × 48 logical units across both platforms. Icon artwork normally 20–24; small decorative icons 16–20. Artwork size does not determine touch size. Do not rely on overlapping hitSlop to rescue crowded controls.
- Selected state must combine a stable visual marker (fill/border/check) with readable text and `accessibilityState`. Keep padding/border allocation constant so selection cannot alter bounds. Use radio/checked semantics for mutually exclusive controls and selected/checked semantics appropriate to toggles.
- Page and content width belong to stable containers. Empty/list/loading/error states must share bounds. Two-column cards collapse or wrap according to available width and font size; long names must not push controls outside the viewport.
- Use native header/safe-area ownership once. Verify EditProfile's hidden header/top inset and primary headers with Add/Feedback at large type. Never fit a header by shrinking the whole page.
- Show loading, empty, partial, stale, offline, retrying, saved locally, synced and failed states distinctly where applicable. Keep submitted values while retrying the same operation. Disable duplicate actions synchronously; explain long pending states.
- Standard Back order: dismiss keyboard where the platform normally does; close topmost modal/sheet; otherwise return via valid history, then a deliberate route-specific fallback. Dirty-state protection applies to gestures/system Back too. Back must not re-submit or silently discard.
- Labels such as “Start” must start; a control that selects an exercise should say “Select.” “Saved” must follow confirmed persistence. “Connected” requires evidence of a connection, not simply a source string.

Contrast targets for subsequent rendered checks: 4.5:1 ordinary text, 3:1 large text and meaningful non-text UI. Existing token names are not proof of every combined/disabled/selected contrast. Test actual states in both themes.

## Icon family and license

Reuse **Ionicons through the installed `@expo/vector-icons`**. MainTabs and FeedbackButton already use it. Do not add a second icon package or download a Figma pack for M1.

License evidence checked October 29, 2026:

- Installed `node_modules/@expo/vector-icons/LICENSE`: MIT, Joel Arvidsson / 650 Industries.
- Installed vendored react-native-vector-icons license: MIT.
- [Ionicons upstream LICENSE](https://github.com/ionic-team/ionicons/blob/main/LICENSE): MIT, Ionic; permits commercial use with copyright/license notice retention. Retrieved directly during this audit.

Keep applicable notices in distributions. The upstream link tracks main, so pin the relevant asset/package version when compiling release notices. This does **not** license YouTube content or third-party anatomical illustrations. No new icon font, illustration or instructional media was copied into the repository.

Proposed mapping below was checked against the installed Ionicons glyph map: **27 names checked, none missing**. Add a typed semantic mapping when the first consuming milestone needs it; do not add an unused abstraction during this documentation milestone.

| Meaning | Ionicons name |
| --- | --- |
| Calories | `flame-outline` |
| Food | `restaurant-outline` |
| Water | `water-outline` |
| Exercise | `barbell-outline` |
| Steps | `footsteps-outline` |
| Weight | `scale-outline` |
| Heart rate | `pulse-outline` |
| Sleep | `moon-outline` |
| History | `calendar-outline` |
| Progress | `trending-up-outline` |
| Nutrition | `pie-chart-outline` |
| Weather | `partly-sunny-outline` |
| Search | `search-outline` |
| Filter | `filter-outline` |
| Favorite off / on | `heart-outline` / `heart` |
| Repeat | `repeat-outline` |
| Scan / camera | `scan-outline` / `camera-outline` |
| Voice | `mic-outline` |
| Settings / appearance | `settings-outline` / `contrast-outline` |
| Information / edit | `information-circle-outline` / `pencil-outline` |
| Back / more | `chevron-back-outline` / `ellipsis-horizontal-outline` |
| Completed / selected confirmation | `checkmark-circle-outline` |

Use outline icons consistently; a filled favorite or active tab may reinforce selection. Do not imply a medical interpretation from a heartbeat icon. Decorative icons are hidden from accessibility; icon buttons require action-specific labels such as “Repeat oats, last serving 40 grams,” with uncertainty retained where needed.

## Meaningful visualization contract

| Data/question | Visual | Required guardrail |
| --- | --- | --- |
| Calories/macros toward intake targets | Compact number + progress bar; optional single-goal ring | Numerator is **logged** intake; source/target available; over-target number remains visible even when bar caps |
| Weight history | Line with real dated observations | No fabricated interpolation across missing periods; units, date range, data count and text summary |
| Daily totals/consistency | Bars or calendar | Missing ≠ zero; a logging streak is not proof of adherence; accessible status symbol/text |
| Energy | Labeled intake/target/resting/total estimates | TDEE already contains activity estimate; wearable active energy remains separately sourced context. Never stack overlapping quantities or label partial logs a measured deficit |
| Health Score | Compact provisional metric + component bars | Separate completeness/confidence; formula weights are not proof of clinical validity. Unknown condition data cannot earn a perfect component |
| Nutrition composition | Donut/stack only for a real total | Do not mix grams with calorie proportions, sum overlapping nutrient measures, or fabricate missing values |
| Calendar goal assessment | Seven-column month + day summary | Gray for insufficient evidence, symbols/text for statuses, distinguish scheduled rest and unknown activity; show full month even if data window is partial |

Every visual needs an accessible sentence describing values, units, time range, gaps and source freshness. Provide optional “How calculated?” / “View source.” Do not collapse zero, unavailable, estimated and stale into one state. Define local-day/timezone and source deduplication before comparing histories. Charts must work in dark mode and without motion.

The existing bar primitives use React Native Views. M1 adds no chart dependency. Select an additional renderer only when a concrete milestone requires lines/anatomical paths and can validate native compatibility.

## Anatomy and instructional media gates

Reuse and extend the existing exercise catalog, with reviewed primary/secondary muscle groups and a consistent taxonomy. “Back” and “posterior” alone are insufficient for precise diagrams. Required metadata should cover movement, equipment, positioning/capabilities, alternatives and reviewed considerations.

Any diagram/clip/animation must carry source, license, exercise/variation ID, review status, version and camera/view angle where relevant. Primary/secondary highlights need a legend and accessible names. A static reviewed illustration is preferable to a guessed animation. No asset is professionally verified until an actual review is recorded.

Lazy-load media in detail/technique views; no autoplay through long lists. Provide pause/replay, reduced-motion static mode, source-permitted cache and offline fallback. Warm-ups/cool-downs also require reviewed movement IDs, dosage, alternatives, optional skipping and discomfort feedback. Existing AI strings are not that catalog.

## Copy standards and first replacements

| Current pattern | Proposed treatment |
| --- | --- |
| Food slogan + “Choose how to log” + repeated title | One title and clear search/scan actions |
| “Estimated nutrition — edit before saving” for every source | “Review serving”; source badge distinguishes catalog, label, recipe, estimate or manual |
| “Estimate reviewed” for trusted repeats | Direct save only with reliable provenance; otherwise “Review portion” |
| Full device-only/sync explanation repeated in lists | Short “Saved on this device” status; expandable details; keep actual pending failure visible |
| “well below a safe range for any goal” from partial logs | Insufficient-data status; do not diagnose undereating from missing records |
| Raw exercise IDs / category enums / ambiguous S/T days | Human exercise names and full accessible weekday names |
| Repeated nonmedical disclaimers above every score section | One consequential provisional limitation, separate data coverage, details on demand |
| “Form OK” / “Recommended by Humai” without context | Explain the limited tracking or curated-source basis; never imply clinical/professional verification |
| Long settings explanations plus large buttons | Concise grouped disclosure rows; helper text only for meaningful decisions |

Use Finding → Evidence → Reason → Suggested action for insights, normally one sentence per part or a compact combined statement. Do not invent an insight when the available evidence supports only “Not enough data.”
