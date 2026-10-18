# Product measurement contract — Milestone 6

October 17, 2026. Instrumentation is implemented; collection is **disabled**. There is no installed adapter, analytics SDK, transport, persistent queue, session/user identifier, automatic screen capture or production dashboard. No events are transmitted or replayed. Calling `setAnalyticsAdapter` is reserved for a future consent-aware integration; it must uninstall on withdrawal and account changes. Do not install an adapter silently in a release.

## Schema v1

Only `{name, version: 1}` is emitted, except the two entry-completion events which may include `duration`: `under_30s`, `30_to_120s`, `2_to_5m`, `over_5m`. Runtime validation strips extra properties, rejects unknown names and drops invalid duration values. There are no exact timestamps or free-text fields. Synchronous/asynchronous adapter failures never block a product action and are not logged.

| Event | Confirmed trigger | Interpretation / limits |
| --- | --- | --- |
| onboarding_completed | Profile save resolves | Save completion, not email verification or unique-user count |
| meal_saved | Device meal save resolves | Includes label saves, edits/replays; not unique meals or first-ever log |
| label_capture_started | Camera capture begins after tap guard | Attempt denominator; permission denials before capture are excluded |
| label_text_ready | OCR returns nonblank text while request remains current | Readable text, not validated nutrition |
| label_review_opened | Navigation to portion review | Can be manual; not proof of scan success |
| label_meal_saved | Reviewed label server result and device diary save complete | Once per mounted review; duration covers review time only |
| food_entry_saved | Food-entry device save resolves | Once per mounted entry; includes retry/wait/background time |
| workout_started | Local workout draft persists | Start, not server session creation |
| workout_completed | Finish result and local confirmation persist | Guarded against already-finished drafts; retries after ambiguous persistence can affect counts |
| feedback_composer_opened | Native composer returns | Handoff/cancel/save/send, never proof of delivery or ticket resolution |

Entry time starts at screen mount and is a coarse wall-clock bucket. It is not CPU time or active editing time. Successful local meal saves may still await server sync. These hooks are product observations, not billing, health records or exactly-once business events.

## Success metrics and outstanding prerequisites

- Onboarding completion and feature adoption: event counts can describe observed interactions after collection is enabled. They cannot identify unique people or establish causal improvement.
- First successful food log / first scan: not calculated; requires an approved account lifecycle and deduplication contract. Do not label first-in-session as first-ever.
- Label completion rate: requires an approved attempt-correlation scheme; manual review and repeated scans mean raw event ratios are not a valid conversion funnel.
- Time to log a meal: coarse entry-time distribution is supported; label review excludes camera/OCR time. Compare like flows on comparable releases.
- Workout completion rate: attempt correlation and treatment of resumed sessions across days must be defined before using counts as a rate.
- DAU/WAU and 7/30-day retention: intentionally unavailable without consent, pseudonymous identity and retention/deletion rules. No device-ID tracking fallback.
- Crash-free sessions: use separately configured native crash reporting with reviewed scrubbing and consent/disclosure. No crash provider or session denominator is installed.
- Feedback submission/resolution: requires received support-mail/ticket evidence. Opening a composer must not count as delivered feedback or a resolved issue.

Before enabling collection, choose the provider, legal basis/consent UX, minimal pseudonymous identity if needed, deletion/export coverage, data retention period, access controls, sampling and cost budget. Update the privacy policy and test withdrawal/account switching. No numeric retention period or external data processing is invented in this milestone.
