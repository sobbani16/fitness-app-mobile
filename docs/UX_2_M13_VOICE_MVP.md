# UX 2.0 — M13 Voice MVP

Milestone 13 delivers the fastest possible voice path with zero new
dependencies: a "Say or type it" field in Quick Add driven by the OS
keyboard's dictation, plus a deterministic parser that only acts on
phrases it can prove.

## Scope honesty

- `expo-speech` in this stack is **text-to-speech only** — there is no
  speech-to-text module. Real STT would need a native capability and is
  a separate feature decision. This MVP therefore uses the keyboard's
  built-in microphone, which every user already has and which works
  offline on modern OSes.

## What was built

- **"Say or type it" field** at the top of Quick Add, with dictation-
  friendly placeholder ("e.g. 'drank 500 ml' or 'weight 154 lb' — use
  your keyboard's mic").
- **Deterministic parser** (`src/services/quickParse.ts`) for the two
  fastest logs:
  - Water: "water 250", "drank 500 ml", "2 glasses of water",
    "1.5 l water", "1 bottle of water" → ml (glass 250 ml, cup 240 ml,
    bottle 500 ml, oz 30 ml). Range-gated 10–5000 ml.
  - Weight: "weight 70 kg", "weigh 154 lb", "70kg", "11 stone" → kg.
    Range-gated 20–400 kg.
  - Anything else → a written hint of recognized patterns; nothing is
    guessed or auto-logged.
- **Preview-then-log**: parsed intent shows as text
  ("Water 500 ml — tap Log it") and only logs on explicit tap. Water
  goes through the serialized store with undo; weight follows the same
  explicit-measurement path as M3 (unchanged value still records via
  `logWeight`).

## Guardrails

- Preview shows the interpreted value in the user's preferred unit
  before logging — mishearings are caught at review, not after write.
- Water undo subtracts exactly the parsed amount.
- No claim of general voice logging: recognized vocabulary is water and
  weight only, and the hint says so.

## Files changed

- `src/services/quickParse.ts` (new), `src/components/QuickAdd.tsx`
  (field + preview + Log it action),
  `src/services/__tests__/quickParse.test.ts` (new).

## Tests

- Mobile: **60 suites / 334 tests** (16 new parser tests); typecheck
  clean; lint 0 errors, 41 warnings (existing).

## Verification limitations / remaining blockers

- Dictation quality is OS-dependent — not testable in Jest; native
  check pending a device build.
- Food and exercise phrases intentionally unparsed — extending the
  vocabulary needs the same review-gated treatment as other uncertain
  entries.

Paused at the requested M13 review point before M14 (final QA).
