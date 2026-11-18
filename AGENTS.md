# Mobile agent notes

## Verify
- Typecheck: `npx tsc --noEmit` (script: `npm run typecheck`).
- Tests: `npx jest` / `npx jest <path>` (jest preset picks up `src/**/__tests__/`).
- Lint: `npx eslint <files>` — `react/no-unescaped-entities` flags `'` in JSX children; use `’` (U+2019).

## Conventions
- Design system in `src/design/components.tsx` (`Card`, `Copy`, `Action`, `Field`, `Segmented` = `{value,label}[]`, `ListRow`, `Notice`, `Skeleton`) + `Toggle`, `TimeChips` components. `Copy` has `tone`/`size`, no `weight` prop — use `style={{fontWeight:'600'}}`.
- Screens: `ScrollView` + `contentContainerStyle={{ padding: 20, gap: 16 }}` + `useTheme().colors.background`.
- Root screens register in `src/navigation/RootNavigator.tsx` (param list + `gateScreen(featureKey, Screen, label)` + `Stack.Screen`).

## Supplements
- Screens: `MySupplements`, `SupplementDetail`, `AddSupplement`, `SupplementSchedule` — all gated on `supplements` feature key.
- Dose notifications: `supplement-dose|<occurrenceId>` identifiers, `data.occurrenceId` drives mark-taken/snooze-15/30/60/skip notification actions → `doseAction()` API. They are merge-exempt in `reminderPlan.resolveConflicts` (merging would destroy the occurrenceId).
- Sound: `reminders-v2` (audible) vs `reminders-quiet-v2` Android channels; per-schedule `soundEnabled` + per-category pref via `setReminderSoundPrefs`.
- Unit-test mocks: `reminderSync` pulls `../../api/supplements` and `../notifications` — tests mocking `../notifications` must also mock `setReminderSoundPrefs`, and `../../api/supplements` must be mocked or tests hit the real network.
