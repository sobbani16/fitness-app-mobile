# UX 2.0 — M5 Weather

Milestone 5 makes local weather automatic and honest: it loads only when the
user has already granted location access or chosen a city, caches sensibly,
shows freshness, and never nudges activity as an obligation.

## Screens changed

- `Dashboard` (Today tab): compact weather line under the greeting, plus the
  weather card inside `More about your day` — which now handles every
  permission state itself instead of a manual "Connect" toggle.

## Behavior

- **Automatic authorized fetch:** on load, the hook checks permission
  *without prompting* (`getForegroundPermissionsAsync`). Already granted →
  fetch via last-known position first (no GPS wake-up, `Accuracy.Low`
  fallback). Undetermined → silent; nothing is requested. Denied →
  respected, with an in-card message and the saved-city alternative. The
  only prompt is the explicit "Share location for weather" action.
- **Saved city:** `Field` + geocoding through the new
  `GET /weather/geocode` backend route (Open-Meteo, no key). A saved city
  always wins over device location and works with location fully denied.
  Stored account-scoped; removable with one action.
- **Caching:** 30-minute TTL in account-scoped storage. Fresh cache → no
  network call. Failed refresh → stale forecast stays visible with an
  "Updated HH:MM" timestamp and an "older forecast" marker, plus a retry
  action.
- **Contextual suggestions** (`src/services/weatherContext.ts`):
  deterministic rules only — rest day → nothing; planned workout + rain →
  indoor alternative; planned + ≥32° → cooler time or indoor; pleasant +
  no plan → *optional* walk; wet + no plan → indoor option. No calorie
  promises, no exercise-as-compensation framing (test-enforced).

## Files changed

Mobile:
- `src/hooks/useWeather.ts` — rewritten: permission-aware, cached, saved
  city, explicit `connect()`.
- `src/storage/weather.ts` — new cache + saved-location persistence.
- `src/services/weatherContext.ts` — new suggestion/summary rules.
- `src/api/weather.ts` — `geocodeCity`.
- `src/components/today/OptionalDetails.tsx` — `WeatherDetail` rewrite.
- `src/screens/DashboardScreen.tsx` — greeting indicator, suggestion
  wiring, removed the manual connect toggle.
- Tests: `src/hooks/__tests__/useWeather.test.js`,
  `src/services/__tests__/weatherContext.test.ts` (new).

Backend:
- `src/services/weatherService.js` — `geocodeCity` (Open-Meteo geocoding).
- `src/routes/weather.js` — `GET /weather/geocode`.
- `tests/weatherService.test.js` — geocode coverage.

## Migrations required

None.

## Tests

- Mobile: **58 suites / 315 tests passed**; typecheck clean; lint 0 errors,
  40 pre-existing warnings.
- Backend weather suite: **10/10** (the repo-wide suite still carries the
  pre-existing `labelInsights.access` failure from earlier uncommitted
  work, unrelated to this milestone).

## Verification limitations / remaining blockers

- Real permission prompts, approximate-vs-precise location settings, and
  denied-flow copy need native device verification.
- Geocoding picks the top provider match; ambiguous city names may need a
  chooser in a later polish pass.
- Suggestions use the saved plan days plus weather only; richer context
  (equipment, session type) arrives with M7 plan details.
- The Open-Meteo upstream has no SLA; stale-cache messaging is the
  mitigation shown to users.

Paused at the requested M5 review point before M6 (Health Score and
Progress).
